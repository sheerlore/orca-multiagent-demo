import { useMemo, useRef, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import { DuckModel } from './DuckModel';
import { DuckRipple } from './DuckRipple';
import { DuckEmotionEffect } from './DuckEmotionEffect';
import { useDuckAI } from './useDuckAI';
import { calculateUrgency } from '../../utils/urgency';

export interface DuckProps {
  task: Task;
  index: number;
  isSelected: boolean;
  isHovered?: boolean;
  onSelect: (pos: [number, number, number]) => void;
  onHover?: (hovered: boolean, mousePos?: { x: number; y: number }) => void;
}

/**
 * 3Dシーン上に配置されるアヒルエンティティ。
 * 自律歩行AIステートマシン（useDuckAI）により、IDLE/WALKING/SWIMMINGを自動遷移し、
 * 境界制御およびアヒル同士の反発制御を行います。
 * マウスホバー・クリックによるアウトライン発光、吹き出しホップ跳躍演出、最新座標フォーカス、
 * およびタスク詳細ドロワーとの双方向連動を提供します。
 * 期限(DueDate)に応じた歩行速度・羽ばたきアニメーション・3D感情エフェクトを連動表示します。
 */
export function Duck({
  task,
  index,
  isSelected,
  isHovered = false,
  onSelect,
  onHover,
}: DuckProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftFootRef = useRef<THREE.Mesh>(null);
  const rightFootRef = useRef<THREE.Mesh>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);

  const [isQuacking, setIsQuacking] = useState(false);

  // 期限とステータスから緊急度情報を取得 (docs/SPEC.md 3.3.4)
  const urgency = useMemo(
    () => calculateUrgency(task.dueDate, task.status),
    [task.dueDate, task.status]
  );

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
    leftWingRef,
    rightWingRef,
    rippleRef,
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      onClick={(e) => {
        e.stopPropagation();
        setIsQuacking(true);
        setTimeout(() => setIsQuacking(false), 700);

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
        onHover?.(true, { x: e.clientX, y: e.clientY });
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        onHover?.(false);
      }}
      onPointerMove={(e) => {
        onHover?.(true, { x: e.clientX, y: e.clientY });
      }}
      data-testid={`duck-${task.id}`}
    >
      <DuckModel
        task={task}
        isSelected={isSelected}
        isHovered={isHovered}
        modelGroupRef={modelGroupRef}
        headRef={headRef}
        tailRef={tailRef}
        leftFootRef={leftFootRef}
        rightFootRef={rightFootRef}
        leftWingRef={leftWingRef}
        rightWingRef={rightWingRef}
      />

      {/* 水泳時（done）の足元波紋エフェクト */}
      {task.status === 'done' && <DuckRipple rippleRef={rippleRef} />}

      {/* 期限連動 3D 感情エフェクト (panicked / critical / overdue) */}
      <DuckEmotionEffect urgencyLevel={urgency.urgencyLevel} />

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
