import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import TreeMesh from './TreeMesh';
import SpiralDecor from './SpiralDecor';
import Polaroid from './Polaroid';
import Star from './Star';
import Presents from './Presents';
import Snow from './Snow';
import { CAMERA_CONFIG, COLORS, GESTURE_THRESHOLDS } from '../constants';
import { PhotoData, ControlMode, ZoomLevel, InteractionMode } from '../types';

interface SceneProps {
  photos: PhotoData[];
  onUpload: (id: string, file: File) => void;
  onPhotoClick: (data: PhotoData) => void;
  onDelete: (id: string) => void;
  controlMode: ControlMode;
  interactionMode: InteractionMode;
  zoomLevel: ZoomLevel;
  panOffset: React.MutableRefObject<{x: number, y: number}>;
  focusedPhoto: PhotoData | null;
}

const CameraController: React.FC<{ 
  zoomLevel: ZoomLevel; 
  controlMode: ControlMode; 
  panOffset: React.MutableRefObject<{x: number, y: number}>;
  focusedPhoto: PhotoData | null;
}> = ({ zoomLevel, controlMode, panOffset, focusedPhoto }) => {
  const { camera, controls } = useThree();
  const targetPos = useRef(CAMERA_CONFIG.DEFAULT_POS.clone());
  const lookAtTarget = useRef(CAMERA_CONFIG.LOOK_AT_OFFSET.clone());
  const isAnimating = useRef(false);

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
  }, [zoomLevel, controlMode, focusedPhoto]);

  useFrame((state, delta) => {
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
            const lerpSpeed = 6 * delta; // Increased speed for snappier album view

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

                if (camera.position.distanceTo(idealPos) < 0.1 && orbitControls.target.distanceTo(photoPos) < 0.1) {
                    isAnimating.current = false;
                }
            } else if (zoomLevel === ZoomLevel.FULL_TREE) {
                // ZOOM OUT TO FULL TREE
                orbitControls.target.lerp(CAMERA_CONFIG.LOOK_AT_OFFSET, lerpSpeed);
                camera.position.lerp(CAMERA_CONFIG.DEFAULT_POS, lerpSpeed);
                orbitControls.update();

                if (camera.position.distanceTo(CAMERA_CONFIG.DEFAULT_POS) < 0.5) {
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
        target={CAMERA_CONFIG.LOOK_AT_OFFSET}
        makeDefault
    />
  );
};

const Scene: React.FC<SceneProps> = ({ 
    photos, 
    onUpload, 
    onPhotoClick, 
    onDelete,
    controlMode,  
    interactionMode, 
    zoomLevel, 
    panOffset, 
    focusedPhoto 
}) => {
  return (
    <Canvas
      dpr={[1, 1.5]} // clamp device pixel ratio to reduce GPU load on hi-DPI screens
      camera={{ position: CAMERA_CONFIG.DEFAULT_POS, fov: CAMERA_CONFIG.FOV }}
      gl={{ 
        antialias: true, 
        toneMapping: THREE.ReinhardToneMapping, 
        toneMappingExposure: 1.2, 
        preserveDrawingBuffer: true, // required for clean downloads
        powerPreference: 'high-performance',
      }}
      style={{ background: COLORS.BACKGROUND }}
    >
      <CameraController 
        zoomLevel={zoomLevel} 
        controlMode={controlMode} 
        panOffset={panOffset} 
        focusedPhoto={focusedPhoto}
      />
      
      {/* City preset gives nice reflections for shiny objects */}
      <Environment preset="city" background={false} environmentIntensity={1.0} />
      
      {/* Lighting Setup */}
      <ambientLight intensity={0.1} />
      {/* Warm Main Light */}
      <pointLight position={[20, 10, 20]} intensity={1} color="#ffaa00" distance={50} decay={2} />
      {/* Cool Fill Light */}
      <pointLight position={[-20, 5, -20]} intensity={0.5} color="#0055ff" distance={50} decay={2} />
      {/* Rim Light for shape definition */}
      <spotLight position={[0, 30, 0]} intensity={1} angle={0.5} penumbra={1} color="#ffffff" />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      
      {/* Global Snow Effect */}
      <Snow />

      <group position={[0, -2, 0]}>
        <TreeMesh />
        <SpiralDecor />
        <Star />
        <Presents />
        
        {/* Magic Flies / Sparkles around the tree */}
        <Sparkles 
            position={[0, -3, 0]}
            count={120}
            scale={[12, 10, 12]}
            size={15}
            speed={0.2}
            opacity={0.7}
            color="#fff1a1"
        />
        
        {photos.map((photo) => (
          <Polaroid 
            key={photo.id} 
            data={photo} 
            onUpload={onUpload} 
            onPhotoClick={onPhotoClick}
            onDelete={onDelete}
            isZoomedIn={zoomLevel === ZoomLevel.ZOOMED_IN}
            controlMode={controlMode}
            interactionMode={interactionMode}
          />
        ))}
      </group>
    </Canvas>
  );
};

export default Scene;