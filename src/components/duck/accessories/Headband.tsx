import { duckGeometries } from '../geometries';

/**
 * 進行中（in-progress）タスクのアヒルが着用する赤いハチマキ。
 * 額のリングと後頭部の結び目リボンで構成されます。
 */
export function Headband() {
  return (
    <group data-testid="accessory-headband">
      {/* 額に巻かれた赤いリング */}
      <mesh
        geometry={duckGeometries.headbandRing}
        position={[0.26, 0.43, 0]}
        rotation={[0, 0, 0.12]}
        castShadow
      >
        <meshStandardMaterial color="#ef4444" roughness={0.5} />
      </mesh>

      {/* 後頭部の結び目 */}
      <mesh geometry={duckGeometries.headbandKnot} position={[0.02, 0.43, 0]} castShadow>
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>

      {/* 風になびくリボンの端 1 */}
      <mesh
        geometry={duckGeometries.headbandRibbon}
        position={[-0.08, 0.38, 0.04]}
        rotation={[0.2, 0.3, -0.6]}
        castShadow
      >
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>

      {/* 風になびくリボンの端 2 */}
      <mesh
        geometry={duckGeometries.headbandRibbon}
        position={[-0.08, 0.35, -0.04]}
        rotation={[-0.2, -0.3, -0.7]}
        castShadow
      >
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
    </group>
  );
}
