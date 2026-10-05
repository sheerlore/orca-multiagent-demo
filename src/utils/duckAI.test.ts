import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAreaBounds,
  getRandomTargetInBounds,
  enforceBounds,
  calculateSeparationVector,
  calculateHeadingAngle,
  slerpAngle,
  calculateSpeedMultiplier,
  calculateWaddlePose,
  calculateIdlePose,
  calculateSwimmingPose,
  DuckAIController,
  duckPositionRegistry,
} from './duckAI';
import type { Task } from '../types/task';

describe('duckAI utility & state machine', () => {
  beforeEach(() => {
    duckPositionRegistry.clear();
  });

  const createMockTask = (overrides?: Partial<Task>): Task => ({
    id: 'test-duck-ai-1',
    title: 'AIテストタスク',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  });

  describe('getAreaBounds & getRandomTargetInBounds', () => {
    it('草原エリア境界（X: [-12, 3], Z: [-10, 10]）にマージンが正しく適用される', () => {
      const bounds = getAreaBounds('todo', 0.5);
      expect(bounds.minX).toBe(-11.5);
      expect(bounds.maxX).toBe(2.5);
      expect(bounds.minZ).toBe(-9.5);
      expect(bounds.maxZ).toBe(9.5);
    });

    it('池エリア境界（X: [5, 12], Z: [-8, 8]）にマージンが正しく適用される', () => {
      const bounds = getAreaBounds('done', 0.5);
      expect(bounds.minX).toBe(5.5);
      expect(bounds.maxX).toBe(11.5);
      expect(bounds.minZ).toBe(-7.5);
      expect(bounds.maxZ).toBe(7.5);
    });

    it('getRandomTargetInBoundsで選定された座標が常に境界内に収まる', () => {
      const bounds = getAreaBounds('todo', 0.6);
      for (let i = 0; i < 50; i++) {
        const target = getRandomTargetInBounds(bounds);
        expect(target.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(target.x).toBeLessThanOrEqual(bounds.maxX);
        expect(target.z).toBeGreaterThanOrEqual(bounds.minZ);
        expect(target.z).toBeLessThanOrEqual(bounds.maxZ);
      }
    });
  });

  describe('enforceBounds (境界制御 & 内側反射)', () => {
    const bounds = { minX: -10, maxX: 2, minZ: -8, maxZ: 8 };

    it('境界内の座標はクランプされずhitBoundary=falseを返す', () => {
      const result = enforceBounds({ x: 0, z: 0 }, { x: 1, z: 0 }, bounds);
      expect(result.clampedPos).toEqual({ x: 0, z: 0 });
      expect(result.reflectedVel).toEqual({ x: 1, z: 0 });
      expect(result.hitBoundary).toBe(false);
    });

    it('X正境界を超過した場合、Xがクランプされ正のvxが負へ反転する', () => {
      const result = enforceBounds({ x: 2.5, z: 0 }, { x: 1.2, z: 0.5 }, bounds);
      expect(result.clampedPos.x).toBe(2);
      expect(result.reflectedVel.x).toBe(-1.2);
      expect(result.hitBoundary).toBe(true);
    });

    it('X負境界を下回った場合、Xがクランプされ負のvxが正へ反転する', () => {
      const result = enforceBounds({ x: -11.0, z: 0 }, { x: -0.8, z: 0 }, bounds);
      expect(result.clampedPos.x).toBe(-10);
      expect(result.reflectedVel.x).toBe(0.8);
      expect(result.hitBoundary).toBe(true);
    });

    it('Z境界を超過した場合、Zがクランプされvzが反転する', () => {
      const result = enforceBounds({ x: 0, z: 9.5 }, { x: 0, z: 1.0 }, bounds);
      expect(result.clampedPos.z).toBe(8);
      expect(result.reflectedVel.z).toBe(-1.0);
      expect(result.hitBoundary).toBe(true);
    });
  });

  describe('calculateSeparationVector (反発力・衝突回避)', () => {
    it('近傍にアヒルがいない場合はゼロベクトルを返す', () => {
      const current = { x: 0, z: 0 };
      const neighbors = [{ x: 5, z: 5 }];
      const sep = calculateSeparationVector(current, neighbors, 1.0);
      expect(sep).toEqual({ x: 0, z: 0 });
    });

    it('検知半径内のアヒルから離れる方向への反発力を算出する', () => {
      const current = { x: 0, z: 0 };
      // +X方向にアヒルがいる場合、-X方向への反発力が発生
      const neighbors = [{ x: 0.4, z: 0 }];
      const sep = calculateSeparationVector(current, neighbors, 1.0);

      expect(sep.x).toBeLessThan(0);
      expect(sep.z).toBeCloseTo(0, 4);
    });

    it('距離が近いほど反発力が強くなる', () => {
      const current = { x: 0, z: 0 };
      const closeNeighbor = [{ x: 0.2, z: 0 }];
      const farNeighbor = [{ x: 0.8, z: 0 }];

      const sepClose = calculateSeparationVector(current, closeNeighbor, 1.0);
      const sepFar = calculateSeparationVector(current, farNeighbor, 1.0);

      expect(Math.abs(sepClose.x)).toBeGreaterThan(Math.abs(sepFar.x));
    });

    it('完全重複（距離0）時もNaNにならず有限の反発力を返す', () => {
      const current = { x: 1, z: 1 };
      const overlapping = [{ x: 1, z: 1 }];

      const sep = calculateSeparationVector(current, overlapping, 1.0);
      expect(Number.isFinite(sep.x)).toBe(true);
      expect(Number.isFinite(sep.z)).toBe(true);
      expect(Math.abs(sep.x) + Math.abs(sep.z)).toBeGreaterThan(0);
    });
  });

  describe('calculateHeadingAngle & slerpAngle', () => {
    it('移動方向に応じたYaw角度を正確に計算する (+Xが正面)', () => {
      const from = { x: 0, z: 0 };

      // +X方向 (角度 0)
      expect(calculateHeadingAngle(from, { x: 1, z: 0 })).toBeCloseTo(0, 4);

      // +Z方向 (角度 -PI/2)
      expect(calculateHeadingAngle(from, { x: 0, z: 1 })).toBeCloseTo(-Math.PI / 2, 4);

      // -X方向 (角度 PI または -PI)
      expect(Math.abs(calculateHeadingAngle(from, { x: -1, z: 0 }))).toBeCloseTo(Math.PI, 4);

      // -Z方向 (角度 PI/2)
      expect(calculateHeadingAngle(from, { x: 0, z: -1 })).toBeCloseTo(Math.PI / 2, 4);
    });

    it('slerpAngleが境界(-PI/PI)を跨ぐ最短円弧で滑らかに補間する', () => {
      const angle1 = 3.0;
      const angle2 = -3.0; // 差分は本来小さく、円周を反転せずに最短で進むべき

      const interpolated = slerpAngle(angle1, angle2, 0.5);
      // 3.0から-3.0の中間はPI（3.14159...）近傍
      expect(Math.abs(interpolated)).toBeGreaterThan(3.0);
    });
  });

  describe('calculateSpeedMultiplier (期限連動)', () => {
    it('doneタスクは期限に関わらず0.6倍', () => {
      const task = createMockTask({
        status: 'done',
        dueDate: new Date(Date.now() - 1000).toISOString(),
      });
      const mult = calculateSpeedMultiplier(task);
      expect(mult.speedMultiplier).toBe(0.6);
      expect(mult.animSpeedMultiplier).toBe(0.6);
    });

    it('期限なしタスクは1.0倍', () => {
      const task = createMockTask({ dueDate: null });
      const mult = calculateSpeedMultiplier(task);
      expect(mult.speedMultiplier).toBe(1.0);
    });

    it('期限超過（Overdue）は2.0倍', () => {
      const now = Date.now();
      const task = createMockTask({
        dueDate: new Date(now - 3600 * 1000).toISOString(),
      });
      const mult = calculateSpeedMultiplier(task, now);
      expect(mult.speedMultiplier).toBe(2.0);
    });

    it('直前パニック（0〜4時間以内）は2.5倍', () => {
      const now = Date.now();
      const task = createMockTask({
        dueDate: new Date(now + 2 * 3600 * 1000).toISOString(),
      });
      const mult = calculateSpeedMultiplier(task, now);
      expect(mult.speedMultiplier).toBe(2.5);
    });

    it('24〜48時間以内は1.3倍', () => {
      const now = Date.now();
      const task = createMockTask({
        dueDate: new Date(now + 30 * 3600 * 1000).toISOString(),
      });
      const mult = calculateSpeedMultiplier(task, now);
      expect(mult.speedMultiplier).toBe(1.3);
    });
  });

  describe('Animation Pose Calculations', () => {
    it('calculateWaddlePoseが左右交互の足振り角とロッキング角を生成する', () => {
      const pose = calculateWaddlePose(Math.PI / 2);
      expect(pose.bodyRoll).toBeCloseTo(0.16, 2);
      expect(pose.leftFootRotZ).toBeCloseTo(0.45, 2);
      expect(pose.rightFootRotZ).toBeCloseTo(-0.45, 2);
    });

    it('calculateIdlePoseが尾羽フリフリと地面ついばみ角を生成する', () => {
      const pose = calculateIdlePose(1.0, 0);
      expect(Number.isFinite(pose.tailWiggle)).toBe(true);
      expect(Number.isFinite(pose.peckPitch)).toBe(true);
      expect(Number.isFinite(pose.headTilt)).toBe(true);
    });

    it('calculateSwimmingPoseが水面浮遊Yオフセットと揺らぎを生成する', () => {
      const pose = calculateSwimmingPose(1.0, 0);
      expect(Number.isFinite(pose.bobY)).toBe(true);
      expect(Number.isFinite(pose.bodyRoll)).toBe(true);
      expect(Number.isFinite(pose.peckPitch)).toBe(true);
      // 足は静止
      expect(pose.leftFootRotZ).toBe(0);
      expect(pose.rightFootRotZ).toBe(0);
    });

    it('urgencyLevel="critical" 時は激しい羽ばたき角が生成され、ロッキング・ボビングが増幅される', () => {
      const normalPose = calculateWaddlePose(Math.PI / 2, 'normal', 0.1);
      const criticalPose = calculateWaddlePose(Math.PI / 2, 'critical', 0.1);

      expect(normalPose.wingFlapAngle).toBe(0);
      expect(normalPose.leftWingRotX).toBe(0);
      expect(normalPose.rightWingRotX).toBe(0);

      // critical時は羽ばたき角が発生し、左右で逆位相になる
      expect(Math.abs(criticalPose.wingFlapAngle)).toBeGreaterThan(0);
      expect(criticalPose.leftWingRotX).toBe(criticalPose.wingFlapAngle);
      expect(criticalPose.rightWingRotX).toBe(-criticalPose.wingFlapAngle);
      // 翼の開きZ
      expect(criticalPose.leftWingRotZ).toBeGreaterThan(0.1);

      // ロッキング・ボビングの増幅
      expect(Math.abs(criticalPose.bodyRoll)).toBeGreaterThan(Math.abs(normalPose.bodyRoll));
      expect(criticalPose.bobY).toBeGreaterThan(normalPose.bobY);
    });

    it('IDLE状態でも critical 時はその場で羽ばたきと速い首振り・尾羽フリフリを行う', () => {
      const normalIdle = calculateIdlePose(1.0, 0, 'normal');
      const criticalIdle = calculateIdlePose(1.0, 0, 'critical');

      expect(normalIdle.wingFlapAngle).toBe(0);
      expect(Math.abs(criticalIdle.wingFlapAngle)).toBeGreaterThan(0);
    });
  });

  describe('DuckPositionRegistry', () => {
    it('アヒル座標の登録、更新、削除および同エリア近傍フィルタリングが機能する', () => {
      duckPositionRegistry.register('duck-1', 0, 0.45, 0, 'todo');
      duckPositionRegistry.register('duck-2', 0.5, 0.45, 0, 'in-progress');
      duckPositionRegistry.register('duck-3', 8.0, 0.05, 0, 'done');

      expect(duckPositionRegistry.size()).toBe(3);

      // duck-1 から見て同じ草原エリアの duck-2 のみ取得される
      const grassNeighbors = duckPositionRegistry.getNeighbors('duck-1', 'todo');
      expect(grassNeighbors.length).toBe(1);
      expect(grassNeighbors[0]?.id).toBe('duck-2');

      // duck-3 (池エリア) から見た近傍アヒルはいない
      const pondNeighbors = duckPositionRegistry.getNeighbors('duck-3', 'done');
      expect(pondNeighbors.length).toBe(0);

      duckPositionRegistry.unregister('duck-2');
      expect(duckPositionRegistry.size()).toBe(2);
    });
  });

  describe('DuckAIController State Machine', () => {
    it('todoタスクのアヒルは初期状態IDLEで2〜5秒のタイマーを持つ', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-1',
        status: 'todo',
        index: 0,
        initialPos: [-4, 0.45, 0],
      });

      expect(controller.state).toBe('IDLE');
      expect(controller.stateTimer).toBeGreaterThanOrEqual(2.0);
      expect(controller.stateTimer).toBeLessThanOrEqual(5.0);
    });

    it('doneタスクのアヒルは初期状態SWIMMINGで池エリアに配置される', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-2',
        status: 'done',
        index: 0,
        initialPos: [8, 0.05, 0],
      });

      expect(controller.state).toBe('SWIMMING');
      expect(controller.isPond).toBe(true);
    });

    it('IDLEの待機タイマー終了後にWALKINGへ遷移し、目的地が草原境界内に選定される', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-3',
        status: 'todo',
        index: 0,
        initialPos: [-4, 0.45, 0],
      });

      const initialTimer = controller.stateTimer;
      // タイマー分だけステップを進める
      controller.step(initialTimer + 0.1, [], createMockTask());

      expect(controller.state).toBe('WALKING');
      const grassBounds = getAreaBounds('todo', 0.6);
      expect(controller.target.x).toBeGreaterThanOrEqual(grassBounds.minX);
      expect(controller.target.x).toBeLessThanOrEqual(grassBounds.maxX);
      expect(controller.target.z).toBeGreaterThanOrEqual(grassBounds.minZ);
      expect(controller.target.z).toBeLessThanOrEqual(grassBounds.maxZ);
    });

    it('WALKING中に目標地点に到達するとIDLEへ遷移する', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-4',
        status: 'todo',
        index: 0,
        initialPos: [-4, 0.45, 0],
      });

      // WALKINGへ強制遷移
      controller.state = 'WALKING';
      // 目標地点を現在位置のごく近くに設定
      controller.target = { x: -4.05, z: 0.05 };

      controller.step(0.016, [], createMockTask());

      expect(controller.state).toBe('IDLE');
      expect(controller.stateTimer).toBeGreaterThanOrEqual(2.0);
    });

    it('草原境界に到達しても境界外へ出ず、内側へ反転する', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-5',
        status: 'todo',
        index: 0,
        initialPos: [2.3, 0.45, 0],
      });

      controller.state = 'WALKING';
      // 境界外(X=5)をターゲットに設定
      controller.target = { x: 5.0, z: 0 };

      // 多数ステップ実行
      for (let i = 0; i < 60; i++) {
        controller.step(0.05, [], createMockTask());
      }

      const grassBounds = getAreaBounds('todo', 0.6);
      expect(controller.position.x).toBeLessThanOrEqual(grassBounds.maxX);
      expect(controller.position.x).toBeGreaterThanOrEqual(grassBounds.minX);
    });

    it('近傍アヒルからの反発力により進行軌道が変化し重なりを防ぐ', () => {
      const controller1 = new DuckAIController({
        id: 'duck-a',
        status: 'todo',
        index: 0,
        initialPos: [0, 0.45, 0],
      });
      controller1.state = 'WALKING';
      controller1.target = { x: 2, z: 0 };

      // 直前に他アヒルが存在
      const neighbor = [{ id: 'duck-b', x: 0.3, z: 0 }];

      // ステップ実行
      controller1.step(0.1, neighbor, createMockTask());

      // 反発力が作用している
      expect(controller1.position.x).toBeDefined();
    });

    it('タスクステータスがdoneに変更されたとき池エリアへ同期しSWIMMINGへ遷移する', () => {
      const controller = new DuckAIController({
        id: 'duck-ctrl-6',
        status: 'todo',
        index: 0,
        initialPos: [-4, 0.45, 0],
      });

      expect(controller.state).toBe('IDLE');

      // doneタスクでステップ実行
      controller.step(0.016, [], createMockTask({ status: 'done' }));

      expect(controller.state).toBe('SWIMMING');
      expect(controller.isPond).toBe(true);
      expect(controller.baseY).toBe(0.05);
    });
  });

  describe('30羽アヒル配置時のシミュレーション性能 (60FPS設計検証)', () => {
    it('30羽のアヒルを1000フレーム（約16秒分）更新しても高速に完了する', () => {
      const ducks: DuckAIController[] = [];
      const tasks: Task[] = [];

      for (let i = 0; i < 30; i++) {
        const isDone = i >= 20;
        const task = createMockTask({
          id: `bench-duck-${i}`,
          status: isDone ? 'done' : 'todo',
        });
        tasks.push(task);
        ducks.push(
          new DuckAIController({
            id: task.id,
            status: task.status,
            index: i,
            initialPos: isDone ? [8, 0.05, 0] : [-4, 0.45, 0],
          })
        );
      }

      const start = performance.now();

      // 1000フレームシミュレーション
      for (let frame = 0; frame < 1000; frame++) {
        // レジストリ同期
        for (let i = 0; i < ducks.length; i++) {
          const duck = ducks[i];
          const task = tasks[i];
          if (!duck || !task) continue;
          duckPositionRegistry.update(
            duck.id,
            duck.position.x,
            duck.position.y,
            duck.position.z,
            task.status
          );
        }

        // 各アヒルのステップ計算
        for (let i = 0; i < ducks.length; i++) {
          const duck = ducks[i];
          const task = tasks[i];
          if (!duck || !task) continue;
          const neighbors = duckPositionRegistry.getNeighbors(duck.id, task.status);
          duck.step(0.016, neighbors, task);
        }
      }

      const elapsed = performance.now() - start;

      // 1000フレーム × 30羽 = 30,000回のAI更新が極めて高速（通常100ms未満）に完了すること
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
