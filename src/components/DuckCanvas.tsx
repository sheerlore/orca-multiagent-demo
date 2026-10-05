import { Canvas } from '@react-three/fiber';
import { Camera, RotateCcw } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { ISOMETRIC_CONFIG } from '../constants/scene';
import { World } from './world/World';
import { CameraController } from './CameraController';
import { Duck } from './duck/Duck';

export function DuckCanvas() {
  const { tasks, selectedTaskId, setSelectedTaskId } = useTaskStore();
  const resetView = useCameraStore((state) => state.resetView);
  const focusOn = useCameraStore((state) => state.focusOn);
  const clearFocus = useCameraStore((state) => state.clearFocus);

  return (
    <div className="w-full h-full relative" data-testid="duck-canvas-container">
      {/* 画面右上 UI オーバーレイ: 視点リセット & エリアインジケータ */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-lg">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            草原
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />池
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            clearFocus();
            resetView();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 shadow-lg backdrop-blur-md active:scale-95 transition text-xs font-medium cursor-pointer"
          title="アイソメトリック初期構図へ視点をリセット"
          aria-label="視点リセット"
          data-testid="reset-view-button"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
          <span>視点リセット</span>
        </button>
      </div>

      {/* 画面左下: 操作ヒント */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none hidden md:flex items-center gap-2 text-[11px] text-slate-400/80 bg-slate-900/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-800/50">
        <Camera className="w-3 h-3 text-slate-400" />
        <span>左ドラッグ: 回転 (±30°) | 右ドラッグ: パン | ホイール: ズーム</span>
      </div>

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{
          position: ISOMETRIC_CONFIG.DEFAULT_POSITION,
          fov: ISOMETRIC_CONFIG.FOV,
        }}
        shadows
        onPointerMissed={() => {
          setSelectedTaskId(null);
          clearFocus();
        }}
      >
        {/* 箱庭ワールド (草原・池・境界フェンス・照明・台座) */}
        <World />

        {/* タスクアヒルのレンダリング */}
        {tasks.map((task, idx) => (
          <Duck
            key={task.id}
            task={task}
            index={idx}
            isSelected={selectedTaskId === task.id}
            onSelect={(pos) => {
              setSelectedTaskId(task.id);
              focusOn(pos);
            }}
          />
        ))}

        {/* アイソメトリックカメラコントローラー */}
        <CameraController />
      </Canvas>
    </div>
  );
}
