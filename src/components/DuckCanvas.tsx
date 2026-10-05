import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Camera, RotateCcw } from 'lucide-react';
import type * as THREE from 'three';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { ISOMETRIC_CONFIG } from '../constants/scene';
import { getDuckSpawnPosition } from '../utils/sceneMath';
import { World } from './world/World';
import { CameraController } from './CameraController';
import type { Task } from '../types/task';

function Duck({
  task,
  index,
  isSelected,
  onSelect,
}: {
  task: Task;
  index: number;
  isSelected: boolean;
  onSelect: (pos: [number, number, number]) => void;
}) {
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
    >
      {/* アヒル胴体 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={task.duckColor ?? '#facc15'}
          roughness={0.4}
          metalness={0.1}
          emissive={isSelected ? '#38bdf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : 0}
        />
      </mesh>

      {/* アヒル頭部 */}
      <mesh position={[0.25, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={task.duckColor ?? '#facc15'} roughness={0.4} />
      </mesh>

      {/* アヒルくちばし */}
      <mesh position={[0.5, 0.25, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color="#f97316" roughness={0.3} />
      </mesh>

      {/* タスク状態に応じた簡易アクセサリ (進行中: ハチマキ、完了: 王冠) */}
      {task.status === 'in-progress' && (
        <mesh position={[0.25, 0.42, 0]} rotation={[0, 0, 0.15]}>
          <torusGeometry args={[0.26, 0.04, 8, 16]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>
      )}
      {task.status === 'done' && (
        <mesh position={[0.25, 0.56, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.1, 0.12, 5]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.2} />
        </mesh>
      )}

      {/* タスクタイトルタグ */}
      <Text
        position={[0, 0.85, 0]}
        fontSize={0.22}
        color={isSelected ? '#38bdf8' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#0f172a"
      >
        {task.title.length > 12 ? `${task.title.slice(0, 12)}...` : task.title}
      </Text>
    </group>
  );
}

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
