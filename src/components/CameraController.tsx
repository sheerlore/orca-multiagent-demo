import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ISOMETRIC_CONFIG, PAN_BOUNDS } from '../constants/scene';
import { useCameraStore } from '../store/cameraStore';

export interface CameraControllerProps {
  enablePanClamp?: boolean;
}

/**
 * アイソメトリックカメラコントローラー
 * - クォータービュー配置 (仰角約35.264°, 水平角45°)
 * - パン移動の注視点クランプ (PAN_BOUNDS内に制限)
 * - ズーム距離制限 (MIN_DISTANCE ~ MAX_DISTANCE)
 * - オービット回転制限 (左右各30°以内, 仰角制限)
 * - 視点リセット (イージング補間による初期位置復帰)
 * - 指定ターゲットへのスムーズLerpフォーカス
 */
export function CameraController({ enablePanClamp = true }: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const resetTrigger = useCameraStore((state) => state.resetTrigger);
  const targetFocus = useCameraStore((state) => state.targetFocus);

  // デフォルト位置・ターゲットベクトル
  const defaultPosVec = useMemo(() => new THREE.Vector3(...ISOMETRIC_CONFIG.DEFAULT_POSITION), []);
  const defaultTargetVec = useMemo(() => new THREE.Vector3(...ISOMETRIC_CONFIG.DEFAULT_TARGET), []);

  // アニメーション状態管理
  const isResettingRef = useRef(false);
  const isFocusingRef = useRef(false);
  const prevResetTriggerRef = useRef(resetTrigger);

  // リセットトリガーの検知
  useEffect(() => {
    if (resetTrigger > prevResetTriggerRef.current) {
      isResettingRef.current = true;
      isFocusingRef.current = false;
      prevResetTriggerRef.current = resetTrigger;
    }
  }, [resetTrigger]);

  // フォーカスターゲットの検知
  useEffect(() => {
    if (targetFocus) {
      isFocusingRef.current = true;
      isResettingRef.current = false;
    }
  }, [targetFocus]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;

    // 1. 視点リセットアニメーション (イージングLerp)
    if (isResettingRef.current) {
      const t = Math.min(1, delta * 4.5);
      camera.position.lerp(defaultPosVec, t);
      controls.target.lerp(defaultTargetVec, t);
      controls.update();

      if (
        camera.position.distanceTo(defaultPosVec) < 0.04 &&
        controls.target.distanceTo(defaultTargetVec) < 0.04
      ) {
        camera.position.copy(defaultPosVec);
        controls.target.copy(defaultTargetVec);
        controls.update();
        isResettingRef.current = false;
      }
    }

    // 2. アヒルなどの対象物フォーカスアニメーション (Lerp)
    else if (isFocusingRef.current && targetFocus) {
      const t = Math.min(1, delta * 4.5);
      const targetVec = new THREE.Vector3(...targetFocus);
      // アイソメトリックオフセットを保ったまま目標カメラ位置を算出
      const targetCamPos = new THREE.Vector3(
        targetFocus[0] + ISOMETRIC_CONFIG.DEFAULT_POSITION[0],
        targetFocus[1] + ISOMETRIC_CONFIG.DEFAULT_POSITION[1],
        targetFocus[2] + ISOMETRIC_CONFIG.DEFAULT_POSITION[2]
      );

      camera.position.lerp(targetCamPos, t);
      controls.target.lerp(targetVec, t);
      controls.update();

      if (controls.target.distanceTo(targetVec) < 0.04) {
        isFocusingRef.current = false;
      }
    }

    // 3. パン移動の注視点(Target)クランプ処理
    if (enablePanClamp && !isResettingRef.current) {
      const curTarget = controls.target;
      const clampedX = Math.max(PAN_BOUNDS.minX, Math.min(PAN_BOUNDS.maxX, curTarget.x));
      const clampedY = Math.max(PAN_BOUNDS.minY, Math.min(PAN_BOUNDS.maxY, curTarget.y));
      const clampedZ = Math.max(PAN_BOUNDS.minZ, Math.min(PAN_BOUNDS.maxZ, curTarget.z));

      const dx = clampedX - curTarget.x;
      const dy = clampedY - curTarget.y;
      const dz = clampedZ - curTarget.z;

      if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4 || Math.abs(dz) > 1e-4) {
        curTarget.set(clampedX, clampedY, clampedZ);
        // カメラ本体も追随オフセット移動して視線の不自然な歪みを防ぐ
        camera.position.x += dx;
        camera.position.y += dy;
        camera.position.z += dz;
        controls.update();
      }
    }

    if (typeof window !== 'undefined') {
      (
        window as unknown as {
          __quacktrack_camera?: {
            position: [number, number, number];
            target: [number, number, number];
            isResetting: boolean;
          };
        }
      ).__quacktrack_camera = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        isResetting: isResettingRef.current,
      };
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      // 水平オービット制限 (45° ± 30°)
      minAzimuthAngle={ISOMETRIC_CONFIG.MIN_AZIMUTH}
      maxAzimuthAngle={ISOMETRIC_CONFIG.MAX_AZIMUTH}
      // 垂直オービット制限 (仰角維持)
      minPolarAngle={ISOMETRIC_CONFIG.MIN_POLAR}
      maxPolarAngle={ISOMETRIC_CONFIG.MAX_POLAR}
      // ズーム制限
      minDistance={ISOMETRIC_CONFIG.MIN_DISTANCE}
      maxDistance={ISOMETRIC_CONFIG.MAX_DISTANCE}
      // スムーズな慣性ダンピング
      enableDamping
      dampingFactor={0.08}
      // ユーザーの手動操作開始時に自動アニメーションを停止
      onStart={() => {
        isResettingRef.current = false;
        isFocusingRef.current = false;
      }}
    />
  );
}
