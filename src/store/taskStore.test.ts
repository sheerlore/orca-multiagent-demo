import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from './taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
    });
  });

  it('adds a new task with default values', () => {
    const task = useTaskStore.getState().addTask('新しいタスク', 'high');
    const tasks = useTaskStore.getState().tasks;

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(task.id);
    expect(tasks[0]?.title).toBe('新しいタスク');
    expect(tasks[0]?.status).toBe('todo');
    expect(tasks[0]?.priority).toBe('high');
    expect(tasks[0]?.duckColor).toBeDefined();
  });

  it('updates task properties', () => {
    const task = useTaskStore.getState().addTask('更新テスト');
    useTaskStore.getState().updateTask(task.id, {
      title: '更新後タイトル',
      status: 'done',
    });

    const updated = useTaskStore.getState().tasks.find((t) => t.id === task.id);
    expect(updated?.title).toBe('更新後タイトル');
    expect(updated?.status).toBe('done');
    expect(updated?.completedAt).not.toBeNull();
  });

  it('cycles through task statuses via toggleStatus', () => {
    const task = useTaskStore.getState().addTask('トグルテスト');

    // todo -> in-progress
    useTaskStore.getState().toggleStatus(task.id);
    expect(useTaskStore.getState().tasks[0]?.status).toBe('in-progress');

    // in-progress -> done
    useTaskStore.getState().toggleStatus(task.id);
    expect(useTaskStore.getState().tasks[0]?.status).toBe('done');
    expect(useTaskStore.getState().tasks[0]?.completedAt).not.toBeNull();

    // done -> todo
    useTaskStore.getState().toggleStatus(task.id);
    expect(useTaskStore.getState().tasks[0]?.status).toBe('todo');
    expect(useTaskStore.getState().tasks[0]?.completedAt).toBeNull();
  });

  it('deletes a task', () => {
    const task = useTaskStore.getState().addTask('削除テスト');
    expect(useTaskStore.getState().tasks).toHaveLength(1);

    useTaskStore.getState().deleteTask(task.id);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});
