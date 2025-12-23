import React, { useRef, useState } from 'react';
import { ControlMode, ZoomLevel, InteractionMode } from '../types';
import { Mouse, Hand, ImagePlus, Music, VolumeX, Eye, EyeOff, Edit3, Instagram, Download, Maximize } from 'lucide-react';

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

  const handleDownload = () => {
    const overlay = document.getElementById('overlay-container');
    if (overlay) overlay.style.display = 'none';

    setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            if (ctx) {
                // 1. Fill Black Background
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                // 2. Draw WebGL Canvas
                ctx.drawImage(canvas, 0, 0);
                
                // 3. Draw Title
                const fontSize = Math.max(60, canvas.width / 25); 
                ctx.font = `${fontSize}px "Great Vibes", cursive`;
                ctx.fillStyle = '#fff1a1';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.shadowColor = 'rgba(255, 241, 161, 0.5)';
                ctx.shadowBlur = 20;
                
                ctx.fillText("Merry Christmas!", tempCanvas.width / 2, canvas.height * 0.05);

                const link = document.createElement('a');
                link.download = 'merry-christmas-tree.png';
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
            }
        }
        if (overlay) overlay.style.display = 'flex';
    }, 100);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [showUI, setShowUI] = useState(true);

  return (
    <div id="overlay-container" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 overflow-hidden">
      
      {/* Top Header - Just the Title */}
      <div className="flex justify-center items-start w-full relative pt-4">
        <div className="pointer-events-auto text-center whitespace-nowrap">
          <h1 className="text-6xl text-[#fff1a1]" style={{ fontFamily: "'Great Vibes', cursive", textShadow: '0 0 20px rgba(255, 241, 161, 0.5)' }}>
            Merry Christmas!
          </h1>
        </div>
      </div>

      {/* Instructions Pane - Stays on the right side */}
      <div className="absolute top-1/2 right-6 transform -translate-y-1/2 pointer-events-none">
          {showUI && controlMode === ControlMode.HAND && (
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

      {/* Bottom Controls - Unified at the bottom */}
      <div className="flex flex-col items-center gap-4 w-full mb-2 pointer-events-auto">
        {!showUI ? (
          /* Small Toggle to bring back UI */
          <button 
            onClick={() => setShowUI(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-2xl"
            title="Show Controls"
          >
            <Eye size={24} />
          </button>
        ) : (
          /* Main Control Panel */
          <div className="flex flex-col items-center gap-3">
            
            {/* Top Row: System & View Settings */}
            <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-2xl items-center gap-2">
              {/* Music Control */}
              <button
                onClick={toggleMusic}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-all"
                title={isMusicPlaying ? "Pause Music" : "Play Music"}
              >
                  {isMusicPlaying ? <Music size={18} /> : <VolumeX size={18} />}
              </button>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              {/* Input Control Toggle */}
              <div className="flex bg-white/5 rounded-full p-0.5">
                <button
                  onClick={() => setControlMode(ControlMode.MOUSE)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
                    controlMode === ControlMode.MOUSE ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Mouse size={14} />
                  <span className="text-xs font-medium">Mouse</span>
                </button>
                <button
                  onClick={() => setControlMode(ControlMode.HAND)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
                    controlMode === ControlMode.HAND ? 'bg-[#1cbd62] text-white shadow-lg' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Hand size={14} />
                  <span className="text-xs font-medium">Hand</span>
                </button>
              </div>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              {/* Interaction Mode Toggle */}
              <div className="flex bg-white/5 rounded-full p-0.5">
                <button
                  onClick={() => setInteractionMode(InteractionMode.VIEW)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
                    interactionMode === InteractionMode.VIEW ? 'bg-[#f2e24e] text-black shadow-lg' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Eye size={14} />
                  <span className="text-xs font-medium">View</span>
                </button>
                <button
                  onClick={() => setInteractionMode(InteractionMode.EDIT)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
                    interactionMode === InteractionMode.EDIT ? 'bg-[#ff421c] text-white shadow-lg' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Edit3 size={14} />
                  <span className="text-xs font-medium">Edit</span>
                </button>
              </div>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              {/* Window Controls */}
              <div className="flex gap-1">
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-all"
                  title="Toggle Fullscreen"
                >
                    <Maximize size={18} />
                </button>
                <button
                  onClick={() => setShowUI(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-all"
                  title="Hide Buttons"
                >
                    <EyeOff size={18} />
                </button>
              </div>
            </div>

            {/* Bottom Row: Content Actions */}
            <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-2xl items-center gap-1">
              
              {zoomLevel === ZoomLevel.ZOOMED_IN && (
                  <>
                    <button
                      onClick={() => setZoomLevel(ZoomLevel.FULL_TREE)}
                      className="flex items-center gap-2 px-5 py-2 rounded-full transition-all text-white hover:bg-white/10 whitespace-nowrap"
                    >
                      <span className="text-sm font-medium text-[#fff1a1]">Back to Tree</span>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                  </>
              )}

              {/* Local Upload */}
              <button 
                  onClick={triggerBulkUpload}
                  className="flex items-center gap-2 px-5 py-2 rounded-full transition-all text-white hover:bg-white/10"
              >
                  <ImagePlus size={18} className="text-[#f2e24e]" />
                  <span className="text-sm font-medium whitespace-nowrap text-white/90">Add Photos</span>
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-1"></div>

              {/* Instagram Import */}
              <button 
                  onClick={onOpenInstagram}
                  className="flex items-center gap-2 px-5 py-2 rounded-full transition-all text-white hover:bg-white/10"
              >
                  <Instagram size={18} className="text-[#fd1d1d]" />
                  <span className="text-sm font-medium whitespace-nowrap text-white/90">Import from Instagram</span>
              </button>

              <div className="w-px h-6 bg-white/10 mx-1"></div>

              {/* Download Button */}
              <button 
                  onClick={handleDownload}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all text-white hover:bg-white/10"
                  title="Download Tree Photo"
              >
                  <Download size={18} className="text-[#1cbd62]" />
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Overlay;