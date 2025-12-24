import React, { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import { Trash2 } from 'lucide-react';
import { COLORS, PLACEHOLDER_TYPES } from '../constants';
import { PhotoData, ControlMode, InteractionMode } from '../types';
import { generatePlaceholderTexture } from '../utils/math';

interface PolaroidProps {
  data: PhotoData;
  onUpload: (id: string, file: File) => void;
  onPhotoClick: (data: PhotoData) => void;
  onDelete: (id: string) => void;
  isZoomedIn: boolean;
  controlMode: ControlMode;
  interactionMode: InteractionMode;
  isExploded?: boolean;
}

const tempScale = new THREE.Vector3();

const Polaroid: React.FC<PolaroidProps> = ({ 
  data, 
  onUpload, 
  onPhotoClick,
  onDelete,
  isZoomedIn, 
  controlMode, 
  interactionMode,
  isExploded = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const explodeProgress = useRef(0);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const explodeDir = useMemo(() => {
    return new THREE.Vector3(data.position[0], data.position[1], data.position[2]).normalize().multiplyScalar(15 + Math.random() * 10);
  }, [data.position]);

  const textureUrl = useMemo(() => {
    if (data.url) return data.url;
    const type = data.placeholderType || PLACEHOLDER_TYPES.SNOWFLAKE;
    const bg = '#2c3e50'; 
    return generatePlaceholderTexture(type, bg, '#ffffff');
  }, [data.url, data.placeholderType]);

  const texture = useTexture(textureUrl);
  texture.center.set(0.5, 0.5); 

  useFrame((state) => {
    const targetProgress = isExploded ? 1 : 0;
    const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
    explodeProgress.current = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);

    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const swayAmount = 0.05;
      
      // Base position (on the tree or exploding away)
      const basePos = new THREE.Vector3(
        data.position[0] + explodeDir.x * explodeProgress.current,
        data.position[1] + explodeDir.y * explodeProgress.current,
        data.position[2] + explodeDir.z * explodeProgress.current
      );

      if (explodeProgress.current > 0.01) {
        // Calculate a position in front of the camera for "floating" effect
        const cam = state.camera;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
        
        // Use a deterministic scatter based on the photo's original position
        const seed = Math.sin(data.position[0] * 12.9898 + data.position[1] * 78.233) * 43758.5453;
        const offsetX = ((seed * 100) % 10) - 5;
        const offsetY = ((seed * 1000) % 6) - 1; // Moved upward (was -3)
        const offsetZ = 8 + ((seed * 10) % 4); // 8-12 units in front
        
        // Add some "outer space" floating motion
        const floatTime = time * 0.3;
        const driftX = Math.sin(floatTime + seed) * 0.5;
        const driftY = Math.cos(floatTime * 0.7 + seed) * 0.5;
        const driftZ = Math.sin(floatTime * 0.5 + seed) * 0.3;

        const floatingPos = cam.position.clone()
          .add(forward.multiplyScalar(offsetZ + driftZ))
          .add(right.multiplyScalar(offsetX + driftX))
          .add(up.multiplyScalar(offsetY + driftY));

        // Lerp between base (exploding) position and floating position
        const floatFactor = Math.pow(explodeProgress.current, 2); 
        groupRef.current.position.lerpVectors(basePos, floatingPos, floatFactor);
        
        // Rotation: Blend between original rotation and facing camera with slight wobble
        const targetQuat = cam.quaternion.clone();
        const wobble = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            Math.sin(time * 0.2 + seed) * 0.1,
            Math.cos(time * 0.3 + seed) * 0.1,
            Math.sin(time * 0.5 + seed) * 0.1
        ));
        targetQuat.multiply(wobble);

        const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            0, 
            data.rotation[1] + Math.sin(time * 0.5 + data.position[0]) * 0.02 + explodeProgress.current * 5,
            Math.sin(time + data.position[1]) * swayAmount + explodeProgress.current * 5
        ));
        groupRef.current.quaternion.slerpQuaternions(baseQuat, targetQuat, floatFactor);
      } else {
        groupRef.current.position.copy(basePos);
        groupRef.current.rotation.set(
            0,
            data.rotation[1] + Math.sin(time * 0.5 + data.position[0]) * 0.02,
            Math.sin(time + data.position[1]) * swayAmount
        );
      }

      // Adjusted Base scale
      const baseScale = 0.85; 
      const targetScale = hovered ? baseScale * 1.15 : baseScale;
      tempScale.set(targetScale, targetScale, targetScale);
      groupRef.current.scale.lerp(tempScale, 0.1);
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
      <mesh position={[0, -0.25, 0]} visible={!isExploded && explodeProgress.current < 0.1}>
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
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* The Photo Area */}
        <mesh position={[0, -0.65, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshStandardMaterial 
            map={texture} 
            color={COLORS.POLAROID_FRAME}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Backing */}
        <mesh position={[0, -0.75, -0.01]}>
           <planeGeometry args={[1.2, 1.5]} />
           <meshBasicMaterial color={COLORS.POLAROID_BACK} />
        </mesh>
      </group>
      
      {/* Interaction UI (Hidden Input & Delete Button) - Only render when needed for performance */}
      {(hovered || (interactionMode === InteractionMode.EDIT && isZoomedIn)) && (
        <Html position={[0.5, -1.4, 0.1]} transform style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: hovered ? 'auto' : 'none' }}>
          <div className="flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileChange}
              />
              
              {interactionMode === InteractionMode.EDIT && (
                   <button
                      onClick={(e) => {
                          e.stopPropagation();
                          // Prevent click from propagating to group
                          e.preventDefault();
                          onDelete(data.id);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors"
                      title="Delete Photo"
                      style={{ pointerEvents: 'auto' }}
                   >
                      <Trash2 size={14} />
                   </button>
              )}
          </div>
        </Html>
      )}
    </group>
  );
};

export default Polaroid;