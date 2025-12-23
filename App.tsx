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

  // Initialize Music & Google API
  useEffect(() => {
    // Attempt auto-play
    if (audioRef.current) {
        audioRef.current.volume = 0.4;
        audioRef.current.play()
            .then(() => setIsMusicPlaying(true))
            .catch((e) => {
                console.log("Autoplay blocked, user interaction required", e);
                setIsMusicPlaying(false);
            });
    }

    // Load Google Drive API
    loadGoogleApi()
      .then(() => setIsGoogleApiReady(true))
      .catch(err => console.log("Google API load status:", err.message));

  }, []);

  // Clear focused photo when zooming out
  useEffect(() => {
    if (zoomLevel === ZoomLevel.FULL_TREE) {
        setFocusedPhoto(null);
    }
  }, [zoomLevel]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
    } else {
        audioRef.current.play();
        setIsMusicPlaying(true);
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

  const handlePhotoClick = (photo: PhotoData) => {
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
                  topXCount: DEFAULT_PHOTOS_COUNT 
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

          // 2. Update Photos
          const newPhotos = [...photos];
          let urlIndex = 0;
          for (let i = 0; i < newPhotos.length && urlIndex < newImageUrls.length; i++) {
              newPhotos[i].url = newImageUrls[urlIndex];
              urlIndex++;
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
    <div className="relative w-full h-full bg-[#050505]">
      <audio 
        ref={audioRef} 
        src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Jingle_Bells_-_Kevin_MacLeod.ogg" 
        loop 
      />
      
      <Scene 
        photos={photos} 
        onUpload={handleSingleUpload} 
        onPhotoClick={handlePhotoClick}
        controlMode={controlMode} 
        interactionMode={interactionMode}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        focusedPhoto={focusedPhoto}
      />
      
      <Overlay 
        controlMode={controlMode} 
        setControlMode={setControlMode} 
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        onBulkUpload={handleBulkUpload}
        onOpenInstagram={() => setIsInstaModalOpen(true)}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isHandReady={isHandReady}
        isMusicPlaying={isMusicPlaying}
        toggleMusic={toggleMusic}
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