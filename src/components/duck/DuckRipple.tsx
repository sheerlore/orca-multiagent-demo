import type * as THREE from 'three';

export interface DuckRippleProps {
  rippleRef?: React.Ref<THREE.Mesh>;
}

/**
 * 水泳中（status === 'done'）のアヒルの足元に表示される水面波紋エフェクト。
 * 水面 (Y = 0.05近傍) に同心円のリングを配置し、アニメーション拡大・フェードアウトさせます。
 */
export function DuckRipple({ rippleRef }: DuckRippleProps) {
  return (
    <mesh
      ref={rippleRef}
      position={[0, -0.09, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      data-testid="duck-swimming-ripple"
    >
      <ringGeometry args={[0.3, 0.44, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}
