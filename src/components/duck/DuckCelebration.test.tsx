import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Duck } from './Duck';
import { useTaskStore } from '../../store/taskStore';
import * as audioModule from '../../utils/audio';
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
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('Duck Celebration Integration', () => {
  const originalConsoleError = console.error;
  let playJingleSpy: ReturnType<typeof vi.spyOn>;

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
    vi.restoreAllMocks();
    playJingleSpy = vi.spyOn(audioModule, 'playCelebrationJingle');
    useTaskStore.setState({
      settings: {
        soundEnabled: true,
        showTitleTags: true,
        cameraFollowMode: false,
      },
    });
  });

  const baseTask: Task = {
    id: 'duck-test-celebration',
    title: 'セレブレーションテストタスク',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  it('タスクが初期マウント時からdoneだった場合、セレブレーション（ジングル・紙吹雪）を実行せず静かに池で泳ぐ', () => {
    const doneTask: Task = { ...baseTask, status: 'done' };

    render(<Duck task={doneTask} index={0} isSelected={false} onSelect={vi.fn()} />);

    // ジングルは再生されない
    expect(playJingleSpy).not.toHaveBeenCalled();
    // 紙吹雪は表示されない
    expect(screen.queryByTestId('celebration-confetti')).not.toBeInTheDocument();
    // 静かに池で泳いでいる（王冠と水泳波紋が表示される）
    expect(screen.getByTestId('accessory-crown')).toBeInTheDocument();
    expect(screen.getByTestId('duck-swimming-ripple')).toBeInTheDocument();
  });

  it('タスクがtodoからdoneに変化した瞬間にジングル再生・紙吹雪表示・宙返りセレブレーションがトリガーされる', () => {
    const { rerender } = render(
      <Duck task={baseTask} index={0} isSelected={false} onSelect={vi.fn()} />
    );

    // 最初はtodo状態
    expect(playJingleSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('celebration-confetti')).not.toBeInTheDocument();
    expect(screen.queryByTestId('accessory-crown')).not.toBeInTheDocument();

    // ステータスを done に更新
    const updatedDoneTask: Task = {
      ...baseTask,
      status: 'done',
      completedAt: new Date().toISOString(),
    };

    rerender(<Duck task={updatedDoneTask} index={0} isSelected={false} onSelect={vi.fn()} />);

    // 1. ジングルが再生されたことを確認
    expect(playJingleSpy).toHaveBeenCalledTimes(1);
    expect(playJingleSpy).toHaveBeenCalledWith(true);

    // 2. 紙吹雪パーティクルが表示されたことを確認
    expect(screen.getByTestId('celebration-confetti')).toBeInTheDocument();

    // 3. セレブレーション中（宙返り・行進）は王冠を被らずに走り、池着水で遊泳モードへ移行する設計
    expect(screen.queryByTestId('accessory-crown')).not.toBeInTheDocument();
  });

  it('soundEnabledがfalseの設定の場合、ジングル再生関数にfalseが渡される', () => {
    useTaskStore.setState({
      settings: {
        soundEnabled: false,
        showTitleTags: true,
        cameraFollowMode: false,
      },
    });

    const { rerender } = render(
      <Duck task={baseTask} index={0} isSelected={false} onSelect={vi.fn()} />
    );

    const updatedDoneTask: Task = { ...baseTask, status: 'done' };
    rerender(<Duck task={updatedDoneTask} index={0} isSelected={false} onSelect={vi.fn()} />);

    expect(playJingleSpy).toHaveBeenCalledWith(false);
  });
});
