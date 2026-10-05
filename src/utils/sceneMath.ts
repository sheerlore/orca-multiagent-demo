import {
  GRASS_BOUNDS,
  ISOMETRIC_CONFIG,
  PAN_BOUNDS,
  POND_BOUNDS,
  WORLD_BOUNDS,
} from '../constants/scene';
import type { TaskStatus } from '../types/task';

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * 数値を指定範囲内にクランプする
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 座標が2D境界範囲内にあるか判定
 */
export function isWithinBounds(x: number, z: number, bounds: BoundingBox2D): boolean {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

/**
 * カメラの注視点(Target)を許容範囲内にクランプする
 */
export function clampTarget(
  target: { x: number; y: number; z: number },
  bounds: typeof PAN_BOUNDS = PAN_BOUNDS
): { x: number; y: number; z: number } {
  return {
    x: clamp(target.x, bounds.minX, bounds.maxX),
    y: clamp(target.y, bounds.minY, bounds.maxY),
    z: clamp(target.z, bounds.minZ, bounds.maxZ),
  };
}

/**
 * 距離 D に基づく純粋なアイソメトリック位置 [x, y, z] を計算
 * 仰角 35.264° (atan(1/√2)), 水平角 45°
 * x = y = z = D / √3
 */
export function calculateIsometricPosition(distance: number): [number, number, number] {
  const coord = distance / Math.sqrt(3);
  return [coord, coord, coord];
}

/**
 * タスクのステータスとインデックスに応じた箱庭内スポーン位置を計算
 * 草原エリア: X ∈ [-10, 1], Z ∈ [-7, 7]
 * 池エリア: X ∈ [6.5, 10.5], Z ∈ [-5, 5]
 */
export function getDuckSpawnPosition(status: TaskStatus, index: number): [number, number, number] {
  if (status === 'done') {
    // 池エリア (水面 Y = 0.05)
    // X ∈ [6.5, 10.5], Z ∈ [-5, 5]
    const pondWidth = POND_BOUNDS.maxX - POND_BOUNDS.minX - 3; // 4
    const pondDepth = POND_BOUNDS.maxZ - POND_BOUNDS.minZ - 6; // 10
    const x = POND_BOUNDS.minX + 1.5 + ((index * 2.3) % pondWidth);
    const z = POND_BOUNDS.minZ + 3 + ((index * 3.7) % pondDepth);
    return [x, 0.05, z];
  }

  // 草原エリア (地上 Y = 0.45)
  // X ∈ [-10, 1], Z ∈ [-7, 7]
  const grassWidth = GRASS_BOUNDS.maxX - GRASS_BOUNDS.minX - 4; // 11
  const grassDepth = GRASS_BOUNDS.maxZ - GRASS_BOUNDS.minZ - 6; // 14
  const x = GRASS_BOUNDS.minX + 2 + ((index * 3.1) % grassWidth);
  const z = GRASS_BOUNDS.minZ + 3 + ((index * 2.7) % grassDepth);
  return [x, 0.45, z];
}

export { WORLD_BOUNDS, GRASS_BOUNDS, POND_BOUNDS, PAN_BOUNDS, ISOMETRIC_CONFIG };
