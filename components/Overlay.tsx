import React, { useRef } from 'react';
import { ControlMode, ZoomLevel, InteractionMode } from '../types';
import { Mouse, Hand, ImagePlus, Music, VolumeX, Eye, Edit3, Instagram } from 'lucide-react';

interface OverlayProps {
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  onBulkUpload: (files: FileList) => void;
  onOpenInstagram: () => void;
  zoomLevel: ZoomLevel;
  setZoomLevel: (level: ZoomLevel) => void;
  isHandReady: boolean;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ 
  controlMode, 
  setControlMode, 
  interactionMode,
  setInteractionMode,
  onBulkUpload, 
  onOpenInstagram,
  zoomLevel,
  setZoomLevel,
  isHandReady,
  isMusicPlaying,
  toggleMusic
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerBulkUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div className="pointer-events-auto">
          <h1 className="text-3xl font-light text-white tracking-widest uppercase" style={{ textShadow: '0 0 10px #fff1a1' }}>
            Lumière
          </h1>
          <p className="text-white/60 text-sm mt-1">Interactive Memories</p>
        </div>

        <div className="flex flex-col gap-3 items-end">
          <div className="flex gap-3">
             {/* Music Control */}
            <button
               onClick={toggleMusic}
               className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all pointer-events-auto shadow-lg"
               title={isMusicPlaying ? "Pause Music" : "Play Music"}
            >
                {isMusicPlaying ? <Music size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Input Control Toggle */}
            <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 pointer-events-auto border border-white/20">
              <button
                onClick={() => setControlMode(ControlMode.MOUSE)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  controlMode === ControlMode.MOUSE ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                <Mouse size={16} />
                <span className="text-sm font-medium">Mouse</span>
              </button>
              <button
                onClick={() => setControlMode(ControlMode.HAND)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  controlMode === ControlMode.HAND ? 'bg-[#1cbd62] text-white shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                <Hand size={16} />
                <span className="text-sm font-medium">Hand</span>
              </button>
            </div>
          </div>

          {/* Interaction Mode Toggle (View/Edit) */}
          <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 pointer-events-auto border border-white/20">
              <button
                onClick={() => setInteractionMode(InteractionMode.VIEW)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  interactionMode === InteractionMode.VIEW ? 'bg-[#f2e24e] text-black shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                <Eye size={16} />
                <span className="text-sm font-medium">View</span>
              </button>
              <button
                onClick={() => setInteractionMode(InteractionMode.EDIT)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  interactionMode === InteractionMode.EDIT ? 'bg-[#ff421c] text-white shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                <Edit3 size={16} />
                <span className="text-sm font-medium">Edit</span>
              </button>
          </div>
        </div>
      </div>

      {/* Instructions Pane */}
      <div className="absolute top-1/2 right-6 transform -translate-y-1/2 pointer-events-none">
          {controlMode === ControlMode.HAND && (
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border-l-2 border-[#1cbd62] text-white/90 max-w-xs transition-opacity duration-500">
                  <h3 className="font-bold mb-2 text-[#1cbd62]">Gestures</h3>
                  <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Spread fingers: Zoom In</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Pinch fingers: Zoom Out</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Move open hand: Pan view</span>
                      </li>
                  </ul>
                  {!isHandReady && <div className="mt-3 text-xs text-yellow-300 animate-pulse">Waiting for camera...</div>}
              </div>
          )}
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-between items-end pointer-events-auto w-full">
         <div className="flex gap-4">
             {/* Local Upload */}
            <button 
                onClick={triggerBulkUpload}
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-6 py-3 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
                <ImagePlus size={20} className="text-[#f2e24e]" />
                <span>Add Memories</span>
            </button>
            
            {/* Instagram Import */}
            <button 
                onClick={onOpenInstagram}
                className="bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 hover:from-[#833ab4]/40 hover:via-[#fd1d1d]/40 hover:to-[#fcb045]/40 text-white backdrop-blur-md border border-white/20 px-6 py-3 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
                <Instagram size={20} className="text-[#fd1d1d]" />
                <span>Instagram</span>
            </button>

            <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => e.target.files && onBulkUpload(e.target.files)}
            />
         </div>

         {/* Visual Mode Indicator (Debug/Feedback) */}
         <div className="text-white/40 text-xs">
            {zoomLevel === ZoomLevel.FULL_TREE ? 'Full View' : 'Detail View'}
         </div>
      </div>
    </div>
  );
};

export default Overlay;