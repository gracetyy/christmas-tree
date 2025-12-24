import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Environment, Sparkles, Text, Billboard, Hud } from '@react-three/drei';
import * as THREE from 'three';
import TreeMesh from './TreeMesh';
import SpiralDecor from './SpiralDecor';
import Polaroid from './Polaroid';
import Star from './Star';
import Presents from './Presents';
import Snow from './Snow';
import CameraController from './CameraController';
import { CAMERA_CONFIG, COLORS } from '../constants';
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
  isRecording?: boolean;
  recordingType?: 'FULL' | 'ALBUM' | null;
  userName?: string;
}

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
      <Snow />

      {/* Cinematic Greeting for Video Recording - Stays fixed on screen during capture */}
      {isRecording && (
        <Hud>
          <orthographicCamera makeDefault position={[0, 0, 10]} />
          <group position={[0, 4.2, 0]}>
            <Text
              font="https://fonts.gstatic.com/s/greatvibes/v15/RWm0oG3Wwu8bG_Y9uOevYBRmKvnX96U.woff"
              fontSize={1.2}
              color="#fff1a1"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.03}
              outlineColor="#000000"
              maxWidth={10}
              textAlign="center"
            >
              {`Merry Christmas\n${userName || 'everyone'}!`}
            </Text>
          </group>
        </Hud>
      )}

      {/* 3D Scene Elements */}
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