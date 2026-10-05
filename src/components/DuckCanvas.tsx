import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type * as THREE from 'three';
import { useTaskStore } from '../store/taskStore';
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
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Position based on status:
  // todo: on grass (x: -3 to -1), in-progress: center grass (x: 0), done: in pond (x: 3 to 4)
  const baseX = task.status === 'done' ? 3 + (index % 2) * 1.5 : -3 + (index % 3) * 2;
  const baseZ = ((index * 2) % 6) - 3;
  const isPond = task.status === 'done';

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Bobbing / swimming animation
    const speed = task.status === 'in-progress' ? 4 : 2;
    const height = Math.sin(t * speed + index) * 0.1;
    groupRef.current.position.y = (isPond ? 0.1 : 0.5) + height;
    // Rotation wobble
    groupRef.current.rotation.y = Math.sin(t * 1.5 + index) * 0.2;
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, isPond ? 0.1 : 0.5, baseZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Duck Body */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={task.duckColor ?? '#facc15'}
          roughness={0.4}
          metalness={0.1}
          emissive={isSelected ? '#38bdf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Duck Head */}
      <mesh position={[0.25, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={task.duckColor ?? '#facc15'} roughness={0.4} />
      </mesh>

      {/* Duck Beak */}
      <mesh position={[0.5, 0.25, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color="#f97316" roughness={0.3} />
      </mesh>

      {/* Task Label */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color={isSelected ? '#38bdf8' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0f172a"
      >
        {task.title.length > 12 ? `${task.title.slice(0, 12)}...` : task.title}
      </Text>
    </group>
  );
}

function Ground() {
  return (
    <group position={[0, -0.05, 0]}>
      {/* Grass Field */}
      <mesh position={[-2, 0, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 10]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
      </mesh>
      {/* Pond Field */}
      <mesh position={[4, -0.02, 0]} receiveShadow>
        <boxGeometry args={[4, 0.08, 10]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

export function DuckCanvas() {
  const { tasks, selectedTaskId, setSelectedTaskId } = useTaskStore();

  return (
    <div className="w-full h-full relative" data-testid="duck-canvas-container">
      <Canvas
        camera={{ position: [6, 7, 9], fov: 45 }}
        shadows
        onPointerMissed={() => setSelectedTaskId(null)}
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Ground />
        {tasks.map((task, idx) => (
          <Duck
            key={task.id}
            task={task}
            index={idx}
            isSelected={selectedTaskId === task.id}
            onSelect={() => setSelectedTaskId(task.id)}
          />
        ))}
        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={4} maxDistance={20} />
      </Canvas>
    </div>
  );
}
