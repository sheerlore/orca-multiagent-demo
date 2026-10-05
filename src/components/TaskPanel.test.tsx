import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPanel } from './TaskPanel';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { getDuckSpawnPosition } from '../utils/sceneMath';

describe('TaskPanel Component', () => {
  beforeEach(() => {
    useCameraStore.setState({
      resetTrigger: 0,
      targetFocus: null,
    });
    useTaskStore.setState({
      tasks: [
        {
          id: 'test-1',
          title: 'テストタスク1',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          duckColor: '#facc15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      selectedTaskId: null,
      hoveredTaskId: null,
      isDetailDrawerOpen: false,
    });
  });

  it('renders the title and existing task', () => {
    render(<TaskPanel />);
    expect(screen.getByText('QuackTrack')).toBeInTheDocument();
    expect(screen.getByText('テストタスク1')).toBeInTheDocument();
    expect(screen.getByText('未着手')).toBeInTheDocument();
  });

  it('allows adding a new task', async () => {
    const user = userEvent.setup();
    render(<TaskPanel />);

    const input = screen.getByPlaceholderText('新しいタスクを入力...');
    const addButton = screen.getByRole('button', { name: 'タスクを追加' });

    await user.type(input, '追加したタスク名');
    await user.click(addButton);

    expect(screen.getByText('追加したタスク名')).toBeInTheDocument();
  });

  it('filters tasks by tab', async () => {
    const user = userEvent.setup();
    useTaskStore.setState({
      tasks: [
        {
          id: 't-1',
          title: '未完了タスク',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          duckColor: '#facc15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
        {
          id: 't-2',
          title: '完了済タスク',
          description: '',
          status: 'done',
          priority: 'high',
          dueDate: null,
          duckColor: '#4ade80',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      selectedTaskId: null,
    });

    render(<TaskPanel />);
    expect(screen.getByText('未完了タスク')).toBeInTheDocument();
    expect(screen.getByText('完了済タスク')).toBeInTheDocument();

    // Click 進行中 tab
    const activeTab = screen.getByRole('button', { name: /進行中/ });
    await user.click(activeTab);
    expect(screen.getByText('未完了タスク')).toBeInTheDocument();
    expect(screen.queryByText('完了済タスク')).not.toBeInTheDocument();

    // Click 完了 tab
    const doneTab = screen.getByRole('button', { name: /完了 \(/ });
    await user.click(doneTab);
    expect(screen.queryByText('未完了タスク')).not.toBeInTheDocument();
    expect(screen.getByText('完了済タスク')).toBeInTheDocument();
  });

  describe('3D空間連動インタラクション (ホバー & クリック)', () => {
    it('リストアイテムのマウスホバーでhoveredTaskIdが設定・解除される', () => {
      render(<TaskPanel />);
      const item = screen.getByTestId('task-item-test-1');

      fireEvent.mouseEnter(item);
      expect(useTaskStore.getState().hoveredTaskId).toBe('test-1');

      fireEvent.mouseLeave(item);
      expect(useTaskStore.getState().hoveredTaskId).toBeNull();
    });

    it('リストアイテムをクリックするとカメラフォーカス(focusOn)が呼ばれ、ドロワーが開く', async () => {
      const user = userEvent.setup();
      const focusOnSpy = vi.spyOn(useCameraStore.getState(), 'focusOn');

      render(<TaskPanel />);
      const item = screen.getByTestId('task-item-test-1');

      await user.click(item);

      const expectedPos = getDuckSpawnPosition('todo', 0);
      expect(focusOnSpy).toHaveBeenCalledWith(expectedPos);
      expect(useTaskStore.getState().selectedTaskId).toBe('test-1');
      expect(useTaskStore.getState().isDetailDrawerOpen).toBe(true);

      focusOnSpy.mockRestore();
    });
  });
});
