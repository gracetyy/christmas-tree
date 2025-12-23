import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Sparkles } from '@react-three/drei';
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

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, TREE_CONFIG } from '../constants';
import { Github, Star as StarIcon } from 'lucide-react';

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
  const [hovered, setHovered] = useState(false);
  const [starCount, setStarCount] = useState<number | null>(null);
  
  const glowTexture = useMemo(() => GlowTexture(), []);

  // Fetch star count
  useEffect(() => {
    fetch('https://api.github.com/repos/gracetyy/christmas-tree')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          setStarCount(data.stargazers_count);
        }
      })
      .catch(err => console.error("Failed to fetch stars:", err));
  }, []);

  // Classic 5-Pointed Star Shape
  const starGeometry = useMemo(() => {
      const shape = new THREE.Shape();
      const spikes = 5;
      const outerRadius = 1.5;
      const innerRadius = 0.6;
      
      for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          // Point up: start at PI/2
          const a = (i / (spikes * 2)) * Math.PI * 2 + Math.PI / 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
      }
      shape.closePath();
      
      const extrudeSettings = {
          depth: 0.4,
          bevelEnabled: true,
          bevelThickness: 0.2,
          bevelSize: 0.1,
          bevelSegments: 3
      };
      
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center();
      return geo;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Gentle floating motion
      groupRef.current.position.y = (TREE_CONFIG.HEIGHT / 2) + 0.8 + Math.sin(time * 1.5) * 0.1;
      
      // Slow rotation
      groupRef.current.rotation.y = time * 0.5;
      groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.1; 
      
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
      
      {/* GLOW HALO */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
         <mesh scale={[12, 12, 1]}>
             <planeGeometry />
             <meshBasicMaterial map={glowTexture} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
         </mesh>
      </Billboard>

      {/* The 3D Star Mesh */}
      <mesh 
        geometry={starGeometry}
        onClick={(e) => {
          e.stopPropagation();
          window.open('https://github.com/gracetyy/christmas-tree', '_blank');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
         <meshStandardMaterial 
             color={COLORS.STAR} 
             emissive={COLORS.STAR_GLOW} 
             emissiveIntensity={1.5} 
             metalness={0.9} 
             roughness={0.1} 
         />
      </mesh>

      {/* Hover Message */}
      {hovered && (
        <Html position={[0, 2.5, 0]} center distanceFactor={10}>
          <div className="whitespace-nowrap bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-2xl animate-in zoom-in duration-300 pointer-events-none">
            <div className="flex items-center gap-2 text-[#fff1a1] font-medium text-sm">
              <Github size={14} className="text-white" />
              <span>Please star our repo! &lt;3</span>
              {starCount !== null && (
                <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-white/70">
                  <StarIcon size={10} fill="currentColor" />
                  {starCount}
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
      
      {/* Extra Sparkles for magical feel */}
      <Sparkles count={15} scale={4} size={6} speed={0.4} opacity={0.7} color="#fff" />

      {/* Light Source inside the star - No shadows for performance */}
      <pointLight 
        ref={glowRef}
        color={COLORS.STAR_GLOW} 
        distance={30} 
        decay={2} 
        castShadow={false}
      />
    </group>
  );
};

export default Star;

export default Star;