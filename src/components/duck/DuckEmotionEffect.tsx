import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';
import type { UrgencyLevel } from '../../utils/urgency';
import { duckGeometries } from './geometries';

export interface DuckEmotionEffectProps {
  urgencyLevel: UrgencyLevel;
  position?: [number, number, number];
}

/**
 * 焦り状態 (panicked): 青い汗マークがピョコっと浮いて落ちる
 */
function PanickedEffect() {
  const dropRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!dropRef.current) return;
    const t = state.clock.getElapsedTime();
    // 周期 1.1 秒: 前半でピョコっと飛び出して落ち、後半は短い待機
    const cycle = (t * 1.8) % 1.2;
    if (cycle < 0.85) {
      dropRef.current.visible = true;
      const progress = cycle / 0.85;
      // 放物線状に浮いて落ちる
      const hopY = Math.sin(progress * Math.PI) * 0.12 - progress * 0.08;
      dropRef.current.position.set(0.08 + progress * 0.04, 0.06 + hopY, 0.18);
      // ポップアップ時にスケール拡大 -> 落下時に少し縮小
      const s = Math.min(1.2, progress * 4) * (1 - progress * 0.25);
      dropRef.current.scale.set(s, s, s);
    } else {
      dropRef.current.visible = false;
    }
  });

  return (
    <group data-testid="emotion-panicked">
      <group ref={dropRef} position={[0.08, 0.06, 0.18]} data-testid="sweat-drop">
        {/* 円錐（先端が下向きの水滴） */}
        <mesh
          geometry={duckGeometries.sweatDrop}
          rotation={[Math.PI, 0, 0]}
          position={[0, -0.04, 0]}
        >
          <meshStandardMaterial
            color="#38bdf8"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.88}
          />
        </mesh>
        {/* 水滴の丸い頭頂部 */}
        <mesh geometry={duckGeometries.sweatCap} position={[0, 0.02, 0]}>
          <meshStandardMaterial
            color="#38bdf8"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.88}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 直前パニック状態 (critical): 激しい汗マーク（複数の水滴が激しく飛び散る）
 */
function CriticalEffect() {
  const drop1Ref = useRef<THREE.Group>(null);
  const drop2Ref = useRef<THREE.Group>(null);
  const drop3Ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const updateDrop = (
      ref: React.RefObject<THREE.Group | null>,
      phaseOffset: number,
      targetX: number,
      targetZ: number
    ) => {
      if (!ref.current) return;
      const cycle = (t * 3.8 + phaseOffset) % 1.0;
      if (cycle < 0.8) {
        ref.current.visible = true;
        const p = cycle / 0.8;
        const hopY = Math.sin(p * Math.PI) * 0.18 - p * 0.1;
        ref.current.position.set(targetX * p, 0.08 + hopY, targetZ * p);
        const s = Math.min(1.3, p * 5) * (1 - p * 0.3);
        ref.current.scale.set(s, s, s);
      } else {
        ref.current.visible = false;
      }
    };

    updateDrop(drop1Ref, 0.0, 0.16, 0.22);
    updateDrop(drop2Ref, 0.33, 0.16, -0.22);
    updateDrop(drop3Ref, 0.66, 0.05, 0.14);
  });

  return (
    <group data-testid="emotion-critical">
      {/* 水滴1 (右前方へ飛び散る) */}
      <group ref={drop1Ref} data-testid="critical-sweat-drop">
        <mesh geometry={duckGeometries.sweatDrop} rotation={[Math.PI * 0.8, 0, 0.3]}>
          <meshStandardMaterial color="#0284c7" roughness={0.1} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* 水滴2 (左前方へ飛び散る) */}
      <group ref={drop2Ref} data-testid="critical-sweat-drop">
        <mesh geometry={duckGeometries.sweatDrop} rotation={[Math.PI * 0.8, 0, -0.3]}>
          <meshStandardMaterial color="#0284c7" roughness={0.1} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* 水滴3 (上方へ噴き出す) */}
      <group ref={drop3Ref} data-testid="critical-sweat-drop">
        <mesh geometry={duckGeometries.sweatDrop} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial color="#38bdf8" roughness={0.1} transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 期限超過状態 (overdue): 怒り・湯気マーク（頭からポッポと立ち上る白い蒸気リングや怒りシンボル）
 */
function OverdueEffect() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const angerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 蒸気リング1の上昇・拡大・フェードアウト
    if (ring1Ref.current) {
      const cycle1 = (t * 1.5) % 1.0;
      ring1Ref.current.position.y = 0.05 + cycle1 * 0.35;
      const s1 = 0.5 + cycle1 * 0.9;
      ring1Ref.current.scale.set(s1, s1, s1);
      const mat1 = ring1Ref.current.material as THREE.MeshStandardMaterial;
      if (mat1) {
        mat1.opacity = Math.max(0, (1 - cycle1) * 0.85);
      }
    }

    // 蒸気リング2（位相半周期ずらし）
    if (ring2Ref.current) {
      const cycle2 = (t * 1.5 + 0.5) % 1.0;
      ring2Ref.current.position.y = 0.05 + cycle2 * 0.35;
      const s2 = 0.5 + cycle2 * 0.9;
      ring2Ref.current.scale.set(s2, s2, s2);
      const mat2 = ring2Ref.current.material as THREE.MeshStandardMaterial;
      if (mat2) {
        mat2.opacity = Math.max(0, (1 - cycle2) * 0.85);
      }
    }

    // 怒りマークの脈動
    if (angerRef.current) {
      const pulse = 1.0 + Math.sin(t * 8.0) * 0.2;
      angerRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group data-testid="emotion-overdue">
      {/* 立ち上る白い蒸気リング1 */}
      <mesh
        ref={ring1Ref}
        data-testid="steam-ring-1"
        geometry={duckGeometries.steamRing}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <meshStandardMaterial color="#f8fafc" roughness={0.6} transparent opacity={0.8} />
      </mesh>

      {/* 立ち上る白い蒸気リング2 */}
      <mesh
        ref={ring2Ref}
        data-testid="steam-ring-2"
        geometry={duckGeometries.steamRing}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <meshStandardMaterial color="#f8fafc" roughness={0.6} transparent opacity={0.8} />
      </mesh>

      {/* 怒りシンボルマーク (頭上の怒りマーク) */}
      <group ref={angerRef} position={[0.08, 0.18, 0]} data-testid="anger-symbol">
        <Billboard>
          <Text
            fontSize={0.25}
            color="#ef4444"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#7f1d1d"
          >
            💢
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

/**
 * 3D感情エフェクトコンポーネント。
 * アヒルの頭上付近に配置され、緊急度に応じた視覚的演出（焦り汗・直前猛烈汗・期限超過湯気＆怒り）を表示します。
 * 低ポリゴン共有ジオメトリと軽量マテリアルを使用し、useFrame内で高パフォーマンスにアニメーションします。
 */
export function DuckEmotionEffect({
  urgencyLevel,
  position = [0.26, 0.62, 0],
}: DuckEmotionEffectProps) {
  if (urgencyLevel === 'normal' || urgencyLevel === 'relaxed' || urgencyLevel === 'hurried') {
    return null;
  }

  return (
    <group position={position} data-testid="duck-emotion-effect">
      {urgencyLevel === 'panicked' && <PanickedEffect />}
      {urgencyLevel === 'critical' && <CriticalEffect />}
      {urgencyLevel === 'overdue' && <OverdueEffect />}
    </group>
  );
}
