import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const getSnowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32; 
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

const Snow: React.FC<{ isExploded?: boolean }> = ({ isExploded = false }) => {
  const count = 1200; // Reduced for performance
  const mesh = useRef<THREE.Points>(null);
  const explodeProgress = useRef(0);
  
  const texture = useMemo(() => getSnowTexture(), []);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const explodeDirs = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Spread across a wide area
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 50 - 10;
      const z = (Math.random() - 0.5) * 60;

      positions[i * 3] = x; // x
      positions[i * 3 + 1] = y; // y
      positions[i * 3 + 2] = z; // z
      
      velocities[i] = 0.02 + Math.random() * 0.08;

      // Explode direction: away from center
      const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(20 + Math.random() * 20);
      explodeDirs[i * 3] = dir.x;
      explodeDirs[i * 3 + 1] = dir.y;
      explodeDirs[i * 3 + 2] = dir.z;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    return { positions, velocities, explodeDirs, geo };
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const targetProgress = isExploded ? 1 : 0;
    const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
    explodeProgress.current = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Base falling motion
      const basePos = particles.positions[i * 3 + 1] - (state.clock.elapsedTime * particles.velocities[i] * 50) % 50;
      
      positions[i * 3] = particles.positions[i * 3] + particles.explodeDirs[i * 3] * explodeProgress.current;
      positions[i * 3 + 1] = basePos + particles.explodeDirs[i * 3 + 1] * explodeProgress.current;
      positions[i * 3 + 2] = particles.positions[i * 3 + 2] + particles.explodeDirs[i * 3 + 2] * explodeProgress.current;
    }
    
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} geometry={particles.geo}>
      <pointsMaterial
        size={0.25}
        color="#ffffff"
        map={texture}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.5}
      />
    </points>
  );
};

export default Snow;