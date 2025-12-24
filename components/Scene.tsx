import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Sparkles, Text, Billboard, Hud } from '@react-three/drei';
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
  panOffset: React.MutableRefObject<{ x: number, y: number }>;
  focusedPhoto: PhotoData | null;
  isExploded?: boolean;
  isRecording?: boolean;
  recordingType?: 'FULL' | 'ALBUM' | null;
  userName?: string;
}

const TREE_OFFSET_Y = -2;

const CameraController: React.FC<{
  zoomLevel: ZoomLevel;
  controlMode: ControlMode;
  panOffset: React.MutableRefObject<{ x: number, y: number }>;
  focusedPhoto: PhotoData | null;
  isRecording: boolean;
  recordingType: 'FULL' | 'ALBUM' | null;
  photos: PhotoData[];
}> = ({ zoomLevel, controlMode, panOffset, focusedPhoto, isRecording, recordingType, photos }) => {
  const { camera, controls } = useThree();
  const targetPos = useRef(CAMERA_CONFIG.DEFAULT_POS.clone());
  const lookAtTarget = useRef(CAMERA_CONFIG.LOOK_AT_OFFSET.clone());
  const isAnimating = useRef(false);
  const recordingStartTime = useRef(0);
  
  // Track current camera state for smoother transitions
  const currentCamState = useRef({
    angle: Math.atan2(CAMERA_CONFIG.DEFAULT_POS.x, CAMERA_CONFIG.DEFAULT_POS.z),
    height: CAMERA_CONFIG.DEFAULT_POS.y,
    radius: CAMERA_CONFIG.DEFAULT_POS.z
  });

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
    if (controlMode === ControlMode.HAND) {
      if (zoomLevel === ZoomLevel.FULL_TREE) {
        targetPos.current.copy(CAMERA_CONFIG.DEFAULT_POS);
        panOffset.current = { x: 0, y: 0 };
      }
      
      // Sync state for smooth hand control start
      const relX = camera.position.x;
      const relZ = camera.position.z;
      currentCamState.current.angle = Math.atan2(relX, relZ);
      currentCamState.current.radius = Math.sqrt(relX * relX + relZ * relZ);
      currentCamState.current.height = camera.position.y;
    }

    // Start animation for Mouse Mode transitions (Zoom In or Out)
    if (controlMode === ControlMode.MOUSE) {
      isAnimating.current = true;
      
      // Sync internal state to current camera position to avoid jumps
      const orbitControls = controls as any;
      const target = orbitControls?.target || CAMERA_CONFIG.LOOK_AT_OFFSET;
      const relX = camera.position.x - target.x;
      const relZ = camera.position.z - target.z;
      
      currentCamState.current.angle = Math.atan2(relX, relZ);
      currentCamState.current.radius = Math.sqrt(relX * relX + relZ * relZ);
      currentCamState.current.height = camera.position.y;
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
        const radius = 32; // Standard view distance
        camera.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        camera.lookAt(0, -1, 0);
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
      let targetAngle, targetHeight, targetRadius;

      if (zoomLevel === ZoomLevel.ZOOMED_IN) {
        // Calculate Cylindrical coordinates for zooming into the tree
        targetAngle = panOffset.current.x; // Azimuth
        let h = CAMERA_CONFIG.ZOOM_IN_POS.y + panOffset.current.y;

        // Clamp Height to stay on tree
        h = Math.max(CAMERA_CONFIG.MIN_HEIGHT, Math.min(CAMERA_CONFIG.MAX_HEIGHT, h));
        panOffset.current.y = h - CAMERA_CONFIG.ZOOM_IN_POS.y;

        targetHeight = h;
        targetRadius = CAMERA_CONFIG.ZOOM_IN_POS.z;
        lookAtTarget.current.set(0, h - 1, 0);
      } else {
        // Full Tree View - Allow Rotation (Orbit)
        targetAngle = panOffset.current.x; 
        targetRadius = CAMERA_CONFIG.DEFAULT_POS.z;
        targetHeight = CAMERA_CONFIG.DEFAULT_POS.y;
        lookAtTarget.current.copy(CAMERA_CONFIG.LOOK_AT_OFFSET);
      }

      // Smoothly interpolate the state components
      const smoothing = GESTURE_THRESHOLDS.SMOOTHING_FACTOR;
      
      let angleDiff = targetAngle - currentCamState.current.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      currentCamState.current.angle += angleDiff * smoothing;
      currentCamState.current.height += (targetHeight - currentCamState.current.height) * smoothing;
      currentCamState.current.radius += (targetRadius - currentCamState.current.radius) * smoothing;

      // Apply state to camera position
      const camX = Math.sin(currentCamState.current.angle) * currentCamState.current.radius;
      const camZ = Math.cos(currentCamState.current.angle) * currentCamState.current.radius;
      const camY = currentCamState.current.height;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(lookAtTarget.current);
    }

    // 2. MOUSE CONTROL LOGIC (Animation)
    else if (controlMode === ControlMode.MOUSE && isAnimating.current) {
      if (controls) {
        const orbitControls = controls as any;
        const lerpSpeed = 4 * delta; // Slower for smoother, less dizzying movement

        if (zoomLevel === ZoomLevel.ZOOMED_IN && focusedPhoto) {
          // ZOOM IN TO PHOTO
          const photoPos = new THREE.Vector3(...focusedPhoto.position);
          photoPos.y += TREE_OFFSET_Y; // Adjust for group offset

          // Move target to the photo
          orbitControls.target.lerp(photoPos, lerpSpeed);

          // Calculate target camera state
          const targetAngle = focusedPhoto.rotation[1];
          const targetHeight = photoPos.y;
          const targetRadius = 6;

          // Smoothly interpolate the state components
          // This prevents the camera from cutting through the tree
          
          // Handle angle wrap-around for shortest path
          let angleDiff = targetAngle - currentCamState.current.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          currentCamState.current.angle += angleDiff * lerpSpeed;
          currentCamState.current.height += (targetHeight - currentCamState.current.height) * lerpSpeed;
          currentCamState.current.radius += (targetRadius - currentCamState.current.radius) * lerpSpeed;

          // Apply state to camera position
          const camX = photoPos.x + Math.sin(currentCamState.current.angle) * currentCamState.current.radius;
          const camZ = photoPos.z + Math.cos(currentCamState.current.angle) * currentCamState.current.radius;
          const camY = currentCamState.current.height;

          camera.position.set(camX, camY, camZ);
          orbitControls.update();

          // Check if we have arrived
          const idealPos = new THREE.Vector3(
            photoPos.x + Math.sin(targetAngle) * targetRadius,
            targetHeight,
            photoPos.z + Math.cos(targetAngle) * targetRadius
          );
          
          if (camera.position.distanceTo(idealPos) < 0.01 && orbitControls.target.distanceTo(photoPos) < 0.01) {
            isAnimating.current = false;
          }
        } else if (zoomLevel === ZoomLevel.FULL_TREE) {
          // ZOOM OUT TO FULL TREE
          orbitControls.target.lerp(CAMERA_CONFIG.LOOK_AT_OFFSET, lerpSpeed);
          
          // Also interpolate state back to default
          const targetAngle = Math.atan2(CAMERA_CONFIG.DEFAULT_POS.x, CAMERA_CONFIG.DEFAULT_POS.z);
          const targetHeight = CAMERA_CONFIG.DEFAULT_POS.y;
          const targetRadius = CAMERA_CONFIG.DEFAULT_POS.z;

          let angleDiff = targetAngle - currentCamState.current.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          currentCamState.current.angle += angleDiff * lerpSpeed;
          currentCamState.current.height += (targetHeight - currentCamState.current.height) * lerpSpeed;
          currentCamState.current.radius += (targetRadius - currentCamState.current.radius) * lerpSpeed;

          const camX = Math.sin(currentCamState.current.angle) * currentCamState.current.radius;
          const camZ = Math.cos(currentCamState.current.angle) * currentCamState.current.radius;
          const camY = currentCamState.current.height;

          camera.position.set(camX, camY, camZ);
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

const Scene: React.FC<SceneProps> = ({
  photos,
  onUpload,
  onPhotoClick,
  onDelete,
  controlMode,
  interactionMode,
  zoomLevel,
  panOffset,
  focusedPhoto,
  isExploded = false,
  isRecording = false,
  recordingType = null,
  userName = ''
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
      style={{ background: COLORS.BACKGROUND, position: 'relative', zIndex: 0 }}
    >
      <CameraController
        zoomLevel={zoomLevel}
        controlMode={controlMode}
        panOffset={panOffset}
        focusedPhoto={focusedPhoto}
        isRecording={isRecording}
        recordingType={recordingType}
        photos={photos}
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
      <Snow isExploded={isExploded} />

      {/* Cinematic Greeting for Video Recording - rendered into the canvas so it's captured */}
      {isRecording && (
        <Hud>
          <orthographicCamera makeDefault position={[0, 0, 10]} />
          <group position={[0, 4.2, 0]}>
            <Text
              font="/fonts/GreatVibes-Regular.ttf"
              fontSize={1.2}
              color="#fff1a1"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.03}
              outlineColor="#000000"
              maxWidth={10}
              textAlign="center"
            >
              {`Merry Christmas${userName ? ` ${userName}` : ''}!`}
            </Text>
          </group>
        </Hud>
      )}

      {/* 3D Scene Elements */}
      <group position={[0, TREE_OFFSET_Y, 0]}>
        <TreeMesh isExploded={isExploded} photos={photos} />
        <SpiralDecor isExploded={isExploded} photos={photos} />
        <Star isExploded={isExploded} />
        <Presents isExploded={isExploded} />

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
            isExploded={isExploded}
          />
        ))}
      </group>
    </Canvas>
  );
};

export default Scene;