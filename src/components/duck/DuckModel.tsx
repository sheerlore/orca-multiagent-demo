import { useMemo } from 'react';
import type { Task, TaskStatus } from '../../types/task';
import { duckGeometries } from './geometries';
import { Headband, Crown, FloatRing, Sparkles } from './accessories';
import { DuckTitleTag } from './DuckTitleTag';

export interface DuckModelProps {
  status?: TaskStatus;
  duckColor?: string;
  isSelected?: boolean;
  title?: string;
  task?: Task;
  showTitleTag?: boolean;
}

/**
 * 低ポリゴンアヒル3Dモデルコンポーネント。
 * まるい胴体、頭、くちばし（オレンジ）、左右の小さな翼、左右の足（オレンジ）からなる階層グループを構成します。
 * タスク固有の duckColor をマテリアル色に動的反映し、ステータスに応じたアクセサリーを描画します。
 */
export function DuckModel({
  status: propStatus,
  duckColor: propDuckColor,
  isSelected = false,
  title: propTitle,
  task,
  showTitleTag = true,
}: DuckModelProps) {
  const status = propStatus ?? task?.status ?? 'todo';
  const duckColor = propDuckColor ?? task?.duckColor ?? '#facc15';
  const title = propTitle ?? task?.title;

  // 選択時の発光設定
  const emissiveColor = useMemo(() => (isSelected ? '#38bdf8' : '#000000'), [isSelected]);
  const emissiveIntensity = isSelected ? 0.35 : 0;

  return (
    <group data-testid="duck-model">
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

      {/* 頭部（頭 + つぶらな目） */}
      <group data-testid="duck-head" position={[0.26, 0.32, 0]}>
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
        position={[0.51, 0.27, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 1.4, 0.7]}
        castShadow
      >
        <meshStandardMaterial color="#f97316" roughness={0.35} />
      </mesh>

      {/* 左右の小さな翼 */}
      <mesh
        data-testid="duck-wing-left"
        geometry={duckGeometries.wing}
        position={[0, 0.08, 0.34]}
        rotation={[0.15, 0.1, -0.1]}
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
        rotation={[-0.15, -0.1, -0.1]}
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

      {/* 頭上タスクタイトルタグ */}
      {title && showTitleTag && <DuckTitleTag title={title} isSelected={isSelected} />}
    </group>
  );
}
