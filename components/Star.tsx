import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, TREE_CONFIG } from '../constants';

const GlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.5)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
}

const Star: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  const glowTexture = useMemo(() => GlowTexture(), []);

  // Create a classic 5-pointed star shape
  const starGeometry = useMemo(() => {
      const shape = new THREE.Shape();
      const spikes = 5;
      const outerRadius = 1.3;
      const innerRadius = 0.6;
      
      for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          // Rotate so the top point is pointing straight up (+PI/2)
          const angle = (i / (spikes * 2)) * Math.PI * 2 + (Math.PI / 2);
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
      }
      shape.closePath();
      
      const extrudeSettings = {
          depth: 0.3,
          bevelEnabled: true,
          bevelThickness: 0.1,
          bevelSize: 0.05,
          bevelSegments: 4
      };
      
      // Center the geometry so rotation happens around the middle
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center(); 
      return geo;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Gentle floating motion
      // Position is base + offset + float
      groupRef.current.position.y = (TREE_CONFIG.HEIGHT / 2) + 0.8 + Math.sin(time * 1.5) * 0.1;
      
      // Slow rotation
      groupRef.current.rotation.y = time * 0.5;
      
      // Pulsing scale
      const pulse = 1 + Math.sin(time * 3) * 0.05;
      groupRef.current.scale.set(pulse, pulse, pulse);

      // Pulse the light intensity
      if (glowRef.current) {
        glowRef.current.intensity = 3 + Math.sin(time * 3) * 1;
      }
    }
  });

  const startY = (TREE_CONFIG.HEIGHT / 2) + 0.8;

  return (
    <group ref={groupRef} position={[0, startY, 0]}>
      
      {/* GLOW HALO (Billboard so it always faces camera) */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
         <mesh scale={[12, 12, 1]}>
             <planeGeometry />
             <meshBasicMaterial map={glowTexture} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
         </mesh>
      </Billboard>

      {/* The Star Mesh */}
      <mesh geometry={starGeometry}>
         <meshStandardMaterial 
             color={COLORS.STAR} 
             emissive={COLORS.STAR_GLOW} 
             emissiveIntensity={0.6} 
             metalness={1.0} 
             roughness={0.1} 
             envMapIntensity={1}
         />
      </mesh>

      {/* Light Source inside the star */}
      <pointLight 
        ref={glowRef}
        color={COLORS.STAR_GLOW} 
        distance={30} 
        decay={2} 
        castShadow
        shadow-bias={-0.0001}
      />
    </group>
  );
};

export default Star;