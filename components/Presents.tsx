import React, { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, TREE_CONFIG } from '../constants';

interface PresentProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: string;
}

const PresentBox: React.FC<PresentProps> = ({ position, rotation, scale, color }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Main Box */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>

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
         {/* Simple loops using torus knots or just spheres/cylinders */}
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

const Presents: React.FC = () => {
  const presents = useMemo(() => {
    const items: PresentProps[] = [];
    const count = 20; // Number of presents
    const baseRadius = TREE_CONFIG.RADIUS_BOTTOM + 1; // Start slightly outside the tree
    const radiusVariance = 4; // How far out they spread

    for (let i = 0; i < count; i++) {
      // Random angle
      const angle = Math.random() * Math.PI * 2;
      // Random radius from base
      const r = baseRadius + Math.random() * radiusVariance;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      
      // Y position: Tree is centered at y=0 locally in Scene, but TreeMesh generates from -H/2 to H/2.
      // Scene shifts group by -2.
      // The floor of the tree is at -TREE_CONFIG.HEIGHT / 2.
      const y = -TREE_CONFIG.HEIGHT / 2;

      // Random scale
      const s = 0.6 + Math.random() * 0.8;
      
      // Random Color
      const color = COLORS.PRESENTS[Math.floor(Math.random() * COLORS.PRESENTS.length)];

      items.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s),
        color
      });
    }
    return items;
  }, []);

  return (
    <group>
      {presents.map((p, i) => (
        <PresentBox key={i} {...p} />
      ))}
    </group>
  );
};

export default Presents;