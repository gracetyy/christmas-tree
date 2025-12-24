import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, TREE_CONFIG } from '../constants';

interface TreeMeshProps {
  isExploded?: boolean;
}

const TreeMesh: React.FC<TreeMeshProps> = ({ isExploded = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const explodeProgress = useRef(0);

  // Generate particles for the tree body
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < TREE_CONFIG.PARTICLE_COUNT; i++) {
      const rawRandom = Math.random();
      const yNorm = Math.pow(rawRandom, 1.2); // Less bias for fuller top in new config
      
      const y = (yNorm * TREE_CONFIG.HEIGHT) - (TREE_CONFIG.HEIGHT / 2);
      const rMax = TREE_CONFIG.RADIUS_BOTTOM * (1 - yNorm);
      
      const r = Math.sqrt(Math.random()) * rMax;
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const rotX = Math.random() * Math.PI;
      const rotY = Math.random() * Math.PI;
      const rotZ = Math.random() * Math.PI;

      // Explode direction (outwards from center)
      const explodeDir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(10 + Math.random() * 20);

      // Gradient from BOTTOM (#1FAA6A) to TOP (#1cbd62)
      const color = new THREE.Color().lerpColors(
        new THREE.Color(COLORS.TREE_BOTTOM),
        new THREE.Color(COLORS.TREE_TOP),
        yNorm
      );

      temp.push({ 
        position: [x, y, z], 
        rotation: [rotX, rotY, rotZ], 
        scale: Math.random() * 0.5 + 0.5, 
        color,
        explodeDir: [explodeDir.x, explodeDir.y, explodeDir.z]
      });
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Base rotation
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.03;

      // Explode animation
      const targetProgress = isExploded ? 1 : 0;
      const lerpFactor = isExploded ? 0.05 : 0.12; // Faster return
      explodeProgress.current = THREE.MathUtils.lerp(explodeProgress.current, targetProgress, lerpFactor);

      const tempObject = new THREE.Object3D();
      particles.forEach((p, i) => {
        const ex = p.explodeDir as number[];
        const pos = p.position as number[];
        
        tempObject.position.set(
          pos[0] + ex[0] * explodeProgress.current,
          pos[1] + ex[1] * explodeProgress.current,
          pos[2] + ex[2] * explodeProgress.current
        );
        
        tempObject.rotation.set(
          (p.rotation[0] as number) + state.clock.elapsedTime * explodeProgress.current,
          (p.rotation[1] as number) + state.clock.elapsedTime * explodeProgress.current,
          (p.rotation[2] as number)
        );

        const scale = (p.scale as number * TREE_CONFIG.PARTICLE_SIZE) * (1 - explodeProgress.current * 0.5);
        tempObject.scale.set(scale, scale, scale);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const tempObject = new THREE.Object3D();

    particles.forEach((p, i) => {
      tempObject.position.set(p.position[0] as number, p.position[1] as number, p.position[2] as number);
      tempObject.rotation.set(p.rotation[0] as number, p.rotation[1] as number, p.rotation[2] as number);
      const scale = p.scale as number * TREE_CONFIG.PARTICLE_SIZE;
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      meshRef.current!.setColorAt(i, p.color as THREE.Color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [particles]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, TREE_CONFIG.PARTICLE_COUNT]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
};

export default TreeMesh;