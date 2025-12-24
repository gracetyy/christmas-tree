import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, TREE_CONFIG } from '../constants';
import { PhotoData } from '../types';

const getLeafTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Fill with white so vertex colors show through perfectly
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Dark green for veins with lower opacity
    ctx.strokeStyle = 'rgba(15, 120, 50, 0.35)'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const centerX = 128;
    const centerY = 128;
    const size = 220; // ~85% of 256

    // Central vein - from top to bottom
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size/2);
    ctx.lineTo(centerX, centerY + size/2);
    ctx.stroke();

    // Side veins - pointing downwards (towards the base)
    ctx.lineWidth = 4;
    const numVeins = 5;
    for (let i = 0; i < numVeins; i++) {
      const y = (centerY - size/2 + 30) + i * (size / (numVeins + 1));
      const spread = 60 + i * 10;
      const drop = 35;
      // Left
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX - spread, y + drop);
      ctx.stroke();
      // Right
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX + spread, y + drop);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

interface TreeMeshProps {
  isExploded?: boolean;
  photos?: PhotoData[];
}

const TreeMesh: React.FC<TreeMeshProps> = ({ isExploded = false, photos = [] }) => {
  const innerMeshRef = useRef<THREE.InstancedMesh>(null);
  const outerMeshRef = useRef<THREE.InstancedMesh>(null);
  const explodeProgress = useRef(0);

  const leafTexture = useMemo(() => getLeafTexture(), []);

  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Define a stylized leaf shape (pointy at both ends, wider in the middle)
    shape.moveTo(0, 1.6); // Top tip
    shape.bezierCurveTo(0.8, 0.8, 0.8, -0.4, 0, -1.2); // Right side
    shape.bezierCurveTo(-0.8, -0.4, -0.8, 0.8, 0, 1.6); // Left side

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.05,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();

    // Normalize UVs for the front/back faces to fit the texture perfectly
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const min = new THREE.Vector2(Infinity, Infinity);
    const max = new THREE.Vector2(-Infinity, -Infinity);

    for (let i = 0; i < pos.count; i++) {
      min.x = Math.min(min.x, pos.getX(i));
      min.y = Math.min(min.y, pos.getY(i));
      max.x = Math.max(max.x, pos.getX(i));
      max.y = Math.max(max.y, pos.getY(i));
    }

    const range = new THREE.Vector2().subVectors(max, min);
    for (let i = 0; i < uv.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Map X/Y positions to 0-1 UV range
      uv.setXY(i, (x - min.x) / range.x, (y - min.y) / range.y);
    }
    uv.needsUpdate = true;

    return geo;
  }, []);

  // Generate particles for the tree body
  const { innerParticles, outerParticles } = useMemo(() => {
    const inner = [];
    const outer = [];
    const photoCenters = photos.map(p => new THREE.Vector3(p.position[0], p.position[1] - 1.25, p.position[2]));

    for (let i = 0; i < TREE_CONFIG.PARTICLE_COUNT; i++) {
      let x = 0, y = 0, z = 0, yNorm = 0, r = 0, rMax = 0;
      let attempts = 0;
      let collides = true;

      while (collides && attempts < 10) {
        const rawRandom = Math.random();
        // Higher exponent (1.5) biases more particles towards the bottom (yNorm near 0)
        yNorm = Math.pow(rawRandom, 1.5);
        
        y = (yNorm * TREE_CONFIG.HEIGHT) - (TREE_CONFIG.HEIGHT / 2);
        rMax = TREE_CONFIG.RADIUS_BOTTOM * (1 - yNorm);
        
        r = Math.sqrt(Math.random()) * rMax;
        const theta = Math.random() * Math.PI * 2;
        
        x = r * Math.cos(theta);
        z = r * Math.sin(theta);

        collides = false;
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
        attempts++;
      }

      if (collides) continue;
      
      // Determine if it's an outer particle (heart) or inner (simple shape)
      // Thicker heart layer at the bottom (up to 25% of radius) tapering to 15% at the top
      const outerThreshold = 0.85 - (1 - yNorm) * 0.1;
      const isOuter = r > rMax * outerThreshold;

      // Calculate orientation
      const posVec = new THREE.Vector3(x, y, z);
      const apex = new THREE.Vector3(0, TREE_CONFIG.HEIGHT / 2, 0);
      const tangent = new THREE.Vector3().subVectors(apex, posVec).normalize();
      const horizontalTangent = new THREE.Vector3(-z, 0, x).normalize();
      const normal = new THREE.Vector3().crossVectors(horizontalTangent, tangent).normalize();

      const matrix = new THREE.Matrix4().makeBasis(horizontalTangent, tangent, normal);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);

      // Random wobble to make it look "raw" and natural
      // Randomness decreases as we go up the tree (yNorm: 0 at bottom, 1 at top)
      const wobbleFactor = 0.6 * (1 - yNorm * 0.85);
      const wobble = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          (Math.random() * 1.2 - 0.1) * wobbleFactor,
          (Math.random() - 0.5) * wobbleFactor,
          (Math.random() - 0.5) * wobbleFactor
        )
      );
      quaternion.multiply(wobble);

            const explodeDir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(10 + Math.random() * 20);
      const color = new THREE.Color().lerpColors(
        new THREE.Color(COLORS.TREE_BOTTOM),
        new THREE.Color(COLORS.TREE_TOP),
        yNorm
      );

      // Add random color variation for leaf particles
      if (isOuter) {
        const hueShift = (Math.random() - 0.5) * 0.05;
        const saturationShift = (Math.random() - 0.5) * 0.1;
        const lightnessShift = (Math.random() - 0.5) * 0.1;
        
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        color.setHSL(
          THREE.MathUtils.clamp(hsl.h + hueShift, 0, 1),
          THREE.MathUtils.clamp(hsl.s + saturationShift, 0, 1),
          THREE.MathUtils.clamp(hsl.l + lightnessShift, 0, 1)
        );
      }

      const heightScale = 1.0 - (yNorm * 0.4);
      const particleData = { 
        position: [x, y, z], 
        quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w], 
        scale: (Math.random() * 0.5 + 0.5) * heightScale ** 2, 
        thickness: 0.2 + Math.random() * 0.05, // Thinner leaves
        color,
        explodeDir: [explodeDir.x, explodeDir.y, explodeDir.z]
      };

      if (isOuter) {
        outer.push(particleData);
      } else {
        inner.push(particleData);
      }
    }
    return { innerParticles: inner, outerParticles: outer };
  }, [photos]);

  useFrame((state, delta) => {
    const updateMesh = (mesh: THREE.InstancedMesh | null, particles: any[]) => {
      if (!mesh) return;
      
      // Base rotation
      mesh.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.03;

      const targetProgress = isExploded ? 1 : 0;
      const lerpFactor = isExploded ? 0.05 : 0.12;
      explodeProgress.current = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);

      const tempObject = new THREE.Object3D();
      const tempQuat = new THREE.Quaternion();

      particles.forEach((p, i) => {
        const ex = p.explodeDir as number[];
        const pos = p.position as number[];
        const q = p.quaternion as number[];
        
        tempObject.position.set(
          pos[0] + ex[0] * explodeProgress.current,
          pos[1] + ex[1] * explodeProgress.current,
          pos[2] + ex[2] * explodeProgress.current
        );
        
        tempQuat.set(q[0], q[1], q[2], q[3]);
        if (isExploded) {
          const extraRot = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              state.clock.elapsedTime * explodeProgress.current,
              state.clock.elapsedTime * explodeProgress.current,
              0
            )
          );
          tempQuat.multiply(extraRot);
        }
        tempObject.quaternion.copy(tempQuat);

        const baseScale = p.scale as number * TREE_CONFIG.PARTICLE_SIZE;
        // Make outer hearts 1.5x larger than inner particles
        const isOuterParticle = particles === outerParticles;
        const scale = (baseScale * (isOuterParticle ? 1.5 : 1.0)) * (1 - explodeProgress.current * 0.5);
        const thickness = (p.thickness || 1.0) * scale;
        
        tempObject.scale.set(scale, scale, thickness);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    updateMesh(innerMeshRef.current, innerParticles);
    updateMesh(outerMeshRef.current, outerParticles);
  });

  useLayoutEffect(() => {
    const setupMesh = (mesh: THREE.InstancedMesh | null, particles: any[]) => {
      if (!mesh) return;
      const tempObject = new THREE.Object3D();

      particles.forEach((p, i) => {
        tempObject.position.set(p.position[0] as number, p.position[1] as number, p.position[2] as number);
        const q = p.quaternion as number[];
        tempObject.quaternion.set(q[0], q[1], q[2], q[3]);
        
        const baseScale = p.scale as number * TREE_CONFIG.PARTICLE_SIZE;
        const isOuterParticle = particles === outerParticles;
        const scale = baseScale * (isOuterParticle ? 1.5 : 1.0);
        const thickness = (p.thickness || 1.0) * scale;
        
        tempObject.scale.set(scale, scale, thickness);
        tempObject.updateMatrix();
        
        mesh.setMatrixAt(i, tempObject.matrix);
        mesh.setColorAt(i, p.color as THREE.Color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    setupMesh(innerMeshRef.current, innerParticles);
    setupMesh(outerMeshRef.current, outerParticles);
  }, [innerParticles, outerParticles]);

  return (
    <group>
      {/* Inner filling with simple shapes */}
      <instancedMesh ref={innerMeshRef} args={[undefined, undefined, innerParticles.length]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} />
      </instancedMesh>

      {/* Outer layers with leaf shapes */}
      <instancedMesh ref={outerMeshRef} args={[leafGeometry, undefined, outerParticles.length]}>
        <meshStandardMaterial 
          map={leafTexture}
          roughness={0.5} 
          metalness={0.9}
          emissive={new THREE.Color(0x051005)}
          emissiveIntensity={0.5}
        />
      </instancedMesh>
    </group>
  );
};

export default TreeMesh;