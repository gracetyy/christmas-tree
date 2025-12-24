import { useState, useCallback, useRef, useEffect } from 'react';
import { ControlMode, InteractionMode, ZoomLevel, PhotoData } from '../types';
import { CAMERA_CONFIG } from '../constants';

export const useTreeInteraction = (
    photos: PhotoData[],
    interactionMode: InteractionMode,
    isInstaModalOpen: boolean,
    isRecording: boolean
) => {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.FULL_TREE);
    const [focusedPhoto, setFocusedPhoto] = useState<PhotoData | null>(null);
    const panOffset = useRef({ x: 0, y: 0 });

    // Clear focused photo when zooming out
    useEffect(() => {
        if (zoomLevel === ZoomLevel.FULL_TREE) {
            setFocusedPhoto(null);
        }
    }, [zoomLevel]);

    // Sync focus state with photos list (e.g. if photo deleted)
    useEffect(() => {
        if (focusedPhoto && !photos.find(p => p.id === focusedPhoto.id)) {
            setFocusedPhoto(null);
            setZoomLevel(ZoomLevel.FULL_TREE);
        }
    }, [photos, focusedPhoto]);

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

    return {
        zoomLevel,
        setZoomLevel,
        focusedPhoto,
        panOffset,
        handlePhotoClick,
        handleNextPhoto,
        handlePrevPhoto,
        handleGesture
    };
};
