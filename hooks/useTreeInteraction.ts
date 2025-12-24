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
    const [isExploded, setIsExploded] = useState(false);
    const panOffset = useRef({ x: 0, y: 0 });

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
        // Next = Go forward in array (+1)
        const nextIndex = (currentIndex + 1) % photos.length;
        handlePhotoClick(photos[nextIndex]);
    }, [focusedPhoto, photos, handlePhotoClick]);

    const handlePrevPhoto = useCallback(() => {
        if (!focusedPhoto || photos.length === 0) return;
        const currentIndex = photos.findIndex(p => p.id === focusedPhoto.id);
        // Prev = Go backward in array (-1)
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
        handlePhotoClick(photos[prevIndex]);
    }, [focusedPhoto, photos, handlePhotoClick]);

    // Hand Gesture Handler
    const handleGesture = useCallback((action: 'ZOOM_IN' | 'ZOOM_OUT' | 'NEXT' | 'PREV' | 'PAN' | 'EXPLODE', delta?: { x: number, y: number }) => {
        if (action === 'ZOOM_IN') {
            // If we already have a focused photo, return to it instead of jumping to the first one
            if (focusedPhoto) {
                handlePhotoClick(focusedPhoto);
            } else if (photos.length > 0) {
                handlePhotoClick(photos[0]);
            }
        } else if (action === 'ZOOM_OUT') {
            setZoomLevel(ZoomLevel.FULL_TREE);
        } else if (action === 'NEXT') {
            handleNextPhoto();
        } else if (action === 'PREV') {
            handlePrevPhoto();
        } else if (action === 'EXPLODE') {
            setIsExploded(prev => !prev);
        } else if (action === 'PAN' && delta) {
            // Accumulate pan offset
            panOffset.current.x += delta.x;
            panOffset.current.y += delta.y;
        }
    }, [focusedPhoto, photos, handlePhotoClick, handleNextPhoto, handlePrevPhoto]);

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
        isExploded,
        panOffset,
        handleGesture,
        handlePhotoClick,
        handleNextPhoto,
        handlePrevPhoto,
        scrollToTop
    };
};
