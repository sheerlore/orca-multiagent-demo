import { GRASS_BOUNDS, POND_BOUNDS } from '../constants/scene';
import type { Task, TaskStatus } from '../types/task';
import { duckPositionRegistry } from './duckPositionRegistry';
import {
  calculateUrgency,
  type UrgencyInfo,
  type UrgencyLevel,
} from './urgency';

export type DuckAIState = 'IDLE' | 'WALKING' | 'SWIMMING';

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
  leftWingRotX: number; // 左翼羽ばたき (X軸回転)
  rightWingRotX: number; // 右翼羽ばたき (X軸回転)
  leftWingRotZ: number; // 左翼開き (Z軸回転)
  rightWingRotZ: number; // 右翼開き (Z軸回転)
  wingFlapAngle: number; // 羽ばたき角度
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
  const urgency = calculateUrgency(task.dueDate, task.status, new Date(now));
  return {
    speedMultiplier: urgency.speedMultiplier,
    animSpeedMultiplier: urgency.animSpeedMultiplier,
  };
}

/**
 * よちよち歩きアニメーション計算（左右ロッキング＋足の交互回転＋緊急度羽ばたき）
 */
export function calculateWaddlePose(
  walkPhase: number,
  urgencyLevel: UrgencyLevel = 'normal',
  totalTime = 0
): AnimationPose {
  // 緊急度に応じた羽ばたき角度・周波数の計算
  let wingFlapAngle = 0;
  let bobMultiplier = 1.0;
  let rollMultiplier = 1.0;

  if (urgencyLevel === 'critical') {
    // 4時間未満（critical）: 激しい羽ばたき（wingFlapSpeedが超高速 36 rad/s）+ 猛ダッシュボビング
    wingFlapAngle = Math.sin(totalTime * 36.0) * 0.55;
    bobMultiplier = 1.6;
    rollMultiplier = 1.35;
  } else if (urgencyLevel === 'panicked') {
    // 4〜24時間（panicked）: 焦り気味のパタパタ羽ばたき
    wingFlapAngle = Math.sin(totalTime * 18.0) * 0.28;
    bobMultiplier = 1.25;
    rollMultiplier = 1.15;
  } else if (urgencyLevel === 'overdue') {
    // 期限超過（overdue）: 怒りのプンプク足踏み・羽ばたき
    wingFlapAngle = Math.sin(totalTime * 12.0) * 0.18;
    bobMultiplier = 1.3;
  } else if (urgencyLevel === 'hurried') {
    // 24〜48時間（hurried）: やや早足・微かな羽の浮き
    wingFlapAngle = Math.sin(totalTime * 10.0) * 0.1;
  }

  const roll = Math.sin(walkPhase) * 0.16 * rollMultiplier;
  const footSwing = Math.sin(walkPhase) * 0.45;
  const bob = Math.abs(Math.sin(walkPhase)) * 0.04 * bobMultiplier;

  return {
    bodyRoll: roll,
    peckPitch: 0,
    tailWiggle: Math.sin(walkPhase * 2) * 0.1,
    headTilt: -roll * 0.5,
    headYaw: 0,
    leftFootRotZ: footSwing,
    rightFootRotZ: -footSwing,
    bobY: bob,
    leftWingRotX: wingFlapAngle,
    rightWingRotX: wingFlapAngle === 0 ? 0 : -wingFlapAngle,
    leftWingRotZ: 0.1 + Math.abs(wingFlapAngle) * 0.5,
    rightWingRotZ: 0.1 + Math.abs(wingFlapAngle) * 0.5,
    wingFlapAngle,
  };
}

/**
 * アイドル待機アニメーション計算（尾羽フリフリ、地面をつつくPecking、首かしげ、緊急時その場羽ばたき）
 */
export function calculateIdlePose(
  time: number,
  seed: number,
  urgencyLevel: UrgencyLevel = 'normal'
): AnimationPose {
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

  let wingFlapAngle = 0;
  let idleBob = -peck * 0.04;
  let idleTail = tail;
  let idleTilt = tilt;

  if (urgencyLevel === 'critical') {
    // アイドル待機中でも直前パニック時はその場で激しく羽ばたき・首振り
    wingFlapAngle = Math.sin(time * 36.0) * 0.45;
    idleBob += Math.abs(Math.sin(time * 14.0)) * 0.03;
    idleTail = Math.sin(time * 24.0 + seed) * 0.45;
    idleTilt = Math.sin(time * 12.0 + seed) * 0.25;
  } else if (urgencyLevel === 'panicked') {
    wingFlapAngle = Math.sin(time * 18.0) * 0.2;
    idleTail = Math.sin(time * 18.0 + seed) * 0.4;
  } else if (urgencyLevel === 'overdue') {
    wingFlapAngle = Math.sin(time * 10.0) * 0.12;
  }

  return {
    bodyRoll: 0,
    peckPitch: -peck,
    tailWiggle: idleTail,
    headTilt: idleTilt,
    headYaw: Math.sin(time * 1.5 + seed) * 0.15,
    leftFootRotZ: 0,
    rightFootRotZ: 0,
    bobY: idleBob,
    leftWingRotX: wingFlapAngle,
    rightWingRotX: wingFlapAngle === 0 ? 0 : -wingFlapAngle,
    leftWingRotZ: 0.1 + Math.abs(wingFlapAngle) * 0.5,
    rightWingRotZ: 0.1 + Math.abs(wingFlapAngle) * 0.5,
    wingFlapAngle,
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
    leftWingRotX: 0,
    rightWingRotX: 0,
    leftWingRotZ: 0.1,
    rightWingRotZ: 0.1,
    wingFlapAngle: 0,
  };
}

export interface DuckAIControllerOptions {
  id: string;
  status: TaskStatus;
  index: number;
  initialPos: [number, number, number];
  dueDate?: string | null;
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
  public urgency: UrgencyInfo;

  constructor(options: DuckAIControllerOptions) {
    this.id = options.id;
    this.seed = options.index * 1.37 + 0.5;
    this.isPond = options.status === 'done';
    this.state = this.isPond ? 'SWIMMING' : 'IDLE';
    this.urgency = calculateUrgency(options.dueDate, options.status);
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
   * stepメソッドのエイリアス (AIコントローラー更新)
   */
  update(delta: number, neighbors: Vector2D[], task: Task): AnimationPose {
    return this.step(delta, neighbors, task);
  }

  /**
   * 緊急度情報の明示的設定
   */
  setUrgency(urgency: UrgencyInfo): void {
    this.urgency = urgency;
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
   * 1フレームのAIシミュレーション更新
   */
  step(delta: number, neighbors: Vector2D[], task: Task): AnimationPose {
    this.totalTime += delta;
    const isDone = task.status === 'done';

    // 外部からのタスクステータス切り替え同期
    if (isDone && this.state !== 'SWIMMING') {
      this.isPond = true;
      this.state = 'SWIMMING';
      this.baseY = 0.05;
      const bounds = getAreaBounds('done', 0.6);
      this.target = getRandomTargetInBounds(bounds);
      this.stateTimer = 5.0 + Math.random() * 5.0;
    } else if (!isDone && this.state === 'SWIMMING') {
      this.isPond = false;
      this.state = 'IDLE';
      this.baseY = 0.45;
      this.stateTimer = 2.0 + Math.random() * 3.0;
    }

    const urgency = calculateUrgency(task.dueDate, task.status);
    this.urgency = urgency;
    const { speedMultiplier, animSpeedMultiplier, urgencyLevel } = urgency;
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
      pose = calculateIdlePose(this.totalTime, this.seed, urgencyLevel);
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
        pose = calculateIdlePose(this.totalTime, this.seed, urgencyLevel);
      } else {
        // 目標方向へのSlerp回転補間 (スピードが速い時は素早く旋回)
        const targetHeading = calculateHeadingAngle(this.position, this.target);
        this.heading = slerpAngle(this.heading, targetHeading, 6.0 * delta * Math.min(2.0, speedMultiplier));

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

        // よちよち歩きアニメーションの進行 (animSpeedMultiplierを反映)
        this.walkPhase += delta * 8.0 * animSpeedMultiplier;
        pose = calculateWaddlePose(this.walkPhase, urgencyLevel, this.totalTime);
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

    // Y軸浮遊・歩行ボビングを適用
    this.position.y = this.baseY + pose.bobY;

    return pose;
  }
}

export { duckPositionRegistry };
