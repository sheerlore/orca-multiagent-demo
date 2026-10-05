import { SCENE_COLORS } from '../../constants/scene';

/**
 * 箱庭ジオラマの土台・台座 (宙に浮くミニチュアガーデンを演出)
 */
export function DioramaBase() {
  return (
    <group position={[0, -0.6, 0]}>
      {/* ジオラマ下部の土台ブロック */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[26, 0.7, 24]} />
        <meshStandardMaterial color={SCENE_COLORS.dioramaBase} roughness={0.9} metalness={0.05} />
      </mesh>
      {/* 土台下の影受けベース */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[26.4, 0.1, 24.4]} />
        <meshStandardMaterial color="#1e293b" roughness={1.0} />
      </mesh>
    </group>
  );
}
