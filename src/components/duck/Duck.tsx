import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import { DuckModel } from './DuckModel';

export interface DuckProps {
  task: Task;
  index: number;
  isSelected: boolean;
  isHovered?: boolean;
  onSelect: (pos: [number, number, number]) => void;
  onHover?: (isHovered: boolean, mousePos?: { x: number; y: number }) => void;
}

/**
 * 3Dシーン上に配置されるアヒルエンティティ。
 * スポーン位置計算、浮遊・ヨチヨチ歩きアニメーション、ポインターイベント、
 * クリック時の「クワッ！」ホップ跳躍演出、および DuckModel のレンダリングを担当します。
 */
export function Duck({ task, index, isSelected, isHovered = false, onSelect, onHover }: DuckProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hopStartTimeRef = useRef<number | null>(null);
  const [isQuacking, setIsQuacking] = useState(false);

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

    // クリック時の「クワッ！」ホップ（跳躍）計算
    let hopOffset = 0;
    if (hopStartTimeRef.current !== null) {
      const elapsed = (performance.now() - hopStartTimeRef.current) / 1000;
      const hopDuration = 0.35;
      if (elapsed < hopDuration) {
        const p = elapsed / hopDuration;
        hopOffset = Math.sin(p * Math.PI) * 0.4;
        const squash = 1 + Math.sin(p * Math.PI) * 0.18;
        groupRef.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      } else {
        hopStartTimeRef.current = null;
        groupRef.current.scale.set(1, 1, 1);
      }
    }

    groupRef.current.position.y = baseY + height + hopOffset;

    // 注目時は正面を向いてアピール、通常時は左右のヨチヨチ首振り・回遊揺れ
    if (isHovered) {
      groupRef.current.rotation.y = 0;
    } else {
      groupRef.current.rotation.y = Math.sin(t * 1.5 + index) * 0.2;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      onClick={(e) => {
        e.stopPropagation();
        hopStartTimeRef.current = performance.now();
        setIsQuacking(true);
        setTimeout(() => setIsQuacking(false), 700);
        onSelect([baseX, baseY, baseZ]);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        const clientX =
          e.clientX ?? ('nativeEvent' in e ? (e.nativeEvent as PointerEvent).clientX : undefined);
        const clientY =
          e.clientY ?? ('nativeEvent' in e ? (e.nativeEvent as PointerEvent).clientY : undefined);
        const coords =
          clientX !== undefined && clientY !== undefined ? { x: clientX, y: clientY } : undefined;
        onHover?.(true, coords);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        const clientX =
          e.clientX ?? ('nativeEvent' in e ? (e.nativeEvent as PointerEvent).clientX : undefined);
        const clientY =
          e.clientY ?? ('nativeEvent' in e ? (e.nativeEvent as PointerEvent).clientY : undefined);
        const coords =
          clientX !== undefined && clientY !== undefined ? { x: clientX, y: clientY } : undefined;
        onHover?.(true, coords);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        onHover?.(false);
      }}
      data-testid={`duck-${task.id}`}
    >
      <DuckModel task={task} isSelected={isSelected} isHovered={isHovered} />

      {/* クリック時の「クワッ！」吹き出しポップアップ */}
      {isQuacking && (
        <group data-testid="quack-popup" position={[0.2, 1.45, 0]}>
          <Billboard>
            <Text
              fontSize={0.28}
              color="#fef08a"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.035}
              outlineColor="#854d0e"
            >
              クワッ！
            </Text>
          </Billboard>
        </group>
      )}
    </group>
  );
}
