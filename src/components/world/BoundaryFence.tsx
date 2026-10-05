import { BOUNDARY_FENCE_X, SCENE_COLORS } from '../../constants/scene';

interface FencePostProps {
  x: number;
  z: number;
  height?: number;
}

function FencePost({ x, z, height = 0.7 }: FencePostProps) {
  return (
    <group position={[x, height / 2, z]}>
      {/* 柱 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.16, height, 0.16]} />
        <meshStandardMaterial color={SCENE_COLORS.woodFence} roughness={0.8} />
      </mesh>
      {/* 柱の頂部キャップ */}
      <mesh position={[0, height / 2 + 0.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.13, 0.1, 4]} />
        <meshStandardMaterial color="#92400e" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FenceRail({ x, zStart, zEnd, y }: { x: number; zStart: number; zEnd: number; y: number }) {
  const length = Math.abs(zEnd - zStart);
  const centerZ = (zStart + zEnd) / 2;

  return (
    <mesh position={[x, y, centerZ]} castShadow receiveShadow>
      <boxGeometry args={[0.08, 0.08, length]} />
      <meshStandardMaterial color={SCENE_COLORS.woodFence} roughness={0.85} />
    </mesh>
  );
}

function SteppingStone({
  position,
  scale = 1,
  rotation = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={[0, rotation, 0]}
      scale={[scale * 1.1, 1, scale * 0.9]}
      receiveShadow
      castShadow
    >
      <cylinderGeometry args={[0.35, 0.42, 0.08, 7]} />
      <meshStandardMaterial color={SCENE_COLORS.steppingStone} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

function SmallPebble({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <mesh position={position} scale={[scale, scale * 0.7, scale]} receiveShadow castShadow>
      <sphereGeometry args={[0.1, 5, 5]} />
      <meshStandardMaterial color={SCENE_COLORS.steppingStoneLight} roughness={0.85} />
    </mesh>
  );
}

export function BoundaryFence() {
  const fx = BOUNDARY_FENCE_X; // 3.8

  // フェンスの柱配置 (中央 Z ∈ [-1.5, 1.5] は通路として開放)
  // 北側セクション (Z < -1.5)
  const northPosts = [-7.5, -5.5, -3.5, -1.8];
  // 南側セクション (Z > 1.5)
  const southPosts = [1.8, 3.5, 5.5, 7.5];

  // 飛び石配置 (草原 X=2.7 から池 X=5.2 への小道)
  const steppingStones: Array<{ pos: [number, number, number]; scale: number; rot: number }> = [
    { pos: [2.8, 0.02, -0.3], scale: 1.0, rot: 0.2 },
    { pos: [3.4, 0.02, 0.2], scale: 1.15, rot: 0.8 },
    { pos: [4.0, 0.02, -0.1], scale: 1.05, rot: 1.4 },
    { pos: [4.6, 0.015, 0.4], scale: 1.1, rot: 0.5 },
    { pos: [5.2, 0.01, 0.0], scale: 0.95, rot: 1.1 },
  ];

  // 小石の散乱配置
  const pebbles: Array<{ pos: [number, number, number]; scale: number }> = [
    { pos: [3.7, 0.03, -1.9], scale: 1.1 },
    { pos: [4.1, 0.03, -1.6], scale: 0.8 },
    { pos: [3.6, 0.03, 1.9], scale: 0.9 },
    { pos: [4.0, 0.03, 2.2], scale: 1.2 },
    { pos: [3.9, 0.03, -4.5], scale: 0.85 },
    { pos: [3.7, 0.03, 4.8], scale: 1.0 },
    { pos: [4.8, 0.02, -1.0], scale: 0.75 },
    { pos: [4.9, 0.02, 1.2], scale: 0.85 },
  ];

  return (
    <group name="boundary-objects">
      {/* 北側フェンスの柱 */}
      {northPosts.map((z) => (
        <FencePost key={`north-post-${z}`} x={fx} z={z} />
      ))}
      {/* 北側フェンスの横木 (上段・下段) */}
      <FenceRail x={fx} zStart={-7.5} zEnd={-1.8} y={0.5} />
      <FenceRail x={fx} zStart={-7.5} zEnd={-1.8} y={0.25} />

      {/* 南側フェンスの柱 */}
      {southPosts.map((z) => (
        <FencePost key={`south-post-${z}`} x={fx} z={z} />
      ))}
      {/* 南側フェンスの横木 (上段・下段) */}
      <FenceRail x={fx} zStart={1.8} zEnd={7.5} y={0.5} />
      <FenceRail x={fx} zStart={1.8} zEnd={7.5} y={0.25} />

      {/* 飛び石 (Stepping Stones) */}
      {steppingStones.map((st, i) => (
        <SteppingStone key={`stone-${i}`} position={st.pos} scale={st.scale} rotation={st.rot} />
      ))}

      {/* 小石 (Pebbles) */}
      {pebbles.map((pb, i) => (
        <SmallPebble key={`pebble-${i}`} position={pb.pos} scale={pb.scale} />
      ))}
    </group>
  );
}
