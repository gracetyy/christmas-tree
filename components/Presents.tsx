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
  pattern: 'solid' | 'stripes' | 'dots' | 'checkers';
  ribbonColor: string;
  explodeDir?: THREE.Vector3;
  explodeRotation?: THREE.Vector3;
}

// High fidelity ribbon material with sheen and clearcoat
const RibbonMaterial: React.FC<{ color: string }> = ({ color }) => {
  const isMetallic = color !== COLORS.RIBBON; // If not default white, assume Gold/Metallic
  
  return (
    <meshPhysicalMaterial 
      color={color} 
      roughness={0.15} 
      metalness={isMetallic ? 0.6 : 0.1} 
      clearcoat={1.0}
      clearcoatRoughness={0.1}
      sheen={1.0}
      sheenRoughness={0.2}
      sheenColor={color}
      side={THREE.DoubleSide}
    />
  );
};

// --- PROCEDURAL TEXTURE GENERATOR ---
const useGiftTexture = (color: string, type: 'solid' | 'stripes' | 'dots' | 'checkers') => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture(); 

    // Base Color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    if (type !== 'solid') {
        // Pattern overlay (subtle white/black with low opacity)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        
        if (type === 'stripes') {
           const stripeWidth = 40;
           ctx.save();
           ctx.translate(256, 256);
           ctx.rotate(Math.PI / 4);
           ctx.translate(-512, -512);
           for (let i = 0; i < 1024; i += stripeWidth * 2) {
               ctx.fillRect(i, 0, stripeWidth, 1024);
           }
           ctx.restore();
        } else if (type === 'dots') {
           const spacing = 60;
           const radius = 10;
           for (let x = 0; x < 512; x += spacing) {
               for (let y = 0; y < 512; y += spacing) {
                   const offsetX = (y / spacing) % 2 === 0 ? 0 : spacing / 2;
                   ctx.beginPath();
                   ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
                   ctx.fill();
               }
           }
        } else if (type === 'checkers') {
            const size = 64;
            for (let x = 0; x < 512; x += size) {
                for (let y = 0; y < 512; y += size) {
                    if (((x / size) + (y / size)) % 2 === 0) {
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [color, type]);
};

// --- RIBBON COMPONENTS ---

// A single loop of the bow
const RibbonLoop: React.FC<{ rotation?: [number, number, number], scale?: number, color: string }> = ({ rotation = [0,0,0], scale = 1, color }) => {
  const curve = useMemo(() => {
    // Teardrop / Bunny ear shape for loop
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),        // Center knot
      new THREE.Vector3(0.15, 0.2, 0),   // Up and out
      new THREE.Vector3(0.35, 0.25, 0),  // Peak
      new THREE.Vector3(0.4, 0.1, 0),    // Outer edge down
      new THREE.Vector3(0.2, 0.05, 0),   // Return path
      new THREE.Vector3(0, 0.02, 0)      // Back to knot (slightly offset to avoid z-fighting)
    ], true, 'centripetal', 0.5);
  }, []);

  return (
    <group rotation={rotation as any} scale={[scale, scale, scale]}>
      {/* Flatten the tube in Z axis to make it look like a ribbon strip */}
      <mesh scale={[1, 1, 0.05]}> 
        <tubeGeometry args={[curve, 32, 0.08, 4, true]} />
        <RibbonMaterial color={color} />
      </mesh>
    </group>
  );
};

// A draping tail
const RibbonTail: React.FC<{ rotation?: [number, number, number], length?: number, color: string }> = ({ rotation = [0,0,0], length = 1, color }) => {
    const curve = useMemo(() => {
      // S-curve for organic draping
      return new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.05, 0),       // Under knot
        new THREE.Vector3(0.15, 0.08, 0),    // Arch up slightly
        new THREE.Vector3(0.3, 0.02, 0),     // Down onto box
        new THREE.Vector3(0.45 * length, 0.01, 0.05),   // End of tail, slightly curled
      ]);
    }, [length]);
  
    return (
      <group rotation={rotation as any}>
        <mesh scale={[1, 1, 0.03]}>
           {/* Not closed tube */}
          <tubeGeometry args={[curve, 16, 0.07, 4, false]} />
          <RibbonMaterial color={color} />
        </mesh>
      </group>
    );
  };

const PresentBox: React.FC<PresentProps & { isExploded: boolean }> = ({ 
  position, rotation, scale, color, pattern, ribbonColor, explodeDir, explodeRotation, isExploded 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useFrame((state) => {
    const target = isExploded ? 1 : 0;
    const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
    progress.current = THREE.MathUtils.lerp(progress.current, target, lerpFactor);
    
    if (groupRef.current && explodeDir && explodeRotation) {
      const time = state.clock.elapsedTime;
      const seed = Math.sin(position.x * 12.9898 + position.z * 78.233) * 43758.5453;
      const floatTime = time * 0.4 + seed;
      
      // Floating motion in explode mode
      const drift = new THREE.Vector3(
        Math.sin(floatTime) * 0.4,
        Math.cos(floatTime * 0.8) * 0.4,
        Math.sin(floatTime * 0.6) * 0.4
      ).multiplyScalar(progress.current);

      groupRef.current.position.set(
        position.x + explodeDir.x * progress.current + drift.x,
        position.y + explodeDir.y * progress.current + drift.y,
        position.z + explodeDir.z * progress.current + drift.z
      );
      
      groupRef.current.rotation.set(
        rotation.x + explodeRotation.x * progress.current + (Math.sin(floatTime * 0.2) * 0.2 * progress.current),
        rotation.y + explodeRotation.y * progress.current + (Math.cos(floatTime * 0.3) * 0.2 * progress.current),
        rotation.z + explodeRotation.z * progress.current
      );
    }
  });

  const texture = useGiftTexture(color, pattern);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Main Box - Upgraded to Physical Material for clearcoat/sheen */}
      <RoundedBox args={[1, 1, 1]} radius={0.02} smoothness={4} position={[0, 0.5, 0]}>
        <meshPhysicalMaterial 
          map={texture}
          roughness={0.3} 
          metalness={0.1}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
        />
      </RoundedBox>

      {/* --- CROSS RIBBONS (Rounded for soft shiny edges like the bow) --- */}
      {/* Wraps Left, Right, Top, Bottom */}
      <RoundedBox args={[1.02, 1.02, 0.15]} radius={0.02} smoothness={4} position={[0, 0.5, 0]}>
        <RibbonMaterial color={ribbonColor} />
      </RoundedBox>
      
      {/* Wraps Front, Back, Top, Bottom */}
      <RoundedBox args={[0.15, 1.02, 1.02]} radius={0.02} smoothness={4} position={[0, 0.5, 0]}>
        <RibbonMaterial color={ribbonColor} />
      </RoundedBox>

      {/* --- BOW KNOT & LOOPS --- */}
      <group position={[0, 1.0, 0]}>
        
        {/* Central Knot - small sphere/rounded box */}
        <mesh position={[0, 0.05, 0]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <RibbonMaterial color={ribbonColor} />
        </mesh>

        {/* Loop 1 - Right */}
        <RibbonLoop rotation={[0.2, 0, -0.2]} scale={1.2} color={ribbonColor} />
        
        {/* Loop 2 - Left */}
        <RibbonLoop rotation={[0.2, Math.PI, 0.2]} scale={1.2} color={ribbonColor} />
        
        {/* Tail 1 - Draping Right */}
        <RibbonTail rotation={[0, -0.5, 0]} length={1.2} color={ribbonColor} />

        {/* Tail 2 - Draping Left */}
        <RibbonTail rotation={[0, Math.PI + 0.5, 0]} length={1.1} color={ribbonColor} />

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
    const count = 25; 
    const baseRadius = TREE_CONFIG.RADIUS_BOTTOM + 1.2; 
    const radiusVariance = 3.5; 
    const patterns = ['solid', 'stripes', 'dots', 'checkers'] as const;

    let attempts = 0;
    const maxAttempts = 1000; 

    while (items.length < count && attempts < maxAttempts) {
      attempts++;
      
      const angle = (Math.random() * Math.PI * 2);
      const r = baseRadius + Math.random() * radiusVariance;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (-TREE_CONFIG.HEIGHT / 2) + (Math.random() * 0.4); 

      const s = 0.6 + Math.random() * 0.7; 
      const tempPos = new THREE.Vector3(x, y, z);
      
      // COLLISION DETECTION
      let collision = false;
      const myRadius = s * 0.7;

      for (const item of items) {
        const otherRadius = item.scale.x * 0.7;
        const dist = tempPos.distanceTo(item.position);
        if (dist < (myRadius + otherRadius + 0.2)) {
           collision = true;
           break;
        }
      }

      if (!collision) {
        const color = COLORS.PRESENTS[Math.floor(Math.random() * COLORS.PRESENTS.length)];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const ribbonColor = Math.random() > 0.6 ? '#FFD700' : COLORS.RIBBON;

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
          position: tempPos,
          rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          scale: new THREE.Vector3(s, s, s),
          color,
          pattern,
          ribbonColor,
          explodeDir,
          explodeRotation
        });
      }
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