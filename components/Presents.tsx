import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { COLORS, TREE_CONFIG } from '../constants';

interface PresentProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: string;
  explodeDir?: THREE.Vector3;
  explodeRotation?: THREE.Vector3;
}

const PresentBox: React.FC<PresentProps & { isExploded: boolean }> = ({ 
  position, rotation, scale, color, explodeDir, explodeRotation, isExploded 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useFrame(() => {
    const target = isExploded ? 1 : 0;
    const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
    progress.current = THREE.MathUtils.lerp(progress.current, target, lerpFactor);
    
    if (groupRef.current && explodeDir && explodeRotation) {
      groupRef.current.position.set(
        position.x + explodeDir.x * progress.current,
        position.y + explodeDir.y * progress.current,
        position.z + explodeDir.z * progress.current
      );
      
      groupRef.current.rotation.set(
        rotation.x + explodeRotation.x * progress.current,
        rotation.y + explodeRotation.y * progress.current,
        rotation.z + explodeRotation.z * progress.current
      );
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Main Box - Rounded for better look. No shadows for high performance. */}
      <RoundedBox args={[1, 1, 1]} radius={0.06} smoothness={2} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </RoundedBox>

      {/* Horizontal Ribbon */}
      <mesh position={[0, 0.5, 0]} scale={[1.02, 1.02, 0.15]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.RIBBON} roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Vertical Ribbon */}
      <mesh position={[0, 0.5, 0]} scale={[0.15, 1.02, 1.02]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.RIBBON} roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Bow on top */}
      <group position={[0, 1.0, 0]} scale={[0.3, 0.3, 0.3]}>
         <mesh rotation={[0, 0, Math.PI/4]} position={[0.2, 0.2, 0]}>
             <torusGeometry args={[0.5, 0.2, 16, 32]} />
             <meshStandardMaterial color={COLORS.RIBBON} />
         </mesh>
         <mesh rotation={[0, 0, -Math.PI/4]} position={[-0.2, 0.2, 0]}>
             <torusGeometry args={[0.5, 0.2, 16, 32]} />
             <meshStandardMaterial color={COLORS.RIBBON} />
         </mesh>
      </group>
    </group>
  );
};

interface PresentsProps {
  isExploded?: boolean;
}

const Presents: React.FC<PresentsProps> = ({ isExploded = false }) => {
  const presents = useMemo(() => {
    const items: PresentProps[] = [];
    const count = 20; 
    const baseRadius = TREE_CONFIG.RADIUS_BOTTOM + 1; 
    const radiusVariance = 4; 

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = baseRadius + Math.random() * radiusVariance;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = -TREE_CONFIG.HEIGHT / 2;

      const s = 0.6 + Math.random() * 0.8;
      const color = COLORS.PRESENTS[Math.floor(Math.random() * COLORS.PRESENTS.length)];

      // More randomized explode direction (including vertical and varying distances)
      const explodeDir = new THREE.Vector3(
        x + (Math.random() - 0.5) * 10, 
        Math.random() * 15 - 5, 
        z + (Math.random() - 0.5) * 10
      ).normalize().multiplyScalar(20 + Math.random() * 20);

      const explodeRotation = new THREE.Vector3(
        Math.random() * Math.PI * 4,
        Math.random() * Math.PI * 4,
        Math.random() * Math.PI * 4
      );

      items.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s),
        color,
        explodeDir,
        explodeRotation
      });
    }
    return items;
  }, []);

  return (
    <group>
      {presents.map((p, i) => (
        <PresentBox key={i} {...p} isExploded={isExploded} />
      ))}
    </group>
  );
};

export default Presents;