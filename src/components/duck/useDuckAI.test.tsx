import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import { Duck } from './Duck';
import { DuckRipple } from './DuckRipple';
import { useDuckAI } from './useDuckAI';
import { duckPositionRegistry } from '../../utils/duckAI';
import type { Task } from '../../types/task';

// Dreiのモック
vi.mock('@react-three/drei', () => ({
  Billboard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-billboard">{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Sparkles: () => <div data-testid="mock-drei-sparkles" />,
}));

// R3Fのモック
let recordedFrameCallback:
  ((state: { clock: { getElapsedTime: () => number } }, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: { clock: { getElapsedTime: () => number } }, delta: number) => void) => {
    recordedFrameCallback = cb;
  },
}));

describe('useDuckAI & Duck Component Integration', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (
        msg.includes('is using incorrect casing') ||
        msg.includes('is unrecognized in this browser') ||
        msg.includes('React does not recognize the') ||
        msg.includes('non-boolean attribute')
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    duckPositionRegistry.clear();
    recordedFrameCallback = null;
  });

  const baseTask: Task = {
    id: 'duck-test-1',
    title: '散歩タスク',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  it('Duckコンポーネントがマウント時にduckPositionRegistryへ座標を登録し、アンマウント時に解除する', () => {
    const { unmount } = render(
      <Duck task={baseTask} index={0} isSelected={false} onSelect={vi.fn()} />
    );

    expect(duckPositionRegistry.size()).toBe(1);
    expect(duckPositionRegistry.get(baseTask.id)).toBeDefined();

    unmount();
    expect(duckPositionRegistry.size()).toBe(0);
  });

  it('todo状態では足元波紋（DuckRipple）が表示されず、done状態では表示される', () => {
    const { unmount: u1 } = render(
      <Duck task={baseTask} index={0} isSelected={false} onSelect={vi.fn()} />
    );
    expect(screen.queryByTestId('duck-swimming-ripple')).not.toBeInTheDocument();
    u1();

    const doneTask: Task = { ...baseTask, id: 'duck-done-1', status: 'done' };
    const { unmount: u2 } = render(
      <Duck task={doneTask} index={1} isSelected={false} onSelect={vi.fn()} />
    );
    expect(screen.getByTestId('duck-swimming-ripple')).toBeInTheDocument();
    u2();
  });

  it('DuckRippleコンポーネントが単体でレンダリング可能', () => {
    render(<DuckRipple />);
    expect(screen.getByTestId('duck-swimming-ripple')).toBeInTheDocument();
  });

  it('Duckクリック時にonSelectが正しく呼ばれる', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Duck task={baseTask} index={0} isSelected={false} onSelect={onSelect} />);

    const duckElement = screen.getByTestId(`duck-${baseTask.id}`);
    await user.click(duckElement);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const coords = onSelect.mock.calls[0]?.[0];
    expect(coords).toBeDefined();
    expect(coords).toHaveLength(3);
    expect(typeof coords?.[0]).toBe('number');
  });

  it('useFrame実行時にGroup RefやModel RefがReact再レンダリングなしで直接更新される', () => {
    function TestDuckHookComponent() {
      const groupRef = { current: new THREE.Group() };
      const modelGroupRef = { current: new THREE.Group() };
      const headRef = { current: new THREE.Group() };
      const tailRef = { current: new THREE.Mesh() };
      const leftFootRef = { current: new THREE.Mesh() };
      const rightFootRef = { current: new THREE.Mesh() };

      const { controller, getAIState } = useDuckAI({
        task: baseTask,
        index: 0,
        groupRef,
        modelGroupRef,
        headRef,
        tailRef,
        leftFootRef,
        rightFootRef,
      });

      return (
        <div data-testid="hook-info" data-state={getAIState()} data-pos-x={controller.position.x} />
      );
    }

    render(<TestDuckHookComponent />);

    expect(recordedFrameCallback).toBeDefined();

    // useFrameコールバックを実行
    act(() => {
      recordedFrameCallback?.(
        {
          clock: { getElapsedTime: () => 1.5 },
        },
        0.016
      );
    });

    // レジストリが更新されている
    const entry = duckPositionRegistry.get(baseTask.id);
    expect(entry).toBeDefined();
  });

  it('useFrame実行時に翼Ref (leftWingRef, rightWingRef) が回転更新される', () => {
    const leftWing = new THREE.Mesh();
    const rightWing = new THREE.Mesh();
    const criticalTask: Task = {
      ...baseTask,
      dueDate: new Date(Date.now() + 1 * 3600 * 1000).toISOString(), // 1時間後 (critical)
    };

    function TestWingHookComponent() {
      const groupRef = { current: new THREE.Group() };
      const leftWingRef = { current: leftWing };
      const rightWingRef = { current: rightWing };

      const { urgency } = useDuckAI({
        task: criticalTask,
        index: 0,
        groupRef,
        leftWingRef,
        rightWingRef,
      });

      return <div data-testid="urgency-level">{urgency.urgencyLevel}</div>;
    }

    render(<TestWingHookComponent />);
    expect(screen.getByTestId('urgency-level')).toHaveTextContent('critical');

    // useFrameコールバックを実行
    act(() => {
      recordedFrameCallback?.(
        {
          clock: { getElapsedTime: () => 1.5 },
        },
        0.016
      );
    });

    // 翼が羽ばたき角に設定されている
    expect(Number.isFinite(leftWing.rotation.x)).toBe(true);
    expect(Number.isFinite(rightWing.rotation.x)).toBe(true);
  });

  describe('Duckコンポーネントの緊急度連動3D感情エフェクト表示', () => {
    it('critical (残り2時間) のタスクでは激しい汗マーク (emotion-critical) が表示される', () => {
      const criticalTask: Task = {
        ...baseTask,
        dueDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      };

      render(<Duck task={criticalTask} index={0} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
      expect(screen.getByTestId('emotion-critical')).toBeInTheDocument();
    });

    it('panicked (残り10時間) のタスクでは青い汗マーク (emotion-panicked) が表示される', () => {
      const panickedTask: Task = {
        ...baseTask,
        dueDate: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
      };

      render(<Duck task={panickedTask} index={0} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
      expect(screen.getByTestId('emotion-panicked')).toBeInTheDocument();
    });

    it('overdue (期限超過) のタスクでは湯気＆怒りマーク (emotion-overdue) が表示される', () => {
      const overdueTask: Task = {
        ...baseTask,
        dueDate: new Date(Date.now() - 3600 * 1000).toISOString(),
      };

      render(<Duck task={overdueTask} index={0} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
      expect(screen.getByTestId('emotion-overdue')).toBeInTheDocument();
      expect(screen.getByTestId('anger-symbol')).toBeInTheDocument();
    });

    it('done のタスクは期限が切れていても感情エフェクトは非表示 (relaxed) になる', () => {
      const doneTask: Task = {
        ...baseTask,
        status: 'done',
        dueDate: new Date(Date.now() - 3600 * 1000).toISOString(),
      };

      render(<Duck task={doneTask} index={0} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.queryByTestId('duck-emotion-effect')).not.toBeInTheDocument();
    });
  });
});
