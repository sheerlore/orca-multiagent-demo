import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { POND_BOUNDS, SCENE_COLORS } from '../../constants/scene';

function LilyPad({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, rotation]} scale={[scale, scale, scale]}>
      {/* スリット付きスイレンの葉 */}
      <mesh receiveShadow>
        <circleGeometry args={[0.35, 16, 0, Math.PI * 1.8]} />
        <meshStandardMaterial color={SCENE_COLORS.pondLily} roughness={0.6} />
      </mesh>
    </group>
  );
}

function WaterLilyFlower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 葉 */}
      <LilyPad position={[0, 0, 0]} scale={1.2} />
      {/* スイレンの花弁 */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <coneGeometry args={[0.16, 0.22, 6]} />
        <meshStandardMaterial color="#f472b6" roughness={0.4} />
      </mesh>
      {/* 花芯 */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#fde047" roughness={0.3} />
      </mesh>
    </group>
  );
}

function AnimatedRipple({
  center,
  initialPhase,
}: {
  center: [number, number, number];
  initialPhase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * 1.2 + initialPhase;
    // 0 から 1 に向かって広がりフェードアウトする同心円波紋
    const progress = (t % 3) / 3;
    const scale = 0.4 + progress * 1.4;
    meshRef.current.scale.set(scale, scale, 1);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    if (material) {
      material.opacity = Math.max(0, (1 - progress) * 0.35);
    }
  });

  return (
    <mesh ref={meshRef} position={[center[0], -0.045, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.38, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

export function PondField() {
  const width = POND_BOUNDS.maxX - POND_BOUNDS.minX; // 7
  const depth = POND_BOUNDS.maxZ - POND_BOUNDS.minZ; // 16
  const centerX = (POND_BOUNDS.minX + POND_BOUNDS.maxX) / 2; // 8.5
  const centerZ = (POND_BOUNDS.minZ + POND_BOUNDS.maxZ) / 2; // 0

  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!waterRef.current) return;
    // 柔らかな水面の微細な波打ち演出
    const t = state.clock.getElapsedTime();
    waterRef.current.position.y = -0.06 + Math.sin(t * 1.8) * 0.015;
  });

  return (
    <group name="pond-field">
      {/* 砂浜・岸辺のフチ (池を取り囲む浅瀬リム) */}
      <mesh position={[centerX, -0.16, centerZ]} receiveShadow>
        <boxGeometry args={[width + 0.7, 0.28, depth + 0.7]} />
        <meshStandardMaterial color={SCENE_COLORS.pondSand} roughness={0.9} />
      </mesh>

      {/* 池の深底ベース */}
      <mesh position={[centerX, -0.3, centerZ]} receiveShadow>
        <boxGeometry args={[width - 0.2, 0.1, depth - 0.2]} />
        <meshStandardMaterial color={SCENE_COLORS.pondWaterDeep} roughness={0.95} />
      </mesh>

      {/* 半透明スカイブルーの水面メッシュ */}
      <mesh
        ref={waterRef}
        position={[centerX, -0.06, centerZ]}
        receiveShadow
        data-testid="pond-water-mesh"
      >
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial
          color={SCENE_COLORS.pondWater}
          roughness={0.08}
          metalness={0.15}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* アニメーション波紋リング */}
      <AnimatedRipple center={[7.5, 0, -2.5]} initialPhase={0} />
      <AnimatedRipple center={[9.5, 0, 3.0]} initialPhase={1.5} />
      <AnimatedRipple center={[8.0, 0, 5.2]} initialPhase={2.4} />

      {/* 水面に浮かぶスイレンの葉と花 */}
      <LilyPad position={[6.8, -0.04, -4.5]} rotation={0.8} scale={1.1} />
      <LilyPad position={[10.2, -0.04, -2.0]} rotation={2.1} scale={0.9} />
      <WaterLilyFlower position={[8.8, -0.04, 1.2]} />
      <LilyPad position={[7.2, -0.04, 3.8]} rotation={1.4} scale={1.0} />
      <LilyPad position={[9.8, -0.04, 5.5]} rotation={3.0} scale={0.85} />
    </group>
  );
}
