import { Sparkles as DreiSparkles } from '@react-three/drei';
import { duckGeometries } from '../geometries';

/**
 * 完了（done）タスクのアヒルの周囲に漂うキラキラパーティクル装飾。
 * Dreiのシェーダーパーティクルとローポリの星形クリスタルを組み合わせて表現します。
 */
export function Sparkles() {
  return (
    <group data-testid="accessory-sparkles">
      {/* Dreiのシェーダーパーティクル */}
      <DreiSparkles
        count={12}
        scale={1.2}
        size={2.5}
        speed={0.4}
        color="#fde047"
        position={[0, 0.4, 0]}
      />

      {/* 低ポリゴンのキラキラ星（3箇所に浮遊） */}
      <mesh
        geometry={duckGeometries.sparkleStar}
        position={[0.28, 0.72, 0.24]}
        rotation={[0.3, 0.5, 0.2]}
      >
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fef08a"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      <mesh
        geometry={duckGeometries.sparkleStar}
        position={[-0.24, 0.65, -0.22]}
        rotation={[-0.4, 0.2, 0.5]}
      >
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fef08a"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      <mesh
        geometry={duckGeometries.sparkleStar}
        position={[0.08, 0.82, -0.26]}
        rotation={[0.2, -0.3, 0.4]}
      >
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fef08a"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}
