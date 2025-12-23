import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import Overlay from './components/Overlay';
import HandController from './components/HandController';
import InstagramModal from './components/InstagramModal';
import { generatePhotoPositions } from './utils/math';
import { loadGoogleApi, handleGoogleLogin, openDrivePicker, listImagesInFolder } from './utils/googleDrive';
import { ControlMode, ZoomLevel, PhotoData, InteractionMode } from './types';
import { DEFAULT_PHOTOS_COUNT, PLACEHOLDER_TYPES, GOOGLE_CONFIG, INSTAGRAM_WEBHOOK_URL, CAMERA_CONFIG } from './constants';

const App: React.FC = () => {
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.MOUSE);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.VIEW);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.FULL_TREE);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [focusedPhoto, setFocusedPhoto] = useState<PhotoData | null>(null);
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'FULL' | 'ALBUM' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const panOffset = useRef({ x: 0, y: 0 });
  
  const [isHandReady, setIsHandReady] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isGoogleApiReady, setIsGoogleApiReady] = useState(false);

  // Instagram State
  const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);
  const [instaLoading, setInstaLoading] = useState(false);
  const [instaStatus, setInstaStatus] = useState('');

  // Initialize Photos
  useEffect(() => {
    const positions = generatePhotoPositions(DEFAULT_PHOTOS_COUNT);
    const initialPhotos: PhotoData[] = positions.map((pos, index) => {
      // Rotate through placeholder types
      const types = Object.values(PLACEHOLDER_TYPES);
      const type = types[index % types.length];
      
      return {
        id: `photo-${index}`,
        url: '', // Empty means use placeholder
        placeholderType: type,
        position: pos.position,
        rotation: pos.rotation
      };
    });
    setPhotos(initialPhotos);
  }, []);

  // Robust Audio Autoplay Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.8;
    
    // Explicitly set source and load
    audio.src = "/assets/music/christmas-song.mp3";
    audio.load();

    const attemptPlay = (e?: Event) => {
      // If clicking the music toggle button, let toggleMusic handle it
      if (e) {
        const target = e.target as HTMLElement;
        if (target.closest('button[title*="Music"]')) return;
      }

      // Try to play
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Audio started successfully");
            setIsMusicPlaying(true);
            removeListeners();
          })
          .catch(err => {
            console.log("Playback failed, still waiting for user interaction", err);
          });
      }
    };

    const removeListeners = () => {
      window.removeEventListener('click', attemptPlay, true);
      window.removeEventListener('touchstart', attemptPlay, true);
      window.removeEventListener('mousedown', attemptPlay, true);
      window.removeEventListener('keydown', attemptPlay, true);
    };

    // 1. Immediate attempt
    attemptPlay();

    // 2. Interaction listeners (using capture phase to be sure)
    window.addEventListener('click', attemptPlay, true);
    window.addEventListener('touchstart', attemptPlay, true);
    window.addEventListener('mousedown', attemptPlay, true);
    window.addEventListener('keydown', attemptPlay, true);

    return removeListeners;
  }, []);

  // Clear focused photo when zooming out
  useEffect(() => {
    if (zoomLevel === ZoomLevel.FULL_TREE) {
        setFocusedPhoto(null);
    }
  }, [zoomLevel]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
    } else {
        audioRef.current.play()
            .then(() => setIsMusicPlaying(true))
            .catch(err => console.error("Toggle play failed:", err));
    }
  };

  // Request Camera permissions when switching to hand mode
  useEffect(() => {
    if (controlMode === ControlMode.HAND) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsHandReady(true);
          }
        })
        .catch((err) => {
          console.error("Camera denied:", err);
          alert("Please enable camera access for hand gestures.");
          setControlMode(ControlMode.MOUSE);
        });
    } else {
        // Stop stream if exists
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
            setIsHandReady(false);
        }
    }
  }, [controlMode]);

  // Hand Gesture Handler
  const handleGesture = useCallback((action: 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN', delta?: {x: number, y: number}) => {
    if (action === 'ZOOM_IN') {
        setZoomLevel(ZoomLevel.ZOOMED_IN);
    } else if (action === 'ZOOM_OUT') {
        setZoomLevel(ZoomLevel.FULL_TREE);
    } else if (action === 'PAN' && delta) {
        // Accumulate pan offset
        panOffset.current.x += delta.x;
        panOffset.current.y += delta.y;
    }
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isInstaModalOpen) return;

    // Prevent zooming out when interacting with UI
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
        return;
    }

    if (zoomLevel === ZoomLevel.ZOOMED_IN) {
        setZoomLevel(ZoomLevel.FULL_TREE);
    }
  };

  const handleRecordVideo = (type: 'FULL' | 'ALBUM') => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordingType(type);
    
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        setIsRecording(false);
        return;
    }

    // Determine the best supported MIME type
    const formats = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
    ];
    
    const supportedMimeType = formats.find(f => MediaRecorder.isTypeSupported(f)) || 'video/webm';
    const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';

    console.log(`Starting recording with MIME type: ${supportedMimeType}`);

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 5000000 // 5Mbps
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: supportedMimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `christmas-tree-${type.toLowerCase()}.${extension}`;
        link.click();
        setIsRecording(false);
        setRecordingType(null);
    };

    // Duration logic
    const duration = type === 'FULL' ? 10000 : photos.length * 2500; // 10s for full, 2.5s per photo
    
    mediaRecorder.start();
    setTimeout(() => {
        mediaRecorder.stop();
    }, duration);
  };

  const handleSingleUpload = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, url } : p));
  };

  const handleBulkUpload = (files: FileList) => {
    const newFiles = Array.from(files);
    
    // Distribute uploaded files into existing slots
    const newPhotos = [...photos];
    let fileIndex = 0;
    
    for (let i = 0; i < newPhotos.length && fileIndex < newFiles.length; i++) {
        // Find empty or filled, overwrite from start
        newPhotos[i].url = URL.createObjectURL(newFiles[fileIndex]);
        fileIndex++;
    }
    setPhotos(newPhotos);
  };

  const handlePhotoClick = useCallback((photo: PhotoData) => {
    if (interactionMode === InteractionMode.EDIT) {
        // handled in Polaroid component for file upload
        return; 
    }
    
    // View Mode: Zoom In to Photo
    setFocusedPhoto(photo);
    setZoomLevel(ZoomLevel.ZOOMED_IN);
    
    // Sync Pan Offset for Hand Mode consistency
    // panOffset.x corresponds to angle, panOffset.y corresponds to height offset
    panOffset.current = {
        x: photo.rotation[1], 
        y: photo.position[1] - CAMERA_CONFIG.ZOOM_IN_POS.y
    };
  }, [interactionMode]);

  const handleNextPhoto = useCallback(() => {
    if (!focusedPhoto || photos.length === 0) return;
    const currentIndex = photos.findIndex(p => p.id === focusedPhoto.id);
    // Visual "Next" (Right) should go to the previous index in our CCW spiral
    const nextIndex = (currentIndex - 1 + photos.length) % photos.length;
    handlePhotoClick(photos[nextIndex]);
  }, [focusedPhoto, photos, handlePhotoClick]);

  const handlePrevPhoto = useCallback(() => {
    if (!focusedPhoto || photos.length === 0) return;
    const currentIndex = photos.findIndex(p => p.id === focusedPhoto.id);
    // Visual "Prev" (Left) should go to the next index in our CCW spiral
    const prevIndex = (currentIndex + 1) % photos.length;
    handlePhotoClick(photos[prevIndex]);
  }, [focusedPhoto, photos, handlePhotoClick]);

  // Keyboard Navigation for Album Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomLevel !== ZoomLevel.ZOOMED_IN || isInstaModalOpen || isRecording) return;
      
      if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'Escape') {
        setZoomLevel(ZoomLevel.FULL_TREE);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, isInstaModalOpen, isRecording, handleNextPhoto, handlePrevPhoto]);

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (focusedPhoto?.id === id) {
        setFocusedPhoto(null);
        setZoomLevel(ZoomLevel.FULL_TREE);
    }
  };

  const handleInstagramSubmit = async (username: string) => {
      setInstaLoading(true);
      setInstaStatus('Scraping Instagram Profile...');
      
      try {
          // 1. Call Webhook to Scrape & Process
          const response = await fetch(INSTAGRAM_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  instagramUsername: username,
                  topXCount: photos.length 
              })
          });

          const json = await response.json();
          
          if (json.success === false) {
               throw new Error(json.error || "Failed to process Instagram photos");
          }

          setInstaStatus('Processing Christmas Transformations...');
          
          // Parse new API format based on spec:
          // { success: true, data: { photos: [{ base64Data: "...", mimeType: "..." }, ...] } }
          const outputData = json.data;

          if (!outputData || !Array.isArray(outputData.photos)) {
              console.warn("Unexpected API Response structure:", json);
              throw new Error("API response did not contain a valid photos array.");
          }

          const receivedPhotos = outputData.photos;

          if (receivedPhotos.length === 0) {
              throw new Error(outputData.message || "No photos found for this user.");
          }

          setInstaStatus(`Hanging ${receivedPhotos.length} photos on the tree...`);

          // Convert to Data URIs
          const newImageUrls = receivedPhotos.map((p: any) => {
              if (p.base64Data && p.mimeType) {
                  return `data:${p.mimeType};base64,${p.base64Data}`;
              }
              return null;
          }).filter((u: string | null): u is string => !!u);

          if (newImageUrls.length === 0) {
             throw new Error("Failed to construct valid image data from response.");
          }

          // 2. Update Photos - Fill all available slots by looping through received images
          const newPhotos = [...photos];
          for (let i = 0; i < newPhotos.length; i++) {
              // Loop through the received images to fill all slots
              newPhotos[i].url = newImageUrls[i % newImageUrls.length];
          }
          setPhotos(newPhotos);
          setIsInstaModalOpen(false);

      } catch (error: any) {
          console.error(error);
          alert(`Error: ${error.message}`);
      } finally {
          setInstaLoading(false);
          setInstaStatus('');
      }
  };

  return (
    <div 
      className="relative w-full h-full bg-[#050505]"
      onDoubleClick={handleDoubleClick}
    >
      <audio 
        ref={audioRef} 
        src="/assets/music/christmas-song.mp3" 
        loop 
        preload="auto"
      />
      
      <Scene 
        photos={photos} 
        onUpload={handleSingleUpload} 
        onPhotoClick={handlePhotoClick}
        onDelete={handleDeletePhoto}
        controlMode={controlMode}  
        interactionMode={interactionMode}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        focusedPhoto={focusedPhoto}
        isRecording={isRecording}
        recordingType={recordingType}
        userName={userName}
      />
      
      <Overlay 
        controlMode={controlMode} 
        setControlMode={setControlMode} 
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        onBulkUpload={handleBulkUpload}
        onOpenInstagram={() => setIsInstaModalOpen(true)}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isHandReady={isHandReady}
        isMusicPlaying={isMusicPlaying}
        toggleMusic={toggleMusic}
        userName={userName}
        setUserName={setUserName}
        isNameSet={isNameSet}
        setIsNameSet={setIsNameSet}
        onRecordVideo={handleRecordVideo}
        isRecording={isRecording}
      />

      <InstagramModal 
        isOpen={isInstaModalOpen}
        onClose={() => setIsInstaModalOpen(false)}
        onSubmit={handleInstagramSubmit}
        isLoading={instaLoading}
        statusMessage={instaStatus}
      />
      
      <HandController 
        mode={controlMode} 
        onGesture={handleGesture}
        videoRef={videoRef}
      />
    </div>
  );
};

export default App;