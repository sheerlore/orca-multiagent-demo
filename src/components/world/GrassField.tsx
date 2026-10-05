import { useMemo } from 'react';
import { GRASS_BOUNDS, SCENE_COLORS } from '../../constants/scene';

interface DecorationProps {
  position: [number, number, number];
  color?: string;
  scale?: number;
  rotation?: number;
}

function GrassTuft({ position, scale = 1, rotation = 0 }: DecorationProps) {
  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, rotation, 0]}>
      {/* 3本の小さな草の葉 */}
      <mesh position={[-0.08, 0.12, 0]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
        <coneGeometry args={[0.06, 0.25, 4]} />
        <meshStandardMaterial color={SCENE_COLORS.grassMintDark} roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.14, 0.04]} rotation={[0, 0, -0.22]} castShadow receiveShadow>
        <coneGeometry args={[0.05, 0.28, 4]} />
        <meshStandardMaterial color={SCENE_COLORS.grassMintDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.16, -0.06]} rotation={[0.2, 0, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.06, 0.32, 4]} />
        <meshStandardMaterial color={SCENE_COLORS.grassMint} roughness={0.7} />
      </mesh>
    </group>
  );
}

function PastelFlower({ position, color = SCENE_COLORS.flowerPink, scale = 1 }: DecorationProps) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* 茎 */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 4]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>
      {/* 花弁 */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* 花芯 */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshStandardMaterial color="#fef08a" roughness={0.3} />
      </mesh>
    </group>
  );
}

function LowPolyTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* 木の幹 */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.25, 1.0, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* 葉の層 (下段) */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.9, 1.1, 7]} />
        <meshStandardMaterial color="#34d399" roughness={0.8} />
      </mesh>
      {/* 葉の層 (上段) */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.65, 1.0, 7]} />
        <meshStandardMaterial color="#6ee7b7" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function GrassField() {
  const width = GRASS_BOUNDS.maxX - GRASS_BOUNDS.minX; // 15
  const depth = GRASS_BOUNDS.maxZ - GRASS_BOUNDS.minZ; // 20
  const centerX = (GRASS_BOUNDS.minX + GRASS_BOUNDS.maxX) / 2; // -4.5
  const centerZ = (GRASS_BOUNDS.minZ + GRASS_BOUNDS.maxZ) / 2; // 0

  // 装飾配置データ (決定論的配置)
  const grassTufts = useMemo(
    () => [
      { pos: [-10, 0, -6] as [number, number, number], rot: 0.3, scale: 1.1 },
      { pos: [-8, 0, 4] as [number, number, number], rot: 1.2, scale: 0.9 },
      { pos: [-6, 0, -8] as [number, number, number], rot: 2.1, scale: 1.0 },
      { pos: [-3, 0, 7] as [number, number, number], rot: 0.8, scale: 1.2 },
      { pos: [-1, 0, -5] as [number, number, number], rot: 1.5, scale: 0.85 },
      { pos: [1, 0, 6] as [number, number, number], rot: 2.7, scale: 1.0 },
      { pos: [-7, 0, 0] as [number, number, number], rot: 0.5, scale: 0.95 },
      { pos: [-4, 0, -3] as [number, number, number], rot: 1.9, scale: 1.15 },
    ],
    []
  );

  const flowers = useMemo(
    () => [
      {
        pos: [-9.5, 0, -4.5] as [number, number, number],
        color: SCENE_COLORS.flowerPink,
        scale: 1.1,
      },
      {
        pos: [-7.5, 0, 6] as [number, number, number],
        color: SCENE_COLORS.flowerYellow,
        scale: 1.0,
      },
      { pos: [-5, 0, 2] as [number, number, number], color: SCENE_COLORS.flowerWhite, scale: 0.9 },
      { pos: [-2, 0, -7] as [number, number, number], color: SCENE_COLORS.flowerPink, scale: 1.0 },
      {
        pos: [0.5, 0, 4] as [number, number, number],
        color: SCENE_COLORS.flowerYellow,
        scale: 1.2,
      },
      {
        pos: [-3.5, 0, 8.5] as [number, number, number],
        color: SCENE_COLORS.flowerWhite,
        scale: 1.1,
      },
    ],
    []
  );

  const trees = useMemo(
    () => [
      { pos: [-10.5, 0, -8] as [number, number, number], scale: 1.2 },
      { pos: [-11, 0, 7.5] as [number, number, number], scale: 1.1 },
      { pos: [-6, 0, -8.5] as [number, number, number], scale: 0.95 },
      { pos: [-8, 0, 8.5] as [number, number, number], scale: 1.05 },
    ],
    []
  );

  return (
    <group name="grass-field">
      {/* メイン草原グラウンド (パステル調ミントグリーン) */}
      <mesh
        position={[centerX, -0.15, centerZ]}
        receiveShadow
        castShadow
        data-testid="grass-ground-mesh"
      >
        <boxGeometry args={[width, 0.3, depth]} />
        <meshStandardMaterial color={SCENE_COLORS.grassMint} roughness={0.78} metalness={0.05} />
      </mesh>

      {/* 草原エリアの土台・土層 */}
      <mesh position={[centerX, -0.32, centerZ]} receiveShadow>
        <boxGeometry args={[width - 0.05, 0.1, depth - 0.05]} />
        <meshStandardMaterial color={SCENE_COLORS.grassSoil} roughness={0.9} />
      </mesh>

      {/* 柔らかなグリッド装飾 (淡いミントグリーンの格子模様) */}
      <gridHelper
        args={[Math.min(width, depth), 10, SCENE_COLORS.grassGrid, SCENE_COLORS.grassGrid]}
        position={[centerX, 0.005, centerZ]}
        rotation={[0, 0, 0]}
      />

      {/* 草の茂みデコレーション */}
      {grassTufts.map((tuft, i) => (
        <GrassTuft key={`tuft-${i}`} position={tuft.pos} rotation={tuft.rot} scale={tuft.scale} />
      ))}

      {/* パステルカラーの草花 */}
      {flowers.map((flw, i) => (
        <PastelFlower key={`flower-${i}`} position={flw.pos} color={flw.color} scale={flw.scale} />
      ))}

      {/* 周辺のミニチュア低ポリゴン樹木 */}
      {trees.map((tree, i) => (
        <LowPolyTree key={`tree-${i}`} position={tree.pos} scale={tree.scale} />
      ))}
    </group>
  );
}
