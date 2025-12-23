import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const count = 3000;
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spread across a wide area
      positions[i * 3] = (Math.random() - 0.5) * 60; // x
      positions[i * 3 + 1] = Math.random() * 50 - 10; // y (start from high to low)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60; // z
      
      // Random falling speed
      velocities[i] = 0.02 + Math.random() * 0.08;
    }
    
    return { positions, velocities };
  }, []);

  useFrame(() => {
    if (!mesh.current) return;
    
    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Update Y position based on velocity
      positions[i * 3 + 1] -= particles.velocities[i];
      
      // Reset if below a certain threshold (ground level is approx -2 relative to scene, but let's go lower)
      if (positions[i * 3 + 1] < -15) {
        positions[i * 3 + 1] = 35; // Reset to top
        // Randomize X and Z again to avoid repetitive patterns
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Snow;