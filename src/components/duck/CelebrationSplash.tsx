import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

export interface CelebrationSplashProps {
  position?: [number, number, number];
  duration?: number;
  onComplete?: () => void;
}

/**
 * アヒルが池に飛び込んだ瞬間の「ポチャン！」スプラッシュ波紋演出コンポーネント。
 * 水面（Y ≈ 0.06）に同心円の波紋リングがパッと広がり、フェードアウトして自動消滅します。
 */
export function CelebrationSplash({
  position = [0, 0.06, 0],
  duration = 0.9,
  onComplete,
}: CelebrationSplashProps) {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const [isFinished, setIsFinished] = useState(false);
  const completedRef = useRef(false);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (completedRef.current || isFinished) return;

    elapsedRef.current += Math.min(delta, 0.1);
    const progress = Math.min(1, elapsedRef.current / duration);

    // イージング（拡大速度が徐々に緩やかになる Ease-Out）
    const easeOut = 1 - Math.pow(1 - progress, 3);

    // 内側リング: スケール 0.2 -> 1.6
    if (innerRingRef.current) {
      const scale = 0.2 + easeOut * 1.4;
      const mesh = innerRingRef.current;
      if ('scale' in mesh && mesh.scale && typeof mesh.scale.set === 'function') {
        mesh.scale.set(scale, scale, 1);
      }
      if ('material' in mesh && mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.7);
      }
    }

    // 外側リング: 少し遅れて広がる (スケール 0.1 -> 2.2)
    if (outerRingRef.current) {
      const outerProgress = Math.max(0, (progress - 0.15) / 0.85);
      const outerEase = 1 - Math.pow(1 - outerProgress, 3);
      const scale = 0.1 + outerEase * 2.1;
      const mesh = outerRingRef.current;
      if ('scale' in mesh && mesh.scale && typeof mesh.scale.set === 'function') {
        mesh.scale.set(scale, scale, 1);
      }
      if ('material' in mesh && mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - outerProgress) * 0.5);
      }
    }

    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      setIsFinished(true);
      onComplete?.();
    }
  });

  if (isFinished) {
    return null;
  }

  return (
    <group position={position} data-testid="celebration-splash">
      {/* 内側波紋リング */}
      <mesh
        ref={innerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        data-testid="splash-inner-ring"
      >
        <ringGeometry args={[0.3, 0.45, 32]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* 外側波紋リング */}
      <mesh
        ref={outerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        data-testid="splash-outer-ring"
      >
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}
