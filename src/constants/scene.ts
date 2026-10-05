/**
 * 3D箱庭ワールド（草原・池・境界・カメラ）の幾何定数および設定
 * docs/SPEC.md 3.2.1, 3.2.2 準拠
 */

// ワールド全体境界: X ∈ [-12, 12], Z ∈ [-12, 12]
export const WORLD_BOUNDS = {
  minX: -12,
  maxX: 12,
  minZ: -12,
  maxZ: 12,
} as const;

// 草原エリア (Roam Field): X ∈ [-12, 3], Z ∈ [-10, 10]
export const GRASS_BOUNDS = {
  minX: -12,
  maxX: 3,
  minZ: -10,
  maxZ: 10,
} as const;

// 池エリア (Peaceful Pond): X ∈ [5, 12], Z ∈ [-8, 8]
export const POND_BOUNDS = {
  minX: 5,
  maxX: 12,
  minZ: -8,
  maxZ: 8,
} as const;

// 境界フェンス位置 (草原と池の間: X = 3.8 ~ 4.0)
export const BOUNDARY_FENCE_X = 3.8;

// パン移動注視点クランプ境界 (ターゲットがワールド外に逃げないよう制限)
export const PAN_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: -10,
  maxZ: 10,
  minY: -0.5,
  maxY: 2.0,
} as const;

// アイソメトリックカメラ設定
// クォータービュー (斜め約 35.264° = atan(1/√2), Y軸回転 45°)
export const ISOMETRIC_CONFIG = {
  // アイソメトリック仰角 (rad / deg)
  ELEVATION_DEG: 35.26438968,
  AZIMUTH_DEG: 45,
  // デフォルトカメラ位置 (X=d, Y=d, Z=d は 35.264° 仰角 & 45° 回転を形成)
  DEFAULT_POSITION: [18, 18, 18] as [number, number, number],
  DEFAULT_TARGET: [0, 0, 0] as [number, number, number],
  // 視野角 (擬似アイソメトリックの狭角Perspective FOV)
  FOV: 35,
  // オービット水平回転制限 (45° ± 30° -> [15°, 75°])
  MIN_AZIMUTH: (15 * Math.PI) / 180, // π/12 ≈ 0.2618 rad
  MAX_AZIMUTH: (75 * Math.PI) / 180, // 5π/12 ≈ 1.3090 rad
  // オービット仰角回転制限 (約 54.736° ± 18°)
  MIN_POLAR: (36 * Math.PI) / 180, // ≈ 0.6283 rad
  MAX_POLAR: (73 * Math.PI) / 180, // ≈ 1.2741 rad
  // ズーム制限 (最小・最大距離)
  MIN_DISTANCE: 12,
  MAX_DISTANCE: 42,
} as const;

// カラーパレット (温かみのあるパステル調)
export const SCENE_COLORS = {
  // 草原
  grassMint: '#6ee7b7',
  grassMintDark: '#34d399',
  grassSoil: '#785338',
  grassGrid: '#a7f3d0',
  // 池
  pondWater: '#38bdf8',
  pondWaterDeep: '#0284c7',
  pondSand: '#fde68a',
  pondLily: '#22c55e',
  // 境界・ジオラマ台座
  woodFence: '#854d0e',
  steppingStone: '#94a3b8',
  steppingStoneLight: '#cbd5e1',
  dioramaBase: '#475569',
  // 装飾
  flowerPink: '#f472b6',
  flowerYellow: '#fde047',
  flowerWhite: '#f8fafc',
} as const;
