import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import { DuckModel } from './DuckModel';
import { DuckRipple } from './DuckRipple';
import { useDuckAI } from './useDuckAI';

export interface DuckProps {
  task: Task;
  index: number;
  isSelected: boolean;
  onSelect: (pos: [number, number, number]) => void;
}

/**
 * 3Dシーン上に配置されるアヒルエンティティ。
 * 自律歩行AIステートマシン（useDuckAI）により、IDLE/WALKING/SWIMMINGを自動遷移し、
 * 境界制御およびアヒル同士の反発制御を行います。
 */
export function Duck({ task, index, isSelected, onSelect }: DuckProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftFootRef = useRef<THREE.Mesh>(null);
  const rightFootRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);

  // ステータスに応じた初期スポーン位置
  const [baseX, baseY, baseZ] = useMemo(
    () => getDuckSpawnPosition(task.status, index),
    [task.status, index]
  );

  // 自律歩行AIフック
  useDuckAI({
    task,
    index,
    groupRef,
    modelGroupRef,
    headRef,
    tailRef,
    leftFootRef,
    rightFootRef,
    rippleRef,
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      onClick={(e) => {
        e.stopPropagation();
        if (
          groupRef.current &&
          'position' in groupRef.current &&
          groupRef.current.position
        ) {
          onSelect([
            groupRef.current.position.x,
            groupRef.current.position.y,
            groupRef.current.position.z,
          ]);
        } else {
          onSelect([baseX, baseY, baseZ]);
        }
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
      <DuckModel
        task={task}
        isSelected={isSelected}
        modelGroupRef={modelGroupRef}
        headRef={headRef}
        tailRef={tailRef}
        leftFootRef={leftFootRef}
        rightFootRef={rightFootRef}
      />
      {task.status === 'done' && <DuckRipple rippleRef={rippleRef} />}
    </group>
  );
}
