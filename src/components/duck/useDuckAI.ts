import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { Task } from '../../types/task';
import { getDuckSpawnPosition } from '../../utils/sceneMath';
import {
  DuckAIController,
  type DuckAIState,
  duckPositionRegistry,
} from '../../utils/duckAI';
import { calculateUrgency, type UrgencyInfo } from '../../utils/urgency';

export interface UseDuckAIOptions {
  task: Task;
  index: number;
  groupRef: React.RefObject<THREE.Group | null>;
  modelGroupRef?: React.RefObject<THREE.Group | null>;
  headRef?: React.RefObject<THREE.Group | null>;
  tailRef?: React.RefObject<THREE.Mesh | null>;
  leftFootRef?: React.RefObject<THREE.Mesh | null>;
  rightFootRef?: React.RefObject<THREE.Mesh | null>;
  leftWingRef?: React.RefObject<THREE.Mesh | null>;
  rightWingRef?: React.RefObject<THREE.Mesh | null>;
  rippleRef?: React.RefObject<THREE.Mesh | null>;
  onCelebrationStart?: (pos: [number, number, number]) => void;
  onSplash?: () => void;
}

export interface UseDuckAIReturn {
  controller: DuckAIController;
  getAIState: () => DuckAIState;
  urgency: UrgencyInfo;
  getUrgency: () => UrgencyInfo;
}

/**
 * アヒルの自律歩行AIステートマシンフック (useDuckAI)。
 * React再レンダリングを回避し、useFrame内で直接Three.jsの各Mesh/Group Refを操作します。
 * 最大30羽のアヒルが存在しても60FPSを維持できるよう設計されています。
 */
export function useDuckAI({
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
  onCelebrationStart,
  onSplash,
}: UseDuckAIOptions): UseDuckAIReturn {
  const initialPos = useMemo(
    () => getDuckSpawnPosition(task.status, index),
    [task.status, index]
  );

  const urgency = useMemo(
    () => calculateUrgency(task.dueDate, task.status),
    [task.dueDate, task.status]
  );

  // 初期化時のみコントローラーを生成し、以降は再レンダリングを発生させず同一参照を維持
  const [controller] = useState(
    () =>
      new DuckAIController({
        id: task.id,
        status: task.status,
        dueDate: task.dueDate,
        index,
        initialPos,
      })
  );

  // 期限またはステータス更新時にコントローラーのurgencyも同期
  useEffect(() => {
    controller.setUrgency(urgency);
  }, [urgency, controller]);

  // タスクステータス変更時の検知・同期（セレブレーション演出または草原復帰）
  const prevStatusRef = useRef<Task['status']>(task.status);
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    // 初回マウント時（リロード時など）はセレブレーションを実行せず静かに配置
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevStatusRef.current = task.status;
      return;
    }

    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = task.status;

    if ((prevStatus === 'todo' || prevStatus === 'in-progress') && task.status === 'done') {
      // todo / in-progress から done への変化を検知 -> セレブレーション開始
      const currentPos: [number, number, number] = [
        controller.position.x,
        controller.position.y,
        controller.position.z,
      ];
      onCelebrationStart?.(currentPos);

      const pondPos = getDuckSpawnPosition('done', index);
      controller.startCelebration(pondPos, onSplash);
    } else if (prevStatus === 'done' && task.status !== 'done') {
      // done から未完了に戻された場合 -> 草原エリアへ復帰
      const grassPos = getDuckSpawnPosition(task.status, index);
      controller.syncToGrass(grassPos);
    }
  }, [task.status, index, controller, onCelebrationStart, onSplash]);

  // 位置レジストリへの登録とアンマウント時のクリーンアップ
  useEffect(() => {
    duckPositionRegistry.register(
      task.id,
      controller.position.x,
      controller.position.y,
      controller.position.z,
      task.status
    );

    return () => {
      duckPositionRegistry.unregister(task.id);
    };
  }, [task.id, task.status, controller]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // タブ非アクティブ時等の極端に大きなdelta（フレーム落ち）を防止
    const dt = Math.min(delta, 0.1);

    // 近傍アヒル座標の取得（他エリアのアヒルは除外）
    const neighbors = duckPositionRegistry.getNeighbors(task.id, task.status);

    // AIステートマシン更新＆ポーズ計算
    const pose = controller.step(dt, neighbors, task);

    // レジストリ座標の更新
    duckPositionRegistry.update(
      task.id,
      controller.position.x,
      controller.position.y,
      controller.position.z,
      task.status
    );

    // 1. ルートグループの位置・方向（Yaw）を更新
    group.position.set(controller.position.x, controller.position.y, controller.position.z);
    group.rotation.y = controller.heading;

    // 2. 身体のロッキング（左右揺れ）＆ついばみ（前傾ピッチ）
    if (modelGroupRef?.current) {
      modelGroupRef.current.rotation.x = pose.bodyRoll;
      modelGroupRef.current.rotation.z = pose.peckPitch;
    }

    // 3. 尾羽フリフリ
    if (tailRef?.current) {
      tailRef.current.rotation.y = pose.tailWiggle;
    }

    // 4. 首かしげ＆首振り
    if (headRef?.current) {
      headRef.current.rotation.x = pose.headTilt;
      headRef.current.rotation.y = pose.headYaw;
    }

    // 5. 足の交互スイング（歩行時のみ。水泳時は非表示のためrefはnull）
    if (leftFootRef?.current) {
      leftFootRef.current.rotation.z = pose.leftFootRotZ;
    }
    if (rightFootRef?.current) {
      rightFootRef.current.rotation.z = pose.rightFootRotZ;
    }

    // 6. 水泳時の足元波紋エフェクト
    if (rippleRef?.current && controller.state === 'SWIMMING') {
      const progress = (state.clock.getElapsedTime() * 1.4 + controller.seed) % 1;
      const scale = 0.5 + progress * 1.3;
      rippleRef.current.scale.set(scale, scale, 1);
      const material = rippleRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = Math.max(0, (1 - progress) * 0.35);
      }
    }

    // 7. 羽ばたき（wing flap - critical時は激しい超高速羽ばたき）
    if (leftWingRef?.current) {
      leftWingRef.current.rotation.x = pose.leftWingRotX;
      leftWingRef.current.rotation.z = pose.leftWingRotZ;
    }
    if (rightWingRef?.current) {
      rightWingRef.current.rotation.x = pose.rightWingRotX;
      rightWingRef.current.rotation.z = pose.rightWingRotZ;
    }
  });

  return {
    controller,
    getAIState: () => controller.state,
    urgency,
    getUrgency: () => urgency,
  };
}
