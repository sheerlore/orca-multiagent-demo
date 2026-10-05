import { useCallback, useMemo, useRef, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';
import { playCelebrationJingle } from '../../utils/audio';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import { CelebrationConfetti } from './CelebrationConfetti';
import { CelebrationSplash } from './CelebrationSplash';
import { DuckModel } from './DuckModel';
import { DuckRipple } from './DuckRipple';
import { useDuckAI } from './useDuckAI';

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
 * 自律歩行AIステートマシン（useDuckAI）により、IDLE/WALKING/SWIMMING/CELEBRATIONを自動遷移し、
 * 境界制御およびアヒル同士の反発制御を行います。
 * タスク完了時には宙返りジャンプ・紙吹雪パーティクル・池への行進・スプラッシュ波紋・Web Audioジングルを再生します。
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
  const rippleRef = useRef<THREE.Mesh>(null);

  const [isQuacking, setIsQuacking] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [confettiPos, setConfettiPos] = useState<[number, number, number] | null>(null);
  const [splashPos, setSplashPos] = useState<[number, number, number] | null>(null);

  const soundEnabled = useTaskStore((state) => state.settings?.soundEnabled ?? true);

  // セレブレーション開始コールバック（宙返りジャンプ・紙吹雪・ジングル再生）
  const handleCelebrationStart = useCallback(
    (pos: [number, number, number]) => {
      setIsCelebrating(true);
      // 1. Web Audio API による達成ジングル再生
      playCelebrationJingle(soundEnabled);
      // 2. 紙吹雪パーティクル発生
      setConfettiPos([pos[0], pos[1] + 0.3, pos[2]]);
    },
    [soundEnabled]
  );

  // 池到達時の「ポチャン！」スプラッシュ波紋コールバック
  const handleSplash = useCallback(() => {
    setIsCelebrating(false);
    if (groupRef.current) {
      setSplashPos([groupRef.current.position.x, 0.05, groupRef.current.position.z]);
    } else {
      const pondPos = getDuckSpawnPosition('done', index);
      setSplashPos(pondPos);
    }
  }, [index]);

  // ステータスに応じた初期スポーン位置
  const [baseX, baseY, baseZ] = useMemo(
    () => getDuckSpawnPosition(task.status, index),
    [task.status, index]
  );

  // 自律歩行・セレブレーションAIフック
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
    onCelebrationStart: handleCelebrationStart,
    onSplash: handleSplash,
  });

  // セレブレーション中（宙返り・行進）は王冠を被らずに走り、池着水で遊泳モード装飾（王冠等）へ移行
  const effectiveModelStatus = isCelebrating ? 'in-progress' : task.status;

  return (
    <>
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
          status={effectiveModelStatus}
          isSelected={isSelected}
          isHovered={isHovered}
          modelGroupRef={modelGroupRef}
          headRef={headRef}
          tailRef={tailRef}
          leftFootRef={leftFootRef}
          rightFootRef={rightFootRef}
        />

        {/* 水泳時（done かつ池着水後）の足元波紋エフェクト */}
        {task.status === 'done' && !isCelebrating && <DuckRipple rippleRef={rippleRef} />}

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

      {/* タスク完了時の紙吹雪パーティクル演出 */}
      {confettiPos && (
        <CelebrationConfetti
          position={confettiPos}
          onComplete={() => setConfettiPos(null)}
        />
      )}

      {/* 池到達着水時の「ポチャン！」スプラッシュ波紋演出 */}
      {splashPos && (
        <CelebrationSplash
          position={splashPos}
          onComplete={() => setSplashPos(null)}
        />
      )}
    </>
  );
}
