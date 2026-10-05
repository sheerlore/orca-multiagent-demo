import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPanel } from './TaskPanel';
import { useTaskStore } from '../store/taskStore';

describe('TaskPanel Component', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'test-1',
          title: 'テストタスク1',
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
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
        {
          id: 't-2',
          title: '完了済タスク',
          status: 'done',
          priority: 'high',
          dueDate: null,
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
});
