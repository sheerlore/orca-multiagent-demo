import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import { DuckModel } from './DuckModel';

export interface DuckProps {
  task: Task;
  index: number;
  isSelected: boolean;
  onSelect: (pos: [number, number, number]) => void;
}

/**
 * 3Dシーン上に配置されるアヒルエンティティ。
 * スポーン位置計算、浮遊・ヨチヨチ歩きアニメーション、ポインターイベント、
 * および DuckModel のレンダリングを担当します。
 */
export function Duck({ task, index, isSelected, onSelect }: DuckProps) {
  const groupRef = useRef<THREE.Group>(null);

  // ステータスに応じたワールド配置位置を計算
  const [baseX, baseY, baseZ] = useMemo(
    () => getDuckSpawnPosition(task.status, index),
    [task.status, index]
  );
  const isPond = task.status === 'done';

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // 泳ぎ・歩行の浮遊アニメーション
    const speed = task.status === 'in-progress' ? 4 : isPond ? 1.5 : 2;
    const height = Math.sin(t * speed + index) * 0.08;
    groupRef.current.position.y = baseY + height;
    // 左右のヨチヨチ首振り・回遊揺れ
    groupRef.current.rotation.y = Math.sin(t * 1.5 + index) * 0.2;
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect([baseX, baseY, baseZ]);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
      data-testid={`duck-${task.id}`}
    >
      <DuckModel task={task} isSelected={isSelected} />
    </group>
  );
}
