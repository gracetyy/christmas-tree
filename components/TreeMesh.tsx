import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, TREE_CONFIG } from '../constants';
import { PhotoData } from '../types';

interface TreeMeshProps {
  isExploded?: boolean;
  photos?: PhotoData[];
}

const TreeMesh: React.FC<TreeMeshProps> = ({ isExploded = false, photos = [] }) => {
  const innerMeshRef = useRef<THREE.InstancedMesh>(null);
  const outerMeshRef = useRef<THREE.InstancedMesh>(null);
  const explodeProgress = useRef(0);

  const heartGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Define a more elongated, pointy heart shape where the tip is at the top
    // Increased base dimensions for larger hearts
    shape.moveTo(0, 1.5);
    shape.bezierCurveTo(0.4, 0.6, 0.9, 0.4, 0.9, -0.1);
    shape.bezierCurveTo(0.9, -0.7, 0.4, -1.1, 0, -0.6);
    shape.bezierCurveTo(-0.4, -1.1, -0.9, -0.7, -0.9, -0.1);
    shape.bezierCurveTo(-0.9, 0.4, -0.4, 0.6, 0, 1.5);

    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
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
          (Math.random() - 0.5) * wobbleFactor,
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

      // Scale decreases as we go up the tree (yNorm: 0 at bottom, 1 at top)
      const heightScale = 1.0 - (yNorm * 0.4);
      const particleData = { 
        position: [x, y, z], 
        quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w], 
        scale: (Math.random() * 0.5 + 0.5) * heightScale, 
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
        
        tempObject.scale.set(scale, scale, scale);
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
        
        tempObject.scale.set(scale, scale, scale);
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

      {/* Outer layers with heart shapes */}
      <instancedMesh ref={outerMeshRef} args={[heartGeometry, undefined, outerParticles.length]}>
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>
    </group>
  );
};

export default TreeMesh;