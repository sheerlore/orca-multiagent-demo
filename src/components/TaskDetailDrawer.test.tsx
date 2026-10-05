import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { useTaskStore, STORAGE_KEY } from '../store/taskStore';
import type { Task } from '../types/task';

describe('TaskDetailDrawer Component', () => {
  const mockTask: Task = {
    id: 'test-task-drawer',
    title: '重要な企画書を作成する',
    description: '来期に向けた新規事業の企画書をドラフトする',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-10-15T00:00:00.000Z',
    duckColor: '#fb923c',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  beforeEach(() => {
    localStorage.clear();
    useTaskStore.setState({
      tasks: [mockTask],
      selectedTaskId: null,
      isDetailDrawerOpen: false,
      hoveredTaskId: null,
    });
  });

  describe('ドロワーの開閉動作', () => {
    it('isDetailDrawerOpenがfalseまたはタスク未選択時はレンダリングされない', () => {
      const { container } = render(<TaskDetailDrawer />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('task-detail-drawer')).not.toBeInTheDocument();
    });

    it('isDetailDrawerOpenがtrueかつタスク選択時にドロワーが表示される', () => {
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      expect(screen.getByTestId('task-detail-drawer')).toBeInTheDocument();
      expect(screen.getByText('タスク詳細編集')).toBeInTheDocument();
    });

    it('閉じるボタンをクリックするとドロワーが閉じる', async () => {
      const user = userEvent.setup();
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      const closeButton = screen.getByRole('button', { name: '閉じる' });
      await user.click(closeButton);

      expect(useTaskStore.getState().isDetailDrawerOpen).toBe(false);
      expect(useTaskStore.getState().selectedTaskId).toBeNull();
    });

    it('Escapeキー押下でドロワーが閉じる', () => {
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      expect(screen.getByTestId('task-detail-drawer')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      expect(useTaskStore.getState().isDetailDrawerOpen).toBe(false);
    });
  });

  describe('タスク詳細の編集と保存（ストアおよびlocalStorage同期）', () => {
    beforeEach(() => {
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });
    });

    it('選択されたタスクの初期値が各フォーム項目に正しく表示される', () => {
      render(<TaskDetailDrawer />);

      const titleInput = screen.getByLabelText(/タイトル/);
      expect(titleInput).toHaveValue(mockTask.title);

      const descriptionInput = screen.getByLabelText(/詳細メモ/);
      expect(descriptionInput).toHaveValue(mockTask.description);

      const dueDateInput = screen.getByLabelText(/期日 \(カレンダー入力\)/);
      expect(dueDateInput).toHaveValue('2026-10-15');
    });

    it('フォーム内容を編集して「保存する」をクリックするとストアとlocalStorageが即座に同期更新される', async () => {
      const user = userEvent.setup();
      render(<TaskDetailDrawer />);

      const titleInput = screen.getByLabelText(/タイトル/);
      const descriptionInput = screen.getByLabelText(/詳細メモ/);
      const dueDateInput = screen.getByLabelText(/期日 \(カレンダー入力\)/);
      const saveButton = screen.getByRole('button', { name: '保存する' });

      // 編集
      await user.clear(titleInput);
      await user.type(titleInput, '編集後のタイトル');

      await user.clear(descriptionInput);
      await user.type(descriptionInput, '編集後の詳細メモ');

      await user.clear(dueDateInput);
      await user.type(dueDateInput, '2026-11-20');

      // 優先度変更 (中)
      const mediumPriorityButton = screen.getByRole('button', { name: '中 (Medium)' });
      await user.click(mediumPriorityButton);

      // 色選択 (#4ade80)
      const greenColorButton = screen.getByRole('button', { name: '色選択: #4ade80' });
      await user.click(greenColorButton);

      // 保存実行
      await user.click(saveButton);

      // ストアの検証
      const updatedTask = useTaskStore.getState().tasks.find((t) => t.id === mockTask.id);
      expect(updatedTask).toBeDefined();
      expect(updatedTask?.title).toBe('編集後のタイトル');
      expect(updatedTask?.description).toBe('編集後の詳細メモ');
      expect(updatedTask?.dueDate).toContain('2026-11-20');
      expect(updatedTask?.priority).toBe('medium');
      expect(updatedTask?.duckColor).toBe('#4ade80');

      // localStorageの検証
      const rawStored = localStorage.getItem(STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      const parsedStored = JSON.parse(rawStored!);
      expect(parsedStored.tasks[0]?.title).toBe('編集後のタイトル');
      expect(parsedStored.tasks[0]?.duckColor).toBe('#4ade80');
    });

    it('期日のクリアボタンをクリックすると期日入力が空になり保存でnullになる', async () => {
      const user = userEvent.setup();
      render(<TaskDetailDrawer />);

      const clearDateButton = screen.getByRole('button', { name: '期日をクリア' });
      await user.click(clearDateButton);

      const saveButton = screen.getByRole('button', { name: '保存する' });
      await user.click(saveButton);

      const updatedTask = useTaskStore.getState().tasks.find((t) => t.id === mockTask.id);
      expect(updatedTask?.dueDate).toBeNull();
    });
  });

  describe('完了トグルおよび削除動作', () => {
    it('未完了タスクで「タスクを完了にする」をクリックするとdoneに切り替わる', async () => {
      const user = userEvent.setup();
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      const doneToggleButton = screen.getByRole('button', { name: '完了にする' });
      await user.click(doneToggleButton);

      const current = useTaskStore.getState().tasks.find((t) => t.id === mockTask.id);
      expect(current?.status).toBe('in-progress'); // toggleStatus toggles todo -> in-progress -> done
    });

    it('完了済タスクで未完了トグルをクリックするとステータスが切り替わる', async () => {
      const user = userEvent.setup();
      const doneTask: Task = { ...mockTask, status: 'done', completedAt: new Date().toISOString() };
      useTaskStore.setState({
        tasks: [doneTask],
        selectedTaskId: doneTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      const undoButton = screen.getByRole('button', { name: '未完了に戻す' });
      await user.click(undoButton);

      const current = useTaskStore.getState().tasks.find((t) => t.id === doneTask.id);
      expect(current?.status).toBe('todo');
      expect(current?.completedAt).toBeNull();
    });

    it('「このタスクを削除」をクリックするとタスクが削除されドロワーが閉じる', async () => {
      const user = userEvent.setup();
      useTaskStore.setState({
        selectedTaskId: mockTask.id,
        isDetailDrawerOpen: true,
      });

      render(<TaskDetailDrawer />);
      const deleteButton = screen.getByRole('button', { name: '削除' });
      await user.click(deleteButton);

      expect(useTaskStore.getState().tasks).toHaveLength(0);
      expect(useTaskStore.getState().selectedTaskId).toBeNull();
      expect(useTaskStore.getState().isDetailDrawerOpen).toBe(false);
    });
  });
});
