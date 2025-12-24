import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, SPIRAL_CONFIG, TREE_CONFIG } from '../constants';
import { getSpiralPoint } from '../utils/math';

// Generate a soft glow texture for the fluff particles
const getFluffTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Soft radial glow
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

interface SpiralDecorProps {
  isExploded?: boolean;
}

const SpiralDecor: React.FC<SpiralDecorProps> = ({ isExploded = false }) => {
  const lineRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const explodeProgress = useRef(0);
  
  const fluffTexture = useMemo(() => getFluffTexture(), []);

  // Calculate points for the tube geometry
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 400; // Smoother curve
    for (let i = 0; i <= segments; i++) {
      points.push(getSpiralPoint(i / segments));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  // Generate "Fluffy" Tinsel Particles
  const { tinselGeo, initialTinselPositions } = useMemo(() => {
    const curvePoints = curve.getSpacedPoints(1200); 
    const particlesPerPoint = 12; 
    const totalParticles = curvePoints.length * particlesPerPoint;
    
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    
    const baseColor = new THREE.Color(COLORS.SPIRAL_LIGHT);
    const glowColor = new THREE.Color('#ffffff'); 
    
    let idx = 0;
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      
      for (let j = 0; j < particlesPerPoint; j++) {
        // Random offset for volume
        const r = 0.05 + Math.random() * 0.2; 
        
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const x = pt.x + r * Math.sin(phi) * Math.cos(theta);
        const y = pt.y + r * Math.sin(phi) * Math.sin(theta);
        const z = pt.z + r * Math.cos(phi);
        
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        
        // Color variation
        const mix = Math.random() * 0.5; // Mostly gold/spiral color, some white
        const c = baseColor.clone().lerp(glowColor, mix);
        
        // Add some random brightness variation
        const brightness = 0.8 + Math.random() * 0.4;
        colors[idx * 3] = c.r * brightness;
        colors[idx * 3 + 1] = c.g * brightness;
        colors[idx * 3 + 2] = c.b * brightness;

        idx++;
      }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3)); // Use a copy for the attribute
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return { tinselGeo: geo, initialTinselPositions: positions };
  }, [curve]);

  // Generate decorative balls
  const baubles = useMemo(() => {
    const items = [];
    const count = 80; // Reduced count to avoid overlaps
    
    for (let i = 0; i < count; i++) {
      const rawRandom = Math.random();
      const h = Math.pow(rawRandom, 2.0); // Bias towards bottom
      
      const y = (h * TREE_CONFIG.HEIGHT) - (TREE_CONFIG.HEIGHT / 2);
      const maxRadius = TREE_CONFIG.RADIUS_BOTTOM * (1 - h);
      
      // Place slightly deeper inside the tree volume to avoid overlapping with Polaroids
      // Polaroids are floating outside. By keeping these at 80-95% radius, they stay "in" the branches.
      const r = maxRadius * (0.8 + Math.random() * 0.15); 
      
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const isRed = Math.random() > 0.5;
      const scale = Math.random() * 0.15 + 0.15; 

      items.push({
        position: new THREE.Vector3(x, y, z),
        color: isRed ? COLORS.DECORATION_RED : COLORS.DECORATION_GOLD,
        scale: scale,
        rotation: [0, Math.random() * Math.PI * 2, 0] 
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const targetProgress = isExploded ? 1 : 0;
    const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
    explodeProgress.current = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);

    if (lineRef.current) {
        const material = lineRef.current.material as THREE.MeshStandardMaterial;
        // Pulse effect for the "Light" string
        const pulse = (Math.sin(time * 3.0) * 0.3 + 0.7); 
        material.emissiveIntensity = 3.0 * pulse * (1 - explodeProgress.current);
        
        lineRef.current.scale.setScalar(1 - explodeProgress.current);
        lineRef.current.visible = explodeProgress.current < 0.95;
    }

    // Twinkle the fluff slightly by rotating or scaling
    if (pointsRef.current) {
        // Very slow drift to make it feel alive
        pointsRef.current.rotation.y = Math.sin(time * 0.5) * 0.02;

        // Scatter points
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = initialTinselPositions[i];
            const y = initialTinselPositions[i+1];
            const z = initialTinselPositions[i+2];
            
            const dir = new THREE.Vector3(x, y, z).normalize();
            positions[i] = x + dir.x * explodeProgress.current * 15;
            positions[i+1] = y + dir.y * explodeProgress.current * 15;
            positions[i+2] = z + dir.z * explodeProgress.current * 15;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* The Spiral String - Core */}
      <mesh ref={lineRef}>
        <tubeGeometry args={[curve, 500, SPIRAL_CONFIG.THICKNESS * 0.6, 12, false]} />
        <meshStandardMaterial 
          color={COLORS.SPIRAL_LIGHT} 
          emissive={COLORS.SPIRAL_LIGHT}
          emissiveIntensity={3}
          toneMapped={false}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Volumetric Glow Shell */}
      {!isExploded && (
        <mesh>
            <tubeGeometry args={[curve, 500, SPIRAL_CONFIG.THICKNESS * 2.5, 8, false]} />
            <meshBasicMaterial 
                color={COLORS.SPIRAL_LIGHT}
                transparent
                opacity={0.1}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
      )}

      {/* Fluffy Tinsel Particles */}
      <points ref={pointsRef} geometry={tinselGeo}>
         <pointsMaterial 
            map={fluffTexture}
            color="#ffffff"
            vertexColors={true}
            size={0.25}
            sizeAttenuation={true}
            transparent={true}
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            alphaTest={0.01}
         />
      </points>

      {/* Point lights along the spiral path to illuminate tree and photos */}
      {!isExploded && (
        <>
            <pointLight position={[0, 2, 0]} intensity={2} color={COLORS.SPIRAL_LIGHT} distance={10} decay={2} />
            <pointLight position={[0, -2, 0]} intensity={2} color={COLORS.SPIRAL_LIGHT} distance={10} decay={2} />
        </>
      )}

      {/* Decorative Ornaments */}
      {baubles.map((b, i) => {
        const dir = b.position.clone().normalize();
        const exPos = new THREE.Vector3(
            b.position.x + dir.x * explodeProgress.current * 20,
            b.position.y + dir.y * explodeProgress.current * 20,
            b.position.z + dir.z * explodeProgress.current * 20
        );

        return (
            <group key={i} position={exPos} rotation={b.rotation as any} scale={[b.scale, b.scale, b.scale]}>
                <mesh>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshStandardMaterial 
                        color={b.color}
                        emissive={b.color}
                        emissiveIntensity={0.4}
                        metalness={0.9} 
                        roughness={0.1} 
                    />
                </mesh>
                <mesh position={[0, 0.9, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.25, 16]} />
                    <meshStandardMaterial color={COLORS.DECORATION_GOLD} metalness={1} roughness={0.3} />
                </mesh>
            </group>
        );
      })}
    </group>
  );
};

export default SpiralDecor;