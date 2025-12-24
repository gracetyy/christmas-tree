import { useState, useRef, useCallback, useEffect } from 'react';
import { ControlMode, ZoomLevel, PhotoData, InteractionMode } from '../types';
import { CAMERA_CONFIG } from '../constants';

interface UseTreeInteractionProps {
    photos: PhotoData[];
    interactionMode: InteractionMode;
    isInstaModalOpen: boolean;
    isRecording: boolean;
}

export const useTreeInteraction = ({ photos, interactionMode, isInstaModalOpen, isRecording }: UseTreeInteractionProps) => {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.FULL_TREE);
    const [focusedPhoto, setFocusedPhoto] = useState<PhotoData | null>(null);
    const panOffset = useRef({ x: 0, y: 0 });

    // Clear focused photo when zooming out
    useEffect(() => {
        if (zoomLevel === ZoomLevel.FULL_TREE) {
            setFocusedPhoto(null);
        }
    }, [zoomLevel]);

    // Hand Gesture Handler
    const handleGesture = useCallback((action: 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN', delta?: { x: number, y: number }) => {
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

    const handlePhotoClick = useCallback((photo: PhotoData) => {
        if (interactionMode === InteractionMode.EDIT) {
            return; // handled elsewhere
        }

        // View Mode: Zoom In to Photo
        setFocusedPhoto(photo);
        setZoomLevel(ZoomLevel.ZOOMED_IN);

        // Sync Pan Offset for Hand Mode consistency
        panOffset.current = {
            x: photo.rotation[1],
            y: photo.position[1] - CAMERA_CONFIG.ZOOM_IN_POS.y
        };
    }, [interactionMode]);

    const handleNextPhoto = useCallback(() => {
        if (!focusedPhoto || photos.length === 0) return;
        const currentIndex = photos.findIndex(p => p.id === focusedPhoto.id);
        const nextIndex = (currentIndex - 1 + photos.length) % photos.length;
        handlePhotoClick(photos[nextIndex]);
    }, [focusedPhoto, photos, handlePhotoClick]);

    const handlePrevPhoto = useCallback(() => {
        if (!focusedPhoto || photos.length === 0) return;
        const currentIndex = photos.findIndex(p => p.id === focusedPhoto.id);
        const prevIndex = (currentIndex + 1) % photos.length;
        handlePhotoClick(photos[prevIndex]);
    }, [focusedPhoto, photos, handlePhotoClick]);

    // Keyboard Navigation
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

    const scrollToTop = () => {
        // Prevent zooming out when interacting with UI logic is in App.tsx handleDoubleClick, 
        // but here we just manage state.
        // This logic was mainly for double click zoom reset
        if (zoomLevel === ZoomLevel.ZOOMED_IN) {
            setZoomLevel(ZoomLevel.FULL_TREE);
        }
    };

    return {
        zoomLevel,
        setZoomLevel,
        focusedPhoto,
        setFocusedPhoto,
        panOffset,
        handleGesture,
        handlePhotoClick,
        handleNextPhoto,
        handlePrevPhoto,
        scrollToTop
    };
};
