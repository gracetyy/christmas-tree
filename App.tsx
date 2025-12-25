import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import Overlay from './components/Overlay';
import HandController from './components/HandController';
import InstagramModal from './components/InstagramModal';
import { generatePhotoPositions } from './utils/math';
import { ControlMode, PhotoData, InteractionMode } from './types';
import { DEFAULT_PHOTOS_COUNT, PLACEHOLDER_TYPES } from './constants';
import { useAudio } from './hooks/useAudio';
import { useRecording } from './hooks/useRecording';
import { useInstagram } from './hooks/useInstagram';
import { useTreeInteraction } from './hooks/useTreeInteraction';
import { useVisitCounter } from './hooks/useVisitCounter';
import { processImageWithPadding } from './utils/image';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

const App: React.FC = () => {
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.MOUSE);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.VIEW);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [isHandReady, setIsHandReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const visitCount = useVisitCounter();

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Custom Hooks
  const { isMusicPlaying, toggleMusic, audioRef } = useAudio();
  const { isRecording, recordingType, handleRecordVideo } = useRecording(photos, (msg) => showToast(msg, 'error'));
  const {
    isInstaModalOpen,
    setIsInstaModalOpen,
    instaLoading,
    instaStatus,
    handleInstagramSubmit
  } = useInstagram({ 
    photos, 
    setPhotos,
    onComplete: (lastPhoto) => {
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(lastPhoto);
    },
    onError: (message) => showToast(message, 'error')
  });

  const {
    zoomLevel,
    setZoomLevel,
    focusedPhoto,
    setFocusedPhoto,
    isExploded,
    panOffset,
    handleGesture,
    handlePhotoClick,
    handleNextPhoto,
    handlePrevPhoto,
    scrollToTop
  } = useTreeInteraction({
    photos,
    interactionMode,
    isInstaModalOpen,
    isRecording
  });

  // Request Camera permissions when switching to hand mode
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (controlMode === ControlMode.HAND) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsHandReady(true);
          }
        })
        .catch((err) => {
          console.error("Camera denied:", err);
          showToast("Please enable camera access for hand gestures.", 'error');
          setControlMode(ControlMode.MOUSE);
        });
    } else {
      // Stop stream if exists
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsHandReady(false);
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [controlMode]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isInstaModalOpen) return;

    // Prevent zooming out when interacting with UI
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    scrollToTop();
  };

  const handleSingleUpload = async (id: string, file: File) => {
    const rawUrl = URL.createObjectURL(file);
    const url = await processImageWithPadding(rawUrl);
    
    // Revoke the raw object URL if we created a new data URL
    if (url !== rawUrl) {
      URL.revokeObjectURL(rawUrl);
    }
    
    const photoToUpdate = photos.find(p => p.id === id);
    if (photoToUpdate) {
      const updatedPhoto = { ...photoToUpdate, url };
      setPhotos(prev => prev.map(p => p.id === id ? updatedPhoto : p));
      
      // Switch to VIEW mode and focus
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(updatedPhoto);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    const newFiles = Array.from(files);

    // Distribute uploaded files into existing slots
    const newPhotos = [...photos];
    
    // Sort indices by Y descending to fill from top to bottom
    const sortedIndices = newPhotos
      .map((p, i) => ({ y: p.position[1], index: i }))
      .sort((a, b) => b.y - a.y)
      .map(item => item.index);

    let fileIndex = 0;
    let lastAddedPhoto: PhotoData | null = null;

    for (const index of sortedIndices) {
      if (fileIndex >= newFiles.length) break;
      
      const rawUrl = URL.createObjectURL(newFiles[fileIndex]);
      const url = await processImageWithPadding(rawUrl);
      
      // Revoke the raw object URL if we created a new data URL
      if (url !== rawUrl) {
        URL.revokeObjectURL(rawUrl);
      }
      
      newPhotos[index] = { ...newPhotos[index], url };
      
      lastAddedPhoto = newPhotos[index];
      fileIndex++;
    }
    
    setPhotos(newPhotos);
    
    if (lastAddedPhoto) {
      // Switch to VIEW mode and focus
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(lastAddedPhoto);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (focusedPhoto?.id === id) {
      setFocusedPhoto(null);
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
        isExploded={isExploded}
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
        isExploded={isExploded}
        visitCount={visitCount}
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
        zoomLevel={zoomLevel}
        isExploded={isExploded}
        onGesture={handleGesture}
        videoRef={videoRef}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`min-w-[300px] max-w-md p-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            toast.type === 'error' 
              ? 'bg-red-950/40 border-red-500/30 text-red-100' 
              : 'bg-green-950/40 border-green-500/30 text-green-100'
          } flex items-start gap-4 relative overflow-hidden group`}>
            {/* Progress bar background */}
            <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full" />
            {/* Animated progress bar */}
            <div className={`absolute bottom-0 left-0 h-1 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} animate-[shrink_5s_linear_forwards]`} />
            
            <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>
            
            <div className="flex-1 pt-0.5">
              <h4 className="text-sm font-bold tracking-tight mb-1">
                {toast.type === 'error' ? 'Something went wrong' : 'Success!'}
              </h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>

            <button 
              onClick={() => setToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
};

export default App;