import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';

export interface HoverIndicatorProps {
  position?: [number, number, number];
}

/**
 * タスクリストアイテムやアヒルホバー時に頭上に表示される「▼」黄色インジケーター。
 * 上下にふわふわバウンス浮遊し、注目対象を明示します。
 */
export function HoverIndicator({ position = [0, 1.15, 0] }: HoverIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 6) * 0.08;
  });

  return (
    <group ref={groupRef} position={position} data-testid="hover-indicator">
      <Billboard>
        <Text
          fontSize={0.32}
          color="#facc15"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.035}
          outlineColor="#854d0e"
        >
          ▼
        </Text>
      </Billboard>
      {/* 3D コーンメッシュ（下向き） */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#fbbf24"
          emissiveIntensity={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
