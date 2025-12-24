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
  const baubleMeshRef = useRef<THREE.InstancedMesh>(null);
  const baubleCapMeshRef = useRef<THREE.InstancedMesh>(null);
  const explodeProgress = useRef(0);
  
  const uniforms = useRef({
    uTime: { value: 0 },
    uExplodeProgress: { value: 0 },
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
  const { tinselGeo } = useMemo(() => {
    const curvePoints = curve.getSpacedPoints(800); 
    const particlesPerPoint = 8; 
    const totalParticles = curvePoints.length * particlesPerPoint;
    
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const progress = new Float32Array(totalParticles);
    const explodeDirs = new Float32Array(totalParticles * 3);
    
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

        const dir = new THREE.Vector3(x, y, z).normalize();
        explodeDirs[idx * 3] = dir.x * 15.0;
        explodeDirs[idx * 3 + 1] = dir.y * 15.0;
        explodeDirs[idx * 3 + 2] = dir.z * 15.0;
        
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
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('progress', new THREE.BufferAttribute(progress, 1));
    geo.setAttribute('explodeDir', new THREE.BufferAttribute(explodeDirs, 3));
    
    return { tinselGeo: geo };
  }, [curve]);

  // Generate decorative balls
  const baubles = useMemo(() => {
    const items = [];
    const count = 100; // Increased count for fuller bottom
    const photoCenters = photos.map(p => new THREE.Vector3(p.position[0], p.position[1], p.position[2]));
    
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;
      let attempts = 0;
      let collides = true;
      const BAUBLE_COLLISION_RADIUS = 0.8; // Increased to avoid polaroids better

      while (collides && attempts < 30) {
        const rawRandom = Math.random();
        // Bias more towards bottom (higher power) and cap height to avoid star position
        const h = Math.pow(rawRandom, 2.2) * 0.85; 
        
        y = (h * TREE_CONFIG.HEIGHT) - (TREE_CONFIG.HEIGHT / 2);
        const maxRadius = TREE_CONFIG.RADIUS_BOTTOM * (1 - h);
        
        // Place outside the tree mesh to ensure they are visible and don't clip with branches
        const r = maxRadius * (1.1 + Math.random() * 0.15); 
        
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
          // Polaroids are roughly 1.5 units tall, so we need a larger vertical check or just a larger radius
          if (distSq < 1.8) { // Increased collision distance
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
    const lerpFactor = isExploded ? 0.05 : 0.12;
    const nextProgress = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);
    
    const isTransitioning = Math.abs(nextProgress - explodeProgress.current) > 0.0001;
    const needsUpdate = isTransitioning || isExploded || (explodeProgress.current > 0.001);
    
    explodeProgress.current = nextProgress;
    uniforms.uExplodeProgress.value = nextProgress;

    if (lineRef.current) {
        const material = lineRef.current.material as THREE.MeshStandardMaterial;
        const pulse = (Math.sin(time * 3.0) * 0.3 + 0.7); 
        material.emissiveIntensity = 3.0 * pulse * (1 - explodeProgress.current);
        lineRef.current.scale.setScalar(1 - explodeProgress.current);
        lineRef.current.visible = explodeProgress.current < 0.95;
    }

    if (pointsRef.current) {
        pointsRef.current.rotation.y = Math.sin(time * 0.5) * 0.02;
    }

    if (needsUpdate && baubleMeshRef.current && baubleCapMeshRef.current) {
        const tempObject = new THREE.Object3D();
        const tempCapObject = new THREE.Object3D();
        
        baubles.forEach((b, i) => {
            const dir = b.position.clone().normalize();
            const seed = Math.sin(b.position.x * 12.9898 + b.position.y * 78.233) * 43758.5453;
            const floatTime = time * 0.4 + seed;
            const drift = new THREE.Vector3(
                Math.sin(floatTime) * 0.3,
                Math.cos(floatTime * 0.7) * 0.3,
                Math.sin(floatTime * 0.5) * 0.3
            ).multiplyScalar(explodeProgress.current);

            const baublePos = new THREE.Vector3(
                b.position.x + dir.x * explodeProgress.current * 20 + drift.x,
                b.position.y + dir.y * explodeProgress.current * 20 + drift.y,
                b.position.z + dir.z * explodeProgress.current * 20 + drift.z
            );

            tempObject.position.copy(baublePos);
            tempObject.rotation.set(
                b.rotation[0] + (Math.sin(floatTime * 0.2) * 0.2 * explodeProgress.current),
                b.rotation[1] + (Math.cos(floatTime * 0.3) * 0.2 * explodeProgress.current),
                b.rotation[2]
            );
            tempObject.scale.setScalar(b.scale);
            tempObject.updateMatrix();
            baubleMeshRef.current!.setMatrixAt(i, tempObject.matrix);
            baubleMeshRef.current!.setColorAt(i, new THREE.Color(b.color));

            tempCapObject.position.copy(baublePos).add(new THREE.Vector3(0, 0.9 * b.scale, 0));
            tempCapObject.rotation.copy(tempObject.rotation);
            tempCapObject.scale.setScalar(b.scale);
            tempCapObject.updateMatrix();
            baubleCapMeshRef.current!.setMatrixAt(i, tempCapObject.matrix);
        });
        baubleMeshRef.current.instanceMatrix.needsUpdate = true;
        if (baubleMeshRef.current.instanceColor) baubleMeshRef.current.instanceColor.needsUpdate = true;
        baubleCapMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update baubles with floating motion
    if (baubleMeshRef.current) {
        const tempObject = new THREE.Object3D();
        baubles.forEach((b, i) => {
            const dir = b.position.clone().normalize();
            
            // Floating motion in explode mode
            const seed = Math.sin(b.position.x * 12.9898 + b.position.y * 78.233) * 43758.5453;
            const floatTime = time * 0.4 + seed;
            const drift = new THREE.Vector3(
                Math.sin(floatTime) * 0.3,
                Math.cos(floatTime * 0.7) * 0.3,
                Math.sin(floatTime * 0.5) * 0.3
            ).multiplyScalar(explodeProgress.current);

            const baublePos = new THREE.Vector3(
                b.position.x + dir.x * explodeProgress.current * 20 + drift.x,
                b.position.y + dir.y * explodeProgress.current * 20 + drift.y,
                b.position.z + dir.z * explodeProgress.current * 20 + drift.z
            );

            tempObject.position.copy(baublePos);
            tempObject.rotation.set(
                b.rotation[0] + (Math.sin(floatTime * 0.2) * 0.2 * explodeProgress.current),
                b.rotation[1] + (Math.cos(floatTime * 0.3) * 0.2 * explodeProgress.current),
                b.rotation[2]
            );
            tempObject.scale.setScalar(b.scale);
            tempObject.updateMatrix();
            baubleMeshRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        baubleMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Initialize matrices for baubles
  React.useLayoutEffect(() => {
    if (baubleMeshRef.current && baubleCapMeshRef.current) {
      const tempObject = new THREE.Object3D();
      const tempCapObject = new THREE.Object3D();
      
      baubles.forEach((b, i) => {
        tempObject.position.copy(b.position);
        tempObject.rotation.set(b.rotation[0], b.rotation[1], b.rotation[2]);
        tempObject.scale.setScalar(b.scale);
        tempObject.updateMatrix();
        baubleMeshRef.current!.setMatrixAt(i, tempObject.matrix);
        baubleMeshRef.current!.setColorAt(i, new THREE.Color(b.color));

        tempCapObject.position.copy(b.position).add(new THREE.Vector3(0, 0.9 * b.scale, 0));
        tempCapObject.rotation.set(b.rotation[0], b.rotation[1], b.rotation[2]);
        tempCapObject.scale.setScalar(b.scale);
        tempCapObject.updateMatrix();
        baubleCapMeshRef.current!.setMatrixAt(i, tempCapObject.matrix);
      });
      
      baubleMeshRef.current.instanceMatrix.needsUpdate = true;
      if (baubleMeshRef.current.instanceColor) baubleMeshRef.current.instanceColor.needsUpdate = true;
      baubleCapMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [baubles]);


  return (
    <group>
      {/* The Spiral String - Core */}
      <mesh ref={lineRef}>
        <tubeGeometry args={[curve, 300, SPIRAL_CONFIG.THICKNESS * 0.6, 8, false]} />
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
              float chase = sin(vUv.x * 15.0 - uTime * 3.0) * 0.5 + 0.5;
              totalEmissiveRadiance *= (0.4 + 0.6 * chase);
              `
            );
          }}
        />
      </mesh>

      {/* Volumetric Glow Shell */}
      {!isExploded && (
        <mesh>
            <tubeGeometry args={[curve, 200, SPIRAL_CONFIG.THICKNESS * 2.5, 6, false]} />
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
                    float chase = sin(vUv.x * 15.0 - uTime * 3.0) * 0.5 + 0.5;
                    diffuseColor.a *= (0.3 + 0.7 * chase);
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
            toneMapped={false}
            onBeforeCompile={(shader) => {
              shader.uniforms.uTime = uniforms.uTime;
              shader.uniforms.uExplodeProgress = uniforms.uExplodeProgress;
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float progress;
                attribute vec3 explodeDir;
                uniform float uExplodeProgress;
                varying float vProgress;`
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vProgress = progress;
                transformed += explodeDir * uExplodeProgress;
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
                // Simplified chase effect for performance
                float chase = sin(vProgress * 10.0 - uTime * 3.0) * 0.5 + 0.5;
                diffuseColor.rgb *= (0.2 + 0.8 * chase);
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

      {/* Decorative Ornaments - Instanced */}
      <instancedMesh ref={baubleMeshRef} args={[undefined, undefined, baubles.length]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial 
          metalness={0.9} 
          roughness={0.1} 
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </instancedMesh>
      
      <instancedMesh ref={baubleCapMeshRef} args={[undefined, undefined, baubles.length]}>
        <cylinderGeometry args={[0.2, 0.2, 0.25, 12]} />
        <meshStandardMaterial color={COLORS.DECORATION_GOLD} metalness={1} roughness={0.3} />
      </instancedMesh>
    </group>
  );
};

export default SpiralDecor;