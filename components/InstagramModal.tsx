import React, { useState } from 'react';
import { X, Instagram, Loader2 } from 'lucide-react';

interface InstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string) => void;
  isLoading: boolean;
  statusMessage: string;
}

const InstagramModal: React.FC<InstagramModalProps> = ({ isOpen, onClose, onSubmit, isLoading, statusMessage }) => {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1cbd62]/50 rounded-2xl shadow-[0_0_30px_rgba(28,189,98,0.2)] overflow-hidden">
        {/* Decorative Top Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#1cbd62] via-[#f2e24e] to-[#ff421c]" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 md:p-3 bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] rounded-xl shadow-lg">
                <Instagram className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-light text-white">Import Memories</h2>
                <p className="text-white/40 text-xs md:text-sm">Create a festive tree from Instagram</p>
            </div>
          </div>

          {!isLoading ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#fff1a1] uppercase tracking-wider">
                  Instagram Username
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                      placeholder="zuck"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-[#1cbd62] focus:ring-1 focus:ring-[#1cbd62] transition-all"
                      autoFocus
                    />
                </div>
              </div>

              <button
                type="submit"
                disabled={!username}
                className="w-full bg-[#1cbd62] hover:bg-[#1faa6a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(28,189,98,0.3)] hover:shadow-[0_0_30px_rgba(28,189,98,0.5)] active:scale-[0.98]"
              >
                Generate Christmas Tree
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-md bg-[#1cbd62]/50 animate-pulse" />
                  <Loader2 className="relative text-[#1cbd62] animate-spin" size={48} />
              </div>
              <p className="text-white text-center font-light animate-pulse">{statusMessage}</p>
              <p className="text-white/30 text-xs text-center max-w-[80%]">
                Our elves are wrapping your photos... this might take a minute.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramModal;
