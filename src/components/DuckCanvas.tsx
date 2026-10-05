import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Camera, RotateCcw } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { ISOMETRIC_CONFIG } from '../constants/scene';
import type { Task } from '../types/task';
import { World } from './world/World';
import { CameraController } from './CameraController';
import { Duck } from './duck/Duck';

export function DuckCanvas() {
  const {
    tasks,
    selectedTaskId,
    hoveredTaskId,
    setSelectedTaskId,
    setHoveredTaskId,
    setIsDetailDrawerOpen,
  } = useTaskStore();

  const resetView = useCameraStore((state) => state.resetView);
  const focusOn = useCameraStore((state) => state.focusOn);
  const clearFocus = useCameraStore((state) => state.clearFocus);

  const [tooltip, setTooltip] = useState<{ task: Task; x: number; y: number } | null>(null);

  const handleDuckHover = (task: Task, isHovered: boolean, mousePos?: { x: number; y: number }) => {
    if (isHovered && mousePos) {
      setHoveredTaskId(task.id);
      setTooltip({ task, x: mousePos.x, y: mousePos.y });
    } else {
      setHoveredTaskId(null);
      setTooltip(null);
    }
  };

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

      {/* 3Dアヒルホバー時のフロートツールチップ */}
      {tooltip && (
        <div
          data-testid="duck-tooltip"
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl backdrop-blur-md text-xs text-slate-100 min-w-44 max-w-xs transition-opacity duration-75"
          style={{
            left: `${Math.min(
              (typeof window !== 'undefined' ? window.innerWidth : 1024) - 200,
              tooltip.x + 14
            )}px`,
            top: `${Math.min(
              (typeof window !== 'undefined' ? window.innerHeight : 768) - 80,
              tooltip.y + 14
            )}px`,
          }}
        >
          <div className="font-semibold flex items-center gap-1.5 text-slate-100 mb-1">
            <span role="img" aria-label="duck">
              🦆
            </span>
            <span className="truncate">{tooltip.task.title}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>
              期日: {tooltip.task.dueDate ? (tooltip.task.dueDate.split('T')[0] ?? 'なし') : 'なし'}
            </span>
            <span
              className={`font-medium ${
                tooltip.task.status === 'done'
                  ? 'text-emerald-400'
                  : tooltip.task.status === 'in-progress'
                    ? 'text-blue-400'
                    : 'text-amber-400'
              }`}
            >
              {tooltip.task.status === 'todo'
                ? '未着手'
                : tooltip.task.status === 'in-progress'
                  ? '進行中'
                  : '完了'}
            </span>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{
          position: ISOMETRIC_CONFIG.DEFAULT_POSITION,
          fov: ISOMETRIC_CONFIG.FOV,
        }}
        shadows
        onPointerMissed={() => {
          setSelectedTaskId(null);
          setIsDetailDrawerOpen(false);
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
            isHovered={hoveredTaskId === task.id}
            onSelect={(pos) => {
              setSelectedTaskId(task.id);
              setIsDetailDrawerOpen(true);
              focusOn(pos);
            }}
            onHover={(isHovered, mousePos) => handleDuckHover(task, isHovered, mousePos)}
          />
        ))}

        {/* アイソメトリックカメラコントローラー */}
        <CameraController />
      </Canvas>
    </div>
  );
}
