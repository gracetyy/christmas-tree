import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_CONFIG, GESTURE_THRESHOLDS } from '../constants';
import { PhotoData, ControlMode, ZoomLevel } from '../types';

interface CameraControllerProps {
    zoomLevel: ZoomLevel;
    controlMode: ControlMode;
    panOffset: React.MutableRefObject<{ x: number, y: number }>;
    focusedPhoto: PhotoData | null;
    isRecording: boolean;
    recordingType: 'FULL' | 'ALBUM' | null;
    photos: PhotoData[];
}

const CameraController: React.FC<CameraControllerProps> = ({
    zoomLevel,
    controlMode,
    panOffset,
    focusedPhoto,
    isRecording,
    recordingType,
    photos
}) => {
    const { camera, controls } = useThree();
    const targetPos = useRef(CAMERA_CONFIG.DEFAULT_POS.clone());
    const lookAtTarget = useRef(CAMERA_CONFIG.LOOK_AT_OFFSET.clone());
    const isAnimating = useRef(false);
    const recordingStartTime = useRef(0);

    // Ensure camera starts centered on the tree
    useEffect(() => {
        camera.position.copy(CAMERA_CONFIG.DEFAULT_POS);
        camera.lookAt(CAMERA_CONFIG.LOOK_AT_OFFSET);
        if (controls) {
            const orbitControls = controls as any;
            orbitControls.target.copy(CAMERA_CONFIG.LOOK_AT_OFFSET);
            orbitControls.update();
        }
    }, [camera, controls]);

    useEffect(() => {
        // Reset panning when switching modes or zoom levels
        if (controlMode === ControlMode.HAND && zoomLevel === ZoomLevel.FULL_TREE) {
            targetPos.current.copy(CAMERA_CONFIG.DEFAULT_POS);
            panOffset.current = { x: 0, y: 0 };
        }

        // Start animation for Mouse Mode transitions (Zoom In or Out)
        if (controlMode === ControlMode.MOUSE) {
            isAnimating.current = true;
        }

        if (isRecording) {
            recordingStartTime.current = performance.now();
        }
    }, [zoomLevel, controlMode, focusedPhoto, isRecording]);

    useFrame((state, delta) => {
        // 0. RECORDING LOGIC
        if (isRecording) {
            const time = (performance.now() - recordingStartTime.current) / 1000;

            if (recordingType === 'FULL') {
                // Full Tree Rotation
                const angle = time * (Math.PI * 2 / 10); // 360 degrees in 10s
                const radius = 40;
                camera.position.set(Math.sin(angle) * radius, 15, Math.cos(angle) * radius);
                camera.lookAt(0, 5, 0);
                if (controls) (controls as any).update();
                return;
            } else if (recordingType === 'ALBUM' && photos.length > 0) {
                // Album Mode - Cycle through photos
                const photoInterval = 2.5; // 2.5s per photo
                const index = Math.min(Math.floor(time / photoInterval), photos.length - 1);
                const photo = photos[index];

                const orbitControls = controls as any;
                if (orbitControls) {
                    const photoPos = new THREE.Vector3(...photo.position);
                    orbitControls.target.lerp(photoPos, 8 * delta);

                    const dist = 6;
                    const angle = photo.rotation[1];
                    const camX = photoPos.x + Math.sin(angle) * dist;
                    const camZ = photoPos.z + Math.cos(angle) * dist;
                    const camY = photoPos.y;

                    const idealPos = new THREE.Vector3(camX, camY, camZ);
                    camera.position.lerp(idealPos, 8 * delta);
                    orbitControls.update();
                }
                return;
            }
        }

        // 1. HAND CONTROL LOGIC (Gestures)
        if (controlMode === ControlMode.HAND) {
            if (zoomLevel === ZoomLevel.ZOOMED_IN) {
                // Calculate Cylindrical coordinates for zooming into the tree
                const angle = panOffset.current.x; // Azimuth
                let height = CAMERA_CONFIG.ZOOM_IN_POS.y + panOffset.current.y;

                // Clamp Height to stay on tree
                height = Math.max(CAMERA_CONFIG.MIN_HEIGHT, Math.min(CAMERA_CONFIG.MAX_HEIGHT, height));

                // Update valid pan offset to avoid getting stuck at boundaries
                panOffset.current.y = height - CAMERA_CONFIG.ZOOM_IN_POS.y;

                const radius = CAMERA_CONFIG.ZOOM_IN_POS.z;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;

                targetPos.current.set(x, height, z);

                // Look at the center spine of the tree at the current camera height
                lookAtTarget.current.set(0, height - 1, 0);

            } else {
                // Full Tree View
                targetPos.current.copy(CAMERA_CONFIG.DEFAULT_POS);
                lookAtTarget.current.copy(CAMERA_CONFIG.LOOK_AT_OFFSET);
            }

            // Smoothly interpolate current camera to target
            camera.position.lerp(targetPos.current, GESTURE_THRESHOLDS.SMOOTHING_FACTOR);
            camera.lookAt(lookAtTarget.current);
        }

        // 2. MOUSE CONTROL LOGIC (Animation)
        else if (controlMode === ControlMode.MOUSE && isAnimating.current) {
            if (controls) {
                const orbitControls = controls as any;
                const lerpSpeed = 8 * delta; // Slightly faster for smoother feel

                if (zoomLevel === ZoomLevel.ZOOMED_IN && focusedPhoto) {
                    // ZOOM IN TO PHOTO
                    const photoPos = new THREE.Vector3(...focusedPhoto.position);

                    // Move target to the photo
                    orbitControls.target.lerp(photoPos, lerpSpeed);

                    // Calculate ideal camera position
                    const dist = 6;
                    const angle = focusedPhoto.rotation[1];
                    const camX = photoPos.x + Math.sin(angle) * dist;
                    const camZ = photoPos.z + Math.cos(angle) * dist;
                    const camY = photoPos.y;

                    const idealPos = new THREE.Vector3(camX, camY, camZ);
                    camera.position.lerp(idealPos, lerpSpeed);

                    orbitControls.update();

                    // Check if we have arrived
                    if (camera.position.distanceTo(idealPos) < 0.05 && orbitControls.target.distanceTo(photoPos) < 0.05) {
                        isAnimating.current = false;
                    }
                } else if (zoomLevel === ZoomLevel.FULL_TREE) {
                    // ZOOM OUT TO FULL TREE
                    orbitControls.target.lerp(CAMERA_CONFIG.LOOK_AT_OFFSET, lerpSpeed);
                    camera.position.lerp(CAMERA_CONFIG.DEFAULT_POS, lerpSpeed);
                    orbitControls.update();

                    if (camera.position.distanceTo(CAMERA_CONFIG.DEFAULT_POS) < 0.1) {
                        isAnimating.current = false;
                    }
                }
            }
        }
    });

    return (
        <OrbitControls
            enabled={controlMode === ControlMode.MOUSE}
            enableZoom={true}
            enablePan={controlMode === ControlMode.MOUSE}
            minDistance={2}
            maxDistance={100}
            makeDefault
        />
    );
};

export default CameraController;
