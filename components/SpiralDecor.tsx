import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, SPIRAL_CONFIG, TREE_CONFIG } from '../constants';
import { getSpiralPoint } from '../utils/math';
import { PhotoData } from '../types';

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
  photos?: PhotoData[];
}

const SpiralDecor: React.FC<SpiralDecorProps> = ({ isExploded = false, photos = [] }) => {
  const lineRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const explodeProgress = useRef(0);
  
  const uniforms = useRef({
    uTime: { value: 0 },
  }).current;

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
    const progress = new Float32Array(totalParticles);
    
    const baseColor = new THREE.Color(COLORS.SPIRAL_LIGHT);
    const glowColor = new THREE.Color('#ffffff'); 
    
    let idx = 0;
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      const p = i / (curvePoints.length - 1);
      
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

        progress[idx] = p;
        idx++;
      }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3)); // Use a copy for the attribute
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('progress', new THREE.BufferAttribute(progress, 1));
    
    return { tinselGeo: geo, initialTinselPositions: positions };
  }, [curve]);

  // Generate decorative balls
  const baubles = useMemo(() => {
    const items = [];
    const count = 100; // Increased count for fuller bottom
    const photoCenters = photos.map(p => new THREE.Vector3(p.position[0], p.position[1] - 1.25, p.position[2]));
    
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;
      let attempts = 0;
      let collides = true;
      const BAUBLE_COLLISION_RADIUS = 0.4;

      while (collides && attempts < 20) {
        const rawRandom = Math.random();
        // Bias more towards bottom (higher power) and cap height to avoid star position
        const h = Math.pow(rawRandom, 2.2) * 0.85; 
        
        y = (h * TREE_CONFIG.HEIGHT) - (TREE_CONFIG.HEIGHT / 2);
        const maxRadius = TREE_CONFIG.RADIUS_BOTTOM * (1 - h);
        
        // Place outside the tree mesh to ensure they are visible and don't clip with branches
        const r = maxRadius * (1.05 + Math.random() * 0.1); 
        
        const theta = Math.random() * Math.PI * 2;
        x = r * Math.cos(theta);
        z = r * Math.sin(theta);

        collides = false;
        
        // Check collision with photos
        for (const center of photoCenters) {
          const dx = x - center.x;
          const dy = y - center.y;
          const dz = z - center.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          if (distSq < TREE_CONFIG.COLLISION_RADIUS ** 2) {
            collides = true;
            break;
          }
        }

        if (collides) { attempts++; continue; }

        // Check collision with other baubles
        for (const item of items) {
          const dx = x - item.position.x;
          const dy = y - item.position.y;
          const dz = z - item.position.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          if (distSq < BAUBLE_COLLISION_RADIUS ** 2) {
            collides = true;
            break;
          }
        }
        attempts++;
      }

      if (collides) continue;
      
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
  }, [photos]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    uniforms.uTime.value = time;
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
          onBeforeCompile={(shader) => {
            shader.uniforms.uTime = uniforms.uTime;
            shader.vertexShader = shader.vertexShader.replace(
              '#include <uv_pars_vertex>',
              '#define USE_UV\n#include <uv_pars_vertex>'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <uv_pars_fragment>',
              '#define USE_UV\n#include <uv_pars_fragment>'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              '#include <common>\nuniform float uTime;'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float chase = sin(vUv.x * 20.0 - uTime * 4.0) * 0.5 + 0.5;
              totalEmissiveRadiance *= (0.2 + 0.8 * chase);
              `
            );
          }}
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
                onBeforeCompile={(shader) => {
                  shader.uniforms.uTime = uniforms.uTime;
                  shader.vertexShader = shader.vertexShader.replace(
                    '#include <uv_pars_vertex>',
                    '#define USE_UV\n#include <uv_pars_vertex>'
                  );
                  shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <uv_pars_fragment>',
                    '#define USE_UV\n#include <uv_pars_fragment>'
                  );
                  shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    '#include <common>\nuniform float uTime;'
                  );
                  shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <color_fragment>',
                    `
                    #include <color_fragment>
                    float chase = sin(vUv.x * 20.0 - uTime * 4.0) * 0.5 + 0.5;
                    diffuseColor.a *= (0.1 + 0.9 * chase);
                    `
                  );
                }}
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
            onBeforeCompile={(shader) => {
              shader.uniforms.uTime = uniforms.uTime;
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float progress;
                varying float vProgress;`
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vProgress = progress;
                `
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uTime;
                varying float vProgress;`
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                // Sharper, higher contrast chase effect
                float chase = pow(sin(vProgress * 15.0 - uTime * 5.0) * 0.5 + 0.5, 2.0);
                diffuseColor.rgb *= (0.05 + 0.95 * chase);
                `
              );
            }}
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