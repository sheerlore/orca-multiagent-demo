import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface CelebrationConfettiProps {
  position?: [number, number, number];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

interface ParticleSimData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
}

export interface ConfettiItem {
  color: string;
  size: [number, number];
  initialPos: [number, number, number];
  initialRot: [number, number, number];
}

const CONFETTI_COLORS = [
  '#f472b6', // Pastel Pink
  '#38bdf8', // Sky Blue
  '#facc15', // Lemon Yellow
  '#fbbf24', // Amber Gold
  '#4ade80', // Mint Green
  '#c084fc', // Lavender Purple
  '#fb923c', // Coral Orange
];

/**
 * 紙吹雪の初期データとシミュレーションデータを生成
 */
function createConfettiData(count: number): {
  items: ConfettiItem[];
  simData: ParticleSimData[];
} {
  const items: ConfettiItem[] = [];
  const simData: ParticleSimData[] = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const hSpeed = 1.2 + Math.random() * 2.0;
    const vSpeed = 3.0 + Math.random() * 2.5;

    const vx = Math.cos(theta) * hSpeed;
    const vz = Math.sin(theta) * hSpeed;
    const vy = vSpeed;

    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#facc15';
    const w = 0.06 + Math.random() * 0.04;
    const h = 0.04 + Math.random() * 0.03;

    const posX = (Math.random() - 0.5) * 0.3;
    const posY = 0.3 + Math.random() * 0.4;
    const posZ = (Math.random() - 0.5) * 0.3;

    const rotX = Math.random() * Math.PI * 2;
    const rotY = Math.random() * Math.PI * 2;
    const rotZ = Math.random() * Math.PI * 2;

    items.push({
      color,
      size: [w, h],
      initialPos: [posX, posY, posZ],
      initialRot: [rotX, rotY, rotZ],
    });

    simData.push({
      pos: new THREE.Vector3(posX, posY, posZ),
      vel: new THREE.Vector3(vx, vy, vz),
      rot: new THREE.Euler(rotX, rotY, rotZ),
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
    });
  }

  return { items, simData };
}

/**
 * タスク完了時の紙吹雪パーティクル演出コンポーネント (CelebrationConfetti)。
 * アヒルの周囲にパッと飛び散り、重力と空気抵抗を受けながらヒラヒラと舞い落ちてフェードアウトします。
 * 指定時間（デフォルト: 2.2秒）経過後に自動破棄（onComplete）されます。
 */
export function CelebrationConfetti({
  position = [0, 0, 0],
  count = 42,
  duration = 2.2,
  onComplete,
}: CelebrationConfettiProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const completedRef = useRef(false);
  const elapsedRef = useRef(0);

  // 初回マウント時のみ初期データを遅延生成 (useState initializer)
  const [data] = useState(() => createConfettiData(count));
  // Three.js シミュレーション用ミュータブルデータ
  const simDataRef = useRef<ParticleSimData[]>(data.simData);

  useFrame((_, delta) => {
    if (completedRef.current || isFinished) return;

    const dt = Math.min(delta, 0.1);
    elapsedRef.current += dt;
    const progress = Math.min(1, elapsedRef.current / duration);

    // 重力加速度 (g = -7.5 m/s^2)
    const gravity = -7.5;
    const particles = simDataRef.current;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const mesh = meshRefs.current[i];
      const mat = matRefs.current[i];
      if (!p || !mesh) continue;

      // 速度更新（重力 + 空気抵抗）
      p.vel.y += gravity * dt;
      p.vel.x *= 0.985;
      p.vel.z *= 0.985;

      // 位置更新
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      // 空中ヒラヒラ回転
      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;

      if (mesh && 'position' in mesh && mesh.position && typeof mesh.position.copy === 'function') {
        mesh.position.copy(p.pos);
      }
      if (mesh && 'rotation' in mesh && mesh.rotation && typeof mesh.rotation.copy === 'function') {
        mesh.rotation.copy(p.rot);
      }

      // 後半（progress > 0.4）で滑らかにフェードアウト
      if (mat && 'opacity' in mat) {
        if (progress > 0.4) {
          const fadeProgress = (progress - 0.4) / 0.6;
          mat.opacity = Math.max(0, 1 - fadeProgress);
        } else {
          mat.opacity = 1;
        }
      }
    }

    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      setIsFinished(true);
      onComplete?.();
    }
  });

  if (isFinished) {
    return null;
  }

  return (
    <group ref={groupRef} position={position} data-testid="celebration-confetti">
      {data.items.map((item, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            meshRefs.current[idx] = el;
          }}
          position={item.initialPos}
          rotation={item.initialRot}
          data-testid={`confetti-particle-${idx}`}
        >
          <planeGeometry args={[item.size[0], item.size[1]]} />
          <meshBasicMaterial
            ref={(el) => {
              matRefs.current[idx] = el;
            }}
            color={item.color}
            side={THREE.DoubleSide}
            transparent
            opacity={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
