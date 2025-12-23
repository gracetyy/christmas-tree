import React, { useRef, useState } from 'react';
import { ControlMode, ZoomLevel, InteractionMode } from '../types';
import { Mouse, Hand, ImagePlus, Music, VolumeX, Eye, EyeOff, Edit3, Instagram, Download, Maximize, Move, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Github, Video } from 'lucide-react';

interface OverlayProps {
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  onBulkUpload: (files: FileList) => void;
  onOpenInstagram: () => void;
  onNext: () => void;
  onPrev: () => void;
  zoomLevel: ZoomLevel;
  setZoomLevel: (level: ZoomLevel) => void;
  isHandReady: boolean;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  userName: string;
  setUserName: (name: string) => void;
  isNameSet: boolean;
  setIsNameSet: (set: boolean) => void;
  onRecordVideo: (type: 'FULL' | 'ALBUM') => void;
  isRecording: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ 
  controlMode, 
  setControlMode, 
  interactionMode,
  setInteractionMode,
  onBulkUpload, 
  onOpenInstagram,
  onNext,
  onPrev,
  zoomLevel,
  setZoomLevel,
  isHandReady,
  isMusicPlaying,
  toggleMusic,
  userName,
  setUserName,
  isNameSet,
  setIsNameSet,
  onRecordVideo,
  isRecording
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
                
                ctx.fillText(`Merry Christmas${userName ? ` ${userName}` : ''}!`, tempCanvas.width / 2, canvas.height * 0.05);

                const link = document.createElement('a');
                link.download = `merry-christmas-${userName || 'tree'}.png`;
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

  if (isRecording) return null;

  return (
    <div id="overlay-container" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 overflow-hidden">
      
      {/* Top Header - Just the Title */}
      <div className="flex flex-col justify-center items-center w-full relative pt-4 md:pt-8 px-4">
        <div className="pointer-events-auto text-center">
          <h1 className="text-4xl md:text-6xl text-[#fff1a1] leading-tight" style={{ fontFamily: "'Great Vibes', cursive", textShadow: '0 0 20px rgba(255, 241, 161, 0.5)' }}>
            Merry Christmas{userName ? ` ${userName}` : ''}!
          </h1>
        </div>

        {!isNameSet && showUI && (
          <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-700">
            <p className="text-[#fff1a1]/60 text-[10px] uppercase tracking-[0.2em] font-bold">What's your name?</p>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 shadow-lg group focus-within:border-white/30 transition-all">
              <input 
                type="text"
                placeholder="Enter your name..."
                className="bg-transparent text-white text-sm outline-none w-32 placeholder:text-white/20"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userName.trim()) {
                    setIsNameSet(true);
                  }
                }}
              />
              <button 
                onClick={() => userName.trim() && setIsNameSet(true)}
                className="text-[#fff1a1] hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Pane - Responsive positioning */}
      <div className="absolute top-1/4 right-4 md:top-1/2 md:right-8 transform md:-translate-y-1/2 pointer-events-none transition-all duration-500 z-20">
          {showUI && controlMode === ControlMode.HAND && (
              <div className="bg-white/5 backdrop-blur-3xl p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 text-white/90 w-48 md:w-64 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col gap-3 md:gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2 bg-[#1cbd62]/20 rounded-full">
                        <Hand size={20} className="text-[#1cbd62]" />
                      </div>
                      <h3 className="font-semibold tracking-wide uppercase text-xs">Hand Controls</h3>
                  </div>
                  
                  <ul className="space-y-4">
                      <li className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                          <ZoomIn size={18} className="text-white/70" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Spread</span>
                          <span className="text-sm font-medium">Zoom In</span>
                        </div>
                      </li>
                      
                      <li className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                          <ZoomOut size={18} className="text-white/70" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Pinch</span>
                          <span className="text-sm font-medium">Zoom Out</span>
                        </div>
                      </li>
                      
                      <li className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                          <Move size={18} className="text-white/70" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Move</span>
                          <span className="text-sm font-medium">Pan View</span>
                        </div>
                      </li>
                  </ul>

                  {!isHandReady && (
                    <div className="mt-2 py-2 px-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-[9px] text-center font-bold animate-pulse uppercase tracking-widest">
                      Waiting for camera...
                    </div>
                  )}
              </div>
          )}
      </div>

      {/* Bottom Controls - Unified at the bottom */}
      <div className="flex flex-col items-center gap-3 md:gap-4 w-full mb-4 md:mb-6 pointer-events-auto px-4">
        {!showUI ? (
          /* Small Toggle to bring back UI */
          <button 
            onClick={() => setShowUI(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-2xl mb-4"
            title="Show Controls"
          >
            <Eye size={24} />
          </button>
        ) : (
          /* Main Control Panel */
          <div className="flex flex-col items-center gap-3 w-full max-w-full overflow-x-hidden">
            
            {/* Top Row: System & View Settings - Flexible layout */}
            <div className="flex flex-wrap justify-center bg-white/10 backdrop-blur-md rounded-2xl md:rounded-full p-1 border border-white/20 shadow-2xl items-center gap-1 md:gap-2">
             {/* Music Control */}
            <button
               onClick={toggleMusic}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-white hover:bg-white/10 transition-all"
               title={isMusicPlaying ? "Pause Music" : "Play Music"}
            >
                {isMusicPlaying ? <Music size={16} /> : <VolumeX size={16} />}
            </button>

              <div className="hidden md:block w-px h-4 bg-white/10 mx-1"></div>

            {/* Input Control Toggle */}
              <div className="flex bg-white/5 rounded-full p-0.5 scale-90 md:scale-100">
              <button
                onClick={() => setControlMode(ControlMode.MOUSE)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-all ${
                  controlMode === ControlMode.MOUSE ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                  <Mouse size={14} />
                  <span className="text-[10px] md:text-xs font-medium">Mouse</span>
              </button>
              <button
                onClick={() => setControlMode(ControlMode.HAND)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-all ${
                  controlMode === ControlMode.HAND ? 'bg-[#1cbd62] text-white shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                  <Hand size={14} />
                  <span className="text-[10px] md:text-xs font-medium">Hand</span>
              </button>
            </div>

              <div className="hidden md:block w-px h-4 bg-white/10 mx-1"></div>

              {/* Interaction Mode Toggle */}
              <div className="flex bg-white/5 rounded-full p-0.5 scale-90 md:scale-100">
              <button
                onClick={() => setInteractionMode(InteractionMode.VIEW)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-all ${
                  interactionMode === InteractionMode.VIEW ? 'bg-[#f2e24e] text-black shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                  <Eye size={14} />
                  <span className="text-[10px] md:text-xs font-medium">View</span>
              </button>
              <button
                onClick={() => setInteractionMode(InteractionMode.EDIT)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-all ${
                  interactionMode === InteractionMode.EDIT ? 'bg-[#ff421c] text-white shadow-lg' : 'text-white hover:bg-white/10'
                }`}
              >
                  <Edit3 size={14} />
                  <span className="text-[10px] md:text-xs font-medium">Edit</span>
              </button>
          </div>

              <div className="hidden md:block w-px h-4 bg-white/10 mx-1"></div>

              {/* Window Controls */}
              <div className="flex gap-0.5 md:gap-1">
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-white hover:bg-white/10 transition-all"
                  title="Toggle Fullscreen"
                >
                    <Maximize size={16} />
                </button>
                <button
                  onClick={() => setShowUI(false)}
                  className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-white hover:bg-white/10 transition-all"
                  title="Hide Buttons"
                >
                    <EyeOff size={16} />
                </button>
              </div>
      </div>

            {/* Bottom Row: Content Actions - Wrapping for mobile */}
            <div className="flex flex-wrap justify-center bg-white/10 backdrop-blur-md rounded-2xl md:rounded-full p-1 border border-white/20 shadow-2xl items-center gap-1 w-full max-w-fit">
              
              {zoomLevel === ZoomLevel.ZOOMED_IN && (
                  <div className="flex items-center gap-1 border-r border-white/10 pr-1 mr-1">
                    <button
                      onClick={onPrev}
                      className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-white hover:bg-white/10 transition-all"
                      title="Previous Photo"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={() => setZoomLevel(ZoomLevel.FULL_TREE)}
                      className="flex items-center px-3 md:px-5 py-2 rounded-full transition-all text-white hover:bg-white/10 whitespace-nowrap"
                    >
                      <span className="text-[10px] md:text-sm font-medium text-[#fff1a1]">Back to Tree</span>
                    </button>

                    <button
                      onClick={onNext}
                      className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-white hover:bg-white/10 transition-all"
                      title="Next Photo"
                    >
                        <ChevronRight size={18} />
                    </button>
                  </div>
              )}

             {/* Local Upload */}
            <button 
                onClick={triggerBulkUpload}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full transition-all text-white hover:bg-white/10"
            >
                  <ImagePlus size={16} className="text-[#f2e24e]" />
                  <span className="text-[10px] md:text-sm font-medium whitespace-nowrap text-white/90">Add Photos</span>
            </button>
              
              <div className="w-px h-6 bg-white/10 mx-0.5"></div>
            
            {/* Instagram Import */}
            <button 
                onClick={onOpenInstagram}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full transition-all text-white hover:bg-white/10"
              >
                  <Instagram size={16} className="text-[#fd1d1d]" />
                  <span className="text-[10px] md:text-sm font-medium whitespace-nowrap text-white/90">Instagram</span>
              </button>

              <div className="w-px h-6 bg-white/10 mx-0.5"></div>

              {/* Video Download Dropdown */}
              <div className="relative group">
                <button 
                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full transition-all text-white bg-white/5 hover:bg-white/10 ${isRecording ? 'animate-pulse bg-red-500/20' : ''}`}
                    title="Download Video"
                >
                    <Video size={16} className={`${isRecording ? 'text-red-500' : 'text-[#3b82f6]'}`} />
                    <span className="text-[10px] md:text-sm font-medium whitespace-nowrap text-white/90">
                      {isRecording ? 'Rec...' : 'Video'}
                    </span>
                </button>
                
                {/* Dropdown Menu */}
                {!isRecording && (
                  <div className="absolute bottom-full left-0 mb-2 w-40 md:w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                    <button 
                      onClick={() => onRecordVideo('FULL')}
                      className="w-full text-left px-4 py-3 text-[10px] md:text-xs font-medium text-white hover:bg-white/10 transition-colors border-b border-white/5"
                    >
                      360° Rotation
                    </button>
                    <button 
                      onClick={() => onRecordVideo('ALBUM')}
                      className="w-full text-left px-4 py-3 text-[10px] md:text-xs font-medium text-white hover:bg-white/10 transition-colors"
                    >
                      Cinematic Tour
                    </button>
                  </div>
                )}
              </div>

            <div className="w-px h-6 bg-white/10 mx-0.5"></div>

              {/* Download Button */}
              <button 
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full transition-all text-white hover:bg-white/10"
                  title="Download Tree Screenshot"
              >
                  <Download size={16} className="text-[#1cbd62]" />
                  <span className="text-[10px] md:text-sm font-medium whitespace-nowrap text-white/90">Image</span>
            </button>

            <div className="w-px h-6 bg-white/10 mx-0.5"></div>

            {/* GitHub Star Button */}
            <button
              onClick={() => window.open('https://github.com/gracetyy/christmas-tree', '_blank')}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full text-[#f2e24e] hover:bg-white/10 transition-all"
              title="Star our repo!"
            >
                <Github size={16} />
                <span className="text-[10px] md:text-sm font-medium whitespace-nowrap text-white/90">Star Repo</span>
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