import React, { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import { COLORS, PLACEHOLDER_TYPES } from '../constants';
import { PhotoData, ControlMode, InteractionMode } from '../types';
import { generatePlaceholderTexture } from '../utils/math';

interface PolaroidProps {
  data: PhotoData;
  onUpload: (id: string, file: File) => void;
  onPhotoClick: (data: PhotoData) => void;
  isZoomedIn: boolean;
  controlMode: ControlMode;
  interactionMode: InteractionMode;
}

const Polaroid: React.FC<PolaroidProps> = ({ 
  data, 
  onUpload, 
  onPhotoClick,
  isZoomedIn, 
  controlMode, 
  interactionMode 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textureUrl = useMemo(() => {
    if (data.url) return data.url;
    const type = data.placeholderType || PLACEHOLDER_TYPES.SNOWFLAKE;
    const bg = '#2c3e50'; 
    return generatePlaceholderTexture(type, bg, '#ffffff');
  }, [data.url, data.placeholderType]);

  const texture = useTexture(textureUrl);
  texture.center.set(0.5, 0.5); 

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const swayAmount = 0.05;
      
      groupRef.current.rotation.z = data.rotation[1] * 0 + Math.sin(time + data.position[1]) * swayAmount;
      groupRef.current.rotation.y = data.rotation[1] + Math.sin(time * 0.5 + data.position[0]) * 0.02;

      // Adjusted Base scale
      const baseScale = 0.85; 
      const targetScale = hovered ? baseScale * 1.15 : baseScale;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    
    if (interactionMode === InteractionMode.EDIT) {
        // Edit Mode: Trigger Upload
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    } else {
        // View Mode: Zoom to this photo
        onPhotoClick(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(data.id, e.target.files[0]);
    }
  };

  // Changes cursor based on mode
  const cursorStyle = interactionMode === InteractionMode.EDIT ? 'pointer' : 'zoom-in';

  return (
    <group 
      ref={groupRef} 
      position={data.position} 
      rotation={[0, data.rotation[1], 0]} 
      scale={[0.85, 0.85, 0.85]}
      onPointerOver={() => { 
          setHovered(true); 
          document.body.style.cursor = cursorStyle; 
      }}
      onPointerOut={() => { 
          setHovered(false); 
          document.body.style.cursor = 'auto'; 
      }}
      onClick={handleClick}
    >
      {/* The String */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.5} />
      </mesh>

      {/* The Polaroid Body */}
      <group position={[0, -0.5, 0]}>
        
        {/* GOLD OUTLINE */}
        <mesh position={[0, -0.75, -0.02]}>
          <boxGeometry args={[1.28, 1.58, 0.02]} />
          <meshStandardMaterial 
            color="#FFD700" 
            metalness={1.0} 
            roughness={0.1} 
            emissive="#b8860b"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Paper Frame */}
        <mesh position={[0, -0.75, 0]}>
          <boxGeometry args={[1.2, 1.5, 0.04]} />
          <meshStandardMaterial 
            color={COLORS.POLAROID_FRAME} 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* The Photo Area */}
        <mesh position={[0, -0.65, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshBasicMaterial map={texture} />
        </mesh>

        {/* Backing */}
        <mesh position={[0, -0.75, -0.01]}>
           <planeGeometry args={[1.2, 1.5]} />
           <meshBasicMaterial color={COLORS.POLAROID_BACK} />
        </mesh>
      </group>
      
      <Html>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange}
        />
      </Html>
    </group>
  );
};

export default Polaroid;