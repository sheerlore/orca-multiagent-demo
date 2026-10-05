import { GRASS_BOUNDS, POND_BOUNDS } from '../constants/scene';
import type { Task, TaskStatus } from '../types/task';
import { duckPositionRegistry } from './duckPositionRegistry';

export type DuckAIState =
  | 'IDLE'
  | 'WALKING'
  | 'SWIMMING'
  | 'CELEBRATING_JUMP'
  | 'CELEBRATING_MARCH';

export interface Vector2D {
  x: number;
  z: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface AnimationPose {
  bodyRoll: number; // 左右ロッキング (X軸回転)
  peckPitch: number; // 地面をつつく / ピッチ (Z軸回転)
  tailWiggle: number; // 尾羽フリフリ (Y軸回転)
  headTilt: number; // 首かしげ (X軸回転)
  headYaw: number; // 首振り (Y軸回転)
  leftFootRotZ: number; // 足の交互回転 (Z軸回転)
  rightFootRotZ: number;
  bobY: number; // 上下動オフセット
}

/**
 * タスク状態に応じたエリア境界を取得（マージン適用）
 * 草原境界: X ∈ [-12, 3], Z ∈ [-10, 10]
 * 池境界: X ∈ [5, 12], Z ∈ [-8, 8]
 */
export function getAreaBounds(status: TaskStatus, margin = 0.6): Bounds2D {
  if (status === 'done') {
    return {
      minX: POND_BOUNDS.minX + margin,
      maxX: POND_BOUNDS.maxX - margin,
      minZ: POND_BOUNDS.minZ + margin,
      maxZ: POND_BOUNDS.maxZ - margin,
    };
  }

  return {
    minX: GRASS_BOUNDS.minX + margin,
    maxX: GRASS_BOUNDS.maxX - margin,
    minZ: GRASS_BOUNDS.minZ + margin,
    maxZ: GRASS_BOUNDS.maxZ - margin,
  };
}

/**
 * 境界内のランダム目標地点を選定
 */
export function getRandomTargetInBounds(
  bounds: Bounds2D,
  randomFn: () => number = Math.random
): Vector2D {
  return {
    x: bounds.minX + randomFn() * (bounds.maxX - bounds.minX),
    z: bounds.minZ + randomFn() * (bounds.maxZ - bounds.minZ),
  };
}

/**
 * 境界外への飛び出しを防止し、境界接触時は内側へ反射・クランプする
 */
export function enforceBounds(
  pos: Vector2D,
  velocity: Vector2D,
  bounds: Bounds2D
): {
  clampedPos: Vector2D;
  reflectedVel: Vector2D;
  hitBoundary: boolean;
} {
  let hit = false;
  let px = pos.x;
  let pz = pos.z;
  let vx = velocity.x;
  let vz = velocity.z;

  if (px <= bounds.minX) {
    px = bounds.minX;
    if (vx < 0) vx = -vx;
    hit = true;
  } else if (px >= bounds.maxX) {
    px = bounds.maxX;
    if (vx > 0) vx = -vx;
    hit = true;
  }

  if (pz <= bounds.minZ) {
    pz = bounds.minZ;
    if (vz < 0) vz = -vz;
    hit = true;
  } else if (pz >= bounds.maxZ) {
    pz = bounds.maxZ;
    if (vz > 0) vz = -vz;
    hit = true;
  }

  return {
    clampedPos: { x: px, z: pz },
    reflectedVel: { x: vx, z: vz },
    hitBoundary: hit,
  };
}

/**
 * 他のアヒルとの近接検知および重なり緩和のための反発ベクトル（Separation vector）を計算
 */
export function calculateSeparationVector(
  currentPos: Vector2D,
  neighbors: Vector2D[],
  radius = 0.9,
  maxForce = 1.6
): Vector2D {
  let forceX = 0;
  let forceZ = 0;
  const radiusSq = radius * radius;

  for (const neighbor of neighbors) {
    const dx = currentPos.x - neighbor.x;
    const dz = currentPos.z - neighbor.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < radiusSq) {
      if (distSq < 0.000001) {
        // 重なり衝突時（初期化時等の同一座標）：ランダムまたは固定斜め方向へ押し出し
        forceX += maxForce * 0.7071;
        forceZ += maxForce * 0.7071;
      } else {
        const dist = Math.sqrt(distSq);
        // 近づくほど反発力が強くなる線形減衰
        const strength = (1 - dist / radius) * maxForce;
        forceX += (dx / dist) * strength;
        forceZ += (dz / dist) * strength;
      }
    }
  }

  // 合計反発力をmaxForceでクランプ
  const totalSq = forceX * forceX + forceZ * forceZ;
  if (totalSq > maxForce * maxForce) {
    const totalDist = Math.sqrt(totalSq);
    forceX = (forceX / totalDist) * maxForce;
    forceZ = (forceZ / totalDist) * maxForce;
  }

  return { x: forceX, z: forceZ };
}

/**
 * アヒルのローカル+Xがワールド移動方向(dx, dz)に向くための回転Y角度(rad)を計算
 */
export function calculateHeadingAngle(from: Vector2D, to: Vector2D): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(-dz, dx);
}

/**
 * 最短円弧による角度補間 (Slerp / shortest arc interpolation)
 */
export function slerpAngle(currentAngle: number, targetAngle: number, alpha: number): number {
  let diff = targetAngle - currentAngle;
  // [-PI, PI] に正規化して最短方向を選択
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return currentAngle + diff * Math.min(1, Math.max(0, alpha));
}

/**
 * 期限(DueDate)と歩行速度・アニメーション速度の連動アルゴリズム (docs/SPEC.md 3.3.4準拠)
 */
export function calculateSpeedMultiplier(
  task: Task,
  now: number = Date.now()
): { speedMultiplier: number; animSpeedMultiplier: number } {
  if (task.status === 'done') {
    return { speedMultiplier: 0.6, animSpeedMultiplier: 0.6 };
  }
  if (!task.dueDate) {
    return { speedMultiplier: 1.0, animSpeedMultiplier: 1.0 };
  }

  const dueMs = new Date(task.dueDate).getTime();
  if (Number.isNaN(dueMs)) {
    return { speedMultiplier: 1.0, animSpeedMultiplier: 1.0 };
  }

  const diffHours = (dueMs - now) / (1000 * 60 * 60);

  if (diffHours < 0) {
    // 期限超過 (Overdue): 2.0x
    return { speedMultiplier: 2.0, animSpeedMultiplier: 2.0 };
  }
  if (diffHours <= 4) {
    // 0〜4時間 (直前パニック): 2.5x
    return { speedMultiplier: 2.5, animSpeedMultiplier: 2.5 };
  }
  if (diffHours <= 24) {
    // 4〜24時間 (焦り気味): 1.8x
    return { speedMultiplier: 1.8, animSpeedMultiplier: 1.8 };
  }
  if (diffHours <= 48) {
    // 24〜48時間 (やや早足): 1.3x
    return { speedMultiplier: 1.3, animSpeedMultiplier: 1.3 };
  }
  // 48時間以上 (余裕マイペース): 1.0x
  return { speedMultiplier: 1.0, animSpeedMultiplier: 1.0 };
}

/**
 * よちよち歩きアニメーション計算（左右ロッキング＋足の交互回転）
 */
export function calculateWaddlePose(walkPhase: number): AnimationPose {
  const roll = Math.sin(walkPhase) * 0.16;
  const footSwing = Math.sin(walkPhase) * 0.45;
  const bob = Math.abs(Math.sin(walkPhase)) * 0.04;

  return {
    bodyRoll: roll,
    peckPitch: 0,
    tailWiggle: Math.sin(walkPhase * 2) * 0.1,
    headTilt: -roll * 0.5,
    headYaw: 0,
    leftFootRotZ: footSwing,
    rightFootRotZ: -footSwing,
    bobY: bob,
  };
}

/**
 * アイドル待機アニメーション計算（尾羽フリフリ、地面をつつくPecking、首かしげ）
 */
export function calculateIdlePose(time: number, seed: number): AnimationPose {
  // 尾羽フリフリ (小刻みで速い左右揺れ)
  const tail = Math.sin(time * 12 + seed) * 0.35;
  // 首かしげ (ゆっくり傾き)
  const tilt = Math.sin(time * 2.2 + seed) * 0.22;

  // 地面をつつく (約3秒に1回、0.7秒間頭・胴体を下げる)
  const cycle = (time + seed * 1.5) % 3.2;
  let peck = 0;
  if (cycle > 1.8 && cycle < 2.5) {
    const peckProgress = (cycle - 1.8) / 0.7;
    peck = Math.sin(peckProgress * Math.PI) * 0.38;
  }

  return {
    bodyRoll: 0,
    peckPitch: -peck,
    tailWiggle: tail,
    headTilt: tilt,
    headYaw: Math.sin(time * 1.5 + seed) * 0.15,
    leftFootRotZ: 0,
    rightFootRotZ: 0,
    bobY: -peck * 0.04,
  };
}

/**
 * 水泳アニメーション計算（水面でのプカプカ浮遊と緩やかな回遊揺れ）
 */
export function calculateSwimmingPose(time: number, seed: number): AnimationPose {
  const floatY = Math.sin(time * 1.8 + seed) * 0.02;
  const swayRoll = Math.sin(time * 1.4 + seed) * 0.04;
  const swayPitch = Math.cos(time * 1.1 + seed) * 0.03;

  return {
    bodyRoll: swayRoll,
    peckPitch: swayPitch,
    tailWiggle: Math.sin(time * 2.5 + seed) * 0.12,
    headTilt: Math.sin(time * 1.0 + seed) * 0.08,
    headYaw: Math.sin(time * 0.8 + seed) * 0.1,
    leftFootRotZ: 0,
    rightFootRotZ: 0,
    bobY: floatY,
  };
}

/**
 * タスク完了時の宙返りジャンプアニメーション計算 (360度一回転・約1.0秒)
 */
export function calculateJumpPose(progress: number, timer: number): AnimationPose {
  // ピョンと360度宙返り回転 (0 -> -2π)
  const flip = -progress * Math.PI * 2;
  // 左右に少し揺れながら羽ばたく
  const roll = Math.sin(progress * Math.PI * 2) * 0.15;
  const tail = Math.sin(timer * 22) * 0.35;
  const footSwing = Math.sin(progress * Math.PI * 4) * 0.4;

  return {
    bodyRoll: roll,
    peckPitch: flip,
    tailWiggle: tail,
    headTilt: -0.2,
    headYaw: 0,
    leftFootRotZ: footSwing,
    rightFootRotZ: -footSwing,
    bobY: 0,
  };
}

/**
 * 草原から池への一直線行進（パタパタ小走り）アニメーション計算
 */
export function calculateMarchPose(walkPhase: number): AnimationPose {
  const roll = Math.sin(walkPhase) * 0.22;
  const footSwing = Math.sin(walkPhase) * 0.6;
  const bob = Math.abs(Math.sin(walkPhase)) * 0.05;

  return {
    bodyRoll: roll,
    peckPitch: 0.22, // 意欲的な前傾姿勢
    tailWiggle: Math.sin(walkPhase * 2) * 0.3,
    headTilt: -roll * 0.5,
    headYaw: 0,
    leftFootRotZ: footSwing,
    rightFootRotZ: -footSwing,
    bobY: bob,
  };
}

export interface DuckAIControllerOptions {
  id: string;
  status: TaskStatus;
  index: number;
  initialPos: [number, number, number];
}

/**
 * 自律歩行ステートマシンコントローラー
 * IDLE -> WALKING -> IDLE または SWIMMING (done時)
 */
export class DuckAIController {
  public id: string;
  public state: DuckAIState;
  public position: { x: number; y: number; z: number };
  public heading: number;
  public target: Vector2D;
  public stateTimer: number;
  public walkPhase: number;
  public totalTime: number;
  public seed: number;
  public baseSpeed: number;
  public baseY: number;
  public isPond: boolean;
  public celebrationTimer: number = 0;
  public celebrationJumpDuration: number = 1.0;
  public celebrationOrigin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  public celebrationTarget: Vector2D = { x: 7, z: 0 };
  public onSplash?: () => void;

  constructor(options: DuckAIControllerOptions) {
    this.id = options.id;
    this.seed = options.index * 1.37 + 0.5;
    this.isPond = options.status === 'done';
    this.state = this.isPond ? 'SWIMMING' : 'IDLE';
    this.position = {
      x: options.initialPos[0],
      y: options.initialPos[1],
      z: options.initialPos[2],
    };
    this.baseY = options.initialPos[1];
    // 初期向きはエリア中心に向くように設定
    const center = this.isPond ? { x: 8.5, z: 0 } : { x: -4.5, z: 0 };
    this.heading = calculateHeadingAngle(this.position, center);
    this.target = { x: this.position.x, z: this.position.z };
    // 初期待機時間: 2〜5秒のランダム
    this.stateTimer = 2.0 + ((options.index * 1.7) % 3.0);
    this.walkPhase = options.index * 0.5;
    this.totalTime = 0;
    this.baseSpeed = this.isPond ? 0.7 : 1.1;
  }

  /**
   * 池エリアへ同期（ステータスがdoneに変更された場合）
   */
  syncToPond(pondPos: [number, number, number]): void {
    this.isPond = true;
    this.state = 'SWIMMING';
    this.position.x = pondPos[0];
    this.position.y = pondPos[1];
    this.position.z = pondPos[2];
    this.baseY = pondPos[1];
    const bounds = getAreaBounds('done', 0.6);
    this.target = getRandomTargetInBounds(bounds);
    this.stateTimer = 5.0 + Math.random() * 5.0;
  }

  /**
   * 草原エリアへ同期（ステータスがdoneから未完了に戻された場合）
   */
  syncToGrass(grassPos: [number, number, number]): void {
    this.isPond = false;
    this.state = 'IDLE';
    this.position.x = grassPos[0];
    this.position.y = grassPos[1];
    this.position.z = grassPos[2];
    this.baseY = grassPos[1];
    this.stateTimer = 2.0 + Math.random() * 3.0;
  }

  /**
   * タスク完了セレブレーションを開始（宙返りジャンプ -> 池へパタパタ移動 -> 水泳）
   */
  startCelebration(pondTargetPos: [number, number, number], onSplash?: () => void): void {
    this.state = 'CELEBRATING_JUMP';
    this.celebrationTimer = 0;
    this.celebrationOrigin = { ...this.position };
    this.celebrationTarget = { x: pondTargetPos[0], z: pondTargetPos[2] };
    this.onSplash = onSplash;
    this.isPond = false;
  }

  /**
   * 1フレームのAIシミュレーション更新
   */
  step(delta: number, neighbors: Vector2D[], task: Task): AnimationPose {
    this.totalTime += delta;
    const isDone = task.status === 'done';
    const isCelebrating =
      this.state === 'CELEBRATING_JUMP' || this.state === 'CELEBRATING_MARCH';

    // 外部からのタスクステータス切り替え同期（セレブレーション実行中は上書きしない）
    if (isDone && !this.isPond && !isCelebrating) {
      this.isPond = true;
      this.state = 'SWIMMING';
      this.baseY = 0.05;
      const bounds = getAreaBounds('done', 0.6);
      this.target = getRandomTargetInBounds(bounds);
      this.stateTimer = 5.0 + Math.random() * 5.0;
    } else if (!isDone && (this.isPond || isCelebrating)) {
      this.isPond = false;
      this.state = 'IDLE';
      this.baseY = 0.45;
      this.stateTimer = 2.0 + Math.random() * 3.0;
    }

    const { speedMultiplier, animSpeedMultiplier } = calculateSpeedMultiplier(task);
    const bounds = getAreaBounds(task.status, 0.6);
    let pose: AnimationPose;

    if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        // IDLE終了 -> WALKINGへ遷移
        this.state = 'WALKING';
        this.target = getRandomTargetInBounds(bounds);
        // 歩行持続制限時間 (4〜8秒)
        this.stateTimer = 4.0 + Math.random() * 4.0;
      }
      pose = calculateIdlePose(this.totalTime, this.seed);
    } else if (this.state === 'WALKING') {
      this.stateTimer -= delta;

      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      // 目標地点到達またはタイムアウトでIDLEへ遷移
      if (distToTarget < 0.35 || this.stateTimer <= 0) {
        this.state = 'IDLE';
        // 2〜5秒のランダム待機
        this.stateTimer = 2.0 + Math.random() * 3.0;
        pose = calculateIdlePose(this.totalTime, this.seed);
      } else {
        // 目標方向へのSlerp回転補間
        const targetHeading = calculateHeadingAngle(this.position, this.target);
        this.heading = slerpAngle(this.heading, targetHeading, 6.0 * delta);

        // 前進移動
        const moveSpeed = this.baseSpeed * speedMultiplier;
        let vx = Math.cos(this.heading) * moveSpeed;
        let vz = -Math.sin(this.heading) * moveSpeed;

        // 他のアヒルとの近接検知・反発力適用
        const separation = calculateSeparationVector(this.position, neighbors, 0.9, 1.5);
        vx += separation.x;
        vz += separation.z;

        // 境界制御と内側への反転
        const newPos = {
          x: this.position.x + vx * delta,
          z: this.position.z + vz * delta,
        };

        const { clampedPos, hitBoundary } = enforceBounds(
          newPos,
          { x: vx, z: vz },
          bounds
        );

        this.position.x = clampedPos.x;
        this.position.z = clampedPos.z;

        if (hitBoundary) {
          // 境界に接触したら内側へ新しい目的地を設定
          this.target = getRandomTargetInBounds(bounds);
        }

        // よちよち歩きアニメーションの進行
        this.walkPhase += delta * 8.0 * animSpeedMultiplier;
        pose = calculateWaddlePose(this.walkPhase);
      }
    } else if (this.state === 'CELEBRATING_JUMP') {
      // 宙返りジャンプ (放物線跳躍 + 360度ピッチ回転)
      this.celebrationTimer += delta;
      const progress = Math.min(1, this.celebrationTimer / this.celebrationJumpDuration);

      this.position.x = this.celebrationOrigin.x;
      this.position.z = this.celebrationOrigin.z;
      this.position.y = this.celebrationOrigin.y + Math.sin(progress * Math.PI) * 1.3;

      pose = calculateJumpPose(progress, this.celebrationTimer);

      if (progress >= 1.0) {
        // 着地して池への行進へ移行
        this.state = 'CELEBRATING_MARCH';
        this.position.y = this.celebrationOrigin.y;
        this.heading = calculateHeadingAngle(this.position, this.celebrationTarget);
      }
    } else if (this.state === 'CELEBRATING_MARCH') {
      // 池への一直線移動 (パタパタ小走り)
      const targetHeading = calculateHeadingAngle(this.position, this.celebrationTarget);
      this.heading = slerpAngle(this.heading, targetHeading, 8.0 * delta);

      const marchSpeed = 2.8;
      const vx = Math.cos(this.heading) * marchSpeed;
      const vz = -Math.sin(this.heading) * marchSpeed;

      this.position.x += vx * delta;
      this.position.z += vz * delta;

      this.walkPhase += delta * 16.0;
      pose = calculateMarchPose(this.walkPhase);

      const dx = this.celebrationTarget.x - this.position.x;
      const dz = this.celebrationTarget.z - this.position.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      // 池エリア到達判定 (X >= 5.5 または目標地点至近)
      if (this.position.x >= 5.5 || distToTarget < 0.5) {
        // 「ポチャン！」と池に飛び込み遊泳モードへ
        this.isPond = true;
        this.state = 'SWIMMING';
        this.baseY = 0.05;
        this.position.y = 0.05;
        const pondBounds = getAreaBounds('done', 0.6);
        this.target = getRandomTargetInBounds(pondBounds);
        this.stateTimer = 5.0 + Math.random() * 5.0;
        this.onSplash?.();
      }
    } else {
      // SWIMMING (done専用ステート)
      this.stateTimer -= delta;

      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      if (distToTarget < 0.5 || this.stateTimer <= 0) {
        this.target = getRandomTargetInBounds(bounds);
        this.stateTimer = 5.0 + Math.random() * 6.0;
      }

      // 穏やかな回転と回遊
      const targetHeading = calculateHeadingAngle(this.position, this.target);
      this.heading = slerpAngle(this.heading, targetHeading, 2.5 * delta);

      const swimSpeed = 0.55 * speedMultiplier;
      let vx = Math.cos(this.heading) * swimSpeed;
      let vz = -Math.sin(this.heading) * swimSpeed;

      const separation = calculateSeparationVector(this.position, neighbors, 1.1, 1.2);
      vx += separation.x;
      vz += separation.z;

      const newPos = {
        x: this.position.x + vx * delta,
        z: this.position.z + vz * delta,
      };

      const { clampedPos, hitBoundary } = enforceBounds(
        newPos,
        { x: vx, z: vz },
        bounds
      );

      this.position.x = clampedPos.x;
      this.position.z = clampedPos.z;

      if (hitBoundary) {
        this.target = getRandomTargetInBounds(bounds);
      }

      pose = calculateSwimmingPose(this.totalTime, this.seed);
    }

    // Y軸浮遊・歩行ボビングを適用 (CELEBRATING_JUMP以外)
    if (this.state !== 'CELEBRATING_JUMP') {
      this.position.y = this.baseY + pose.bobY;
    }

    return pose;
  }
}

export { duckPositionRegistry };
