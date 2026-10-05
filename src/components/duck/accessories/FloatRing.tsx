import { duckGeometries } from '../geometries';

/**
 * 完了（done）タスクのアヒルが首/胴体に装着する浮き輪。
 * 池の水面に浮かび、夏らしいストライプアクセントを持ちます。
 */
export function FloatRing() {
  return (
    <group
      position={[0.05, 0.08, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      data-testid="accessory-float-ring"
    >
      {/* 浮き輪本体（鮮やかなターコイズブルー） */}
      <mesh geometry={duckGeometries.floatRing} castShadow receiveShadow>
        <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* ホワイトストライプアクセント */}
      <mesh geometry={duckGeometries.floatStripe}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.05} />
      </mesh>
    </group>
  );
}
