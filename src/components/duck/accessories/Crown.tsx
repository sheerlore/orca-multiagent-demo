import { duckGeometries } from '../geometries';

const PEAK_ANGLES = [0, (Math.PI * 2) / 5, (Math.PI * 4) / 5, (Math.PI * 6) / 5, (Math.PI * 8) / 5];
const PEAK_RADIUS = 0.14;

/**
 * 完了（done）タスクのアヒルが頭に被る金色の王冠。
 * メタリックなベースリングと5本の突起、小さな宝石アクセントで構成されます。
 */
export function Crown() {
  return (
    <group position={[0.26, 0.57, 0]} rotation={[0, 0, 0.05]} data-testid="accessory-crown">
      {/* 王冠の円筒形ベース */}
      <mesh geometry={duckGeometries.crownBase} castShadow>
        <meshStandardMaterial
          color="#f59e0b"
          metalness={0.8}
          roughness={0.2}
          emissive="#78350f"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 王冠上部の5つの突起 */}
      {PEAK_ANGLES.map((angle, i) => (
        <mesh
          key={i}
          geometry={duckGeometries.crownPeak}
          position={[Math.cos(angle) * PEAK_RADIUS, 0.065, Math.sin(angle) * PEAK_RADIUS]}
          castShadow
        >
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* 正面の小さなルビー宝石アクセント */}
      <mesh position={[0.15, 0.01, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.1} metalness={0.4} />
      </mesh>
    </group>
  );
}
