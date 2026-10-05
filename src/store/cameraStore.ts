import { create } from 'zustand';
import { ISOMETRIC_CONFIG } from '../constants/scene';

export interface CameraState {
  // 視点リセット用トリガー (インクリメントによりカメラコントローラが感知)
  resetTrigger: number;
  // 注視ターゲット (アヒル選択時などのスムーズフォーカス先)
  targetFocus: [number, number, number] | null;
  // 初期位置・ターゲット
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];

  // アクション
  resetView: () => void;
  resetCamera: () => void;
  focusOn: (position: [number, number, number]) => void;
  clearFocus: () => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  resetTrigger: 0,
  targetFocus: null,
  defaultPosition: ISOMETRIC_CONFIG.DEFAULT_POSITION,
  defaultTarget: ISOMETRIC_CONFIG.DEFAULT_TARGET,

  resetView: () =>
    set((state) => ({
      resetTrigger: state.resetTrigger + 1,
      targetFocus: null,
    })),

  resetCamera: () =>
    set((state) => ({
      resetTrigger: state.resetTrigger + 1,
      targetFocus: null,
    })),

  focusOn: (position: [number, number, number]) =>
    set({
      targetFocus: position,
    }),

  clearFocus: () =>
    set({
      targetFocus: null,
    }),
}));

if (typeof window !== 'undefined') {
  (
    window as unknown as { __quacktrack_camera_store?: typeof useCameraStore }
  ).__quacktrack_camera_store = useCameraStore;
}
