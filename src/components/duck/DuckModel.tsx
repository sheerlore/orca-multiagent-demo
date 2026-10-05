import { useMemo } from 'react';
import * as THREE from 'three';
import type { Task, TaskStatus } from '../../types/task';
import { duckGeometries } from './geometries';
import { Headband, Crown, FloatRing, Sparkles } from './accessories';
import { DuckTitleTag } from './DuckTitleTag';
import { HoverIndicator } from './HoverIndicator';

export interface DuckModelProps {
  status?: TaskStatus;
  duckColor?: string;
  isSelected?: boolean;
  isHovered?: boolean;
  isAttention?: boolean;
  title?: string;
  task?: Task;
  showTitleTag?: boolean;
}

/**
 * 低ポリゴンアヒル3Dモデルコンポーネント。
 * まるい胴体、頭、くちばし（オレンジ）、左右の小さな翼、左右の足（オレンジ）からなる階層グループを構成します。
 * タスク固有の duckColor をマテリアル色に動的反映し、ステータスに応じたアクセサリーを描画します。
 * ホバー・注目時にはアウトライン発光、注目ポーズ、および頭上「▼」インジケーター（HoverIndicator）を表示します。
 */
export function DuckModel({
  status: propStatus,
  duckColor: propDuckColor,
  isSelected = false,
  isHovered = false,
  isAttention = false,
  title: propTitle,
  task,
  showTitleTag = true,
}: DuckModelProps) {
  const status = propStatus ?? task?.status ?? 'todo';
  const duckColor = propDuckColor ?? task?.duckColor ?? '#facc15';
  const title = propTitle ?? task?.title;

  const isAttentive = isHovered || isAttention;
  const isHighlighted = isSelected || isHovered;

  // 選択・ホバー時の発光設定 (isSelected時はシアン、isHovered単体時はゴールド)
  const emissiveColor = useMemo(() => {
    if (isSelected) return '#38bdf8';
    if (isHovered) return '#facc15';
    return '#000000';
  }, [isSelected, isHovered]);

  const emissiveIntensity = isSelected ? 0.35 : isHovered ? 0.45 : 0;

  return (
    <group data-testid="duck-model">
      {/* ホバー / 選択時のアウトライン発光エフェクト */}
      {isHighlighted && (
        <group data-testid="duck-outline">
          <mesh geometry={duckGeometries.body} scale={[1.15, 1.0, 0.95]}>
            <meshBasicMaterial
              color={isSelected ? '#38bdf8' : '#facc15'}
              side={THREE.BackSide}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      )}

      {/* まるい胴体 + 尾羽 */}
      <group data-testid="duck-body">
        <mesh geometry={duckGeometries.body} scale={[1.1, 0.95, 0.9]} castShadow receiveShadow>
          <meshStandardMaterial
            color={duckColor}
            roughness={0.4}
            metalness={0.05}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* 尾羽 */}
        <mesh
          geometry={duckGeometries.tail}
          position={[-0.38, 0.15, 0]}
          rotation={[0, 0, Math.PI / 3]}
          castShadow
        >
          <meshStandardMaterial
            color={duckColor}
            roughness={0.4}
            metalness={0.05}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      </group>

      {/* 頭部（頭 + つぶらな目 / 注目時は少し顔を上げる） */}
      <group
        data-testid="duck-head"
        position={isAttentive ? [0.26, 0.35, 0] : [0.26, 0.32, 0]}
        rotation={isAttentive ? [-0.1, 0, 0] : [0, 0, 0]}
      >
        <mesh geometry={duckGeometries.head} scale={[1, 1, 0.95]} castShadow>
          <meshStandardMaterial
            color={duckColor}
            roughness={0.4}
            metalness={0.05}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* 左目 */}
        <mesh geometry={duckGeometries.eye} position={[0.1, 0.06, 0.16]}>
          <meshStandardMaterial color="#1e293b" roughness={0.2} />
        </mesh>

        {/* 右目 */}
        <mesh geometry={duckGeometries.eye} position={[0.1, 0.06, -0.16]}>
          <meshStandardMaterial color="#1e293b" roughness={0.2} />
        </mesh>
      </group>

      {/* くちばし（オレンジ） */}
      <mesh
        data-testid="duck-beak"
        geometry={duckGeometries.beak}
        position={isAttentive ? [0.51, 0.3, 0] : [0.51, 0.27, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 1.4, 0.7]}
        castShadow
      >
        <meshStandardMaterial color="#f97316" roughness={0.35} />
      </mesh>

      {/* 左右の小さな翼（注目時は羽を広げてアピール） */}
      <mesh
        data-testid="duck-wing-left"
        geometry={duckGeometries.wing}
        position={[0, 0.08, 0.34]}
        rotation={isAttentive ? [0.3, 0.3, -0.15] : [0.15, 0.1, -0.1]}
        castShadow
      >
        <meshStandardMaterial
          color={duckColor}
          roughness={0.4}
          metalness={0.05}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh
        data-testid="duck-wing-right"
        geometry={duckGeometries.wing}
        position={[0, 0.08, -0.34]}
        rotation={isAttentive ? [-0.3, -0.3, -0.15] : [-0.15, -0.1, -0.1]}
        castShadow
      >
        <meshStandardMaterial
          color={duckColor}
          roughness={0.4}
          metalness={0.05}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* 左右の足（オレンジ / 水泳時は非表示） */}
      {status !== 'done' && (
        <group data-testid="duck-feet">
          <mesh
            data-testid="duck-foot-left"
            geometry={duckGeometries.foot}
            position={[0.05, -0.36, 0.16]}
            rotation={[0, 0.1, 0]}
            castShadow
          >
            <meshStandardMaterial color="#ea580c" roughness={0.4} />
          </mesh>
          <mesh
            data-testid="duck-foot-right"
            geometry={duckGeometries.foot}
            position={[0.05, -0.36, -0.16]}
            rotation={[0, -0.1, 0]}
            castShadow
          >
            <meshStandardMaterial color="#ea580c" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* ステータス別アクセサリー */}
      {status === 'in-progress' && <Headband />}
      {status === 'done' && (
        <>
          <Crown />
          <FloatRing />
          <Sparkles />
        </>
      )}

      {/* 頭上「▼」黄色インジケーター（ホバー・注目時） */}
      {isAttentive && <HoverIndicator position={[0, 1.25, 0]} />}

      {/* 頭上タスクタイトルタグ */}
      {title && showTitleTag && <DuckTitleTag title={title} isSelected={isSelected} />}
    </group>
  );
}
