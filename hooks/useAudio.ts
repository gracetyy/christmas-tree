import { useState, useEffect, useRef } from 'react';

export const useAudio = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = 0.8;

        const attemptPlay = async () => {
            try {
                await audio.play();
                console.log("Audio started successfully");
                setIsMusicPlaying(true);
                removeListeners();
            } catch (err) {
                console.log("Playback blocked, waiting for interaction");
            }
        };

        const removeListeners = () => {
            window.removeEventListener('pointerdown', attemptPlay);
            window.removeEventListener('keydown', attemptPlay);
        };

        // Listen for any interaction on the window
        window.addEventListener('pointerdown', attemptPlay);
        window.addEventListener('keydown', attemptPlay);

        // Also try immediately (might work if already interacted)
        attemptPlay();

        return removeListeners;
    }, []);

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

    return {
        audioRef,
        isMusicPlaying,
        toggleMusic
    };
};
