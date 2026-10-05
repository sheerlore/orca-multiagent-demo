import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPanel } from './TaskPanel';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { getDuckSpawnPosition } from '../utils/sceneMath';
import type { Task } from '../types/task';

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

  describe('キーワード検索機能', () => {
    beforeEach(() => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'search-1',
            title: 'バグ修正を行う',
            description: 'Three.jsレンダリングの問題を調査',
            status: 'todo',
            priority: 'high',
            dueDate: null,
            duckColor: '#facc15',
            createdAt: '2026-10-06T10:00:00.000Z',
            updatedAt: '2026-10-06T10:00:00.000Z',
            completedAt: null,
          },
          {
            id: 'search-2',
            title: 'ドキュメント作成',
            description: 'SPEC仕様書を更新する',
            status: 'in-progress',
            priority: 'medium',
            dueDate: null,
            duckColor: '#fb923c',
            createdAt: '2026-10-06T11:00:00.000Z',
            updatedAt: '2026-10-06T11:00:00.000Z',
            completedAt: null,
          },
          {
            id: 'search-3',
            title: 'CIテスト実行',
            description: 'GitHub Actionsのworkflow設定',
            status: 'done',
            priority: 'low',
            dueDate: null,
            duckColor: '#4ade80',
            createdAt: '2026-10-06T12:00:00.000Z',
            updatedAt: '2026-10-06T12:00:00.000Z',
            completedAt: '2026-10-06T12:30:00.000Z',
          },
        ],
      });
    });

    it('タイトルまたは説明文のキーワードで部分一致検索（大文字小文字無視）できる', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const searchInput = screen.getByTestId('task-search-input');

      // タイトルで検索
      await user.type(searchInput, 'バグ');
      expect(screen.getByText('バグ修正を行う')).toBeInTheDocument();
      expect(screen.queryByText('ドキュメント作成')).not.toBeInTheDocument();
      expect(screen.queryByText('CIテスト実行')).not.toBeInTheDocument();

      // 詳細説明で検索（大文字小文字無視: "three.js" -> "Three.js"）
      await user.clear(searchInput);
      await user.type(searchInput, 'three.js');
      expect(screen.getByText('バグ修正を行う')).toBeInTheDocument();
      expect(screen.queryByText('ドキュメント作成')).not.toBeInTheDocument();

      // 詳細説明で別タスク検索 ("SPEC")
      await user.clear(searchInput);
      await user.type(searchInput, 'spec');
      expect(screen.getByText('ドキュメント作成')).toBeInTheDocument();
      expect(screen.queryByText('バグ修正を行う')).not.toBeInTheDocument();
    });

    it('検索クリアボタンをクリックすると検索語がクリアされ全タスクが再表示される', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const searchInput = screen.getByTestId('task-search-input');
      await user.type(searchInput, 'バグ');

      const clearButton = screen.getByTestId('search-clear-button');
      expect(clearButton).toBeInTheDocument();

      await user.click(clearButton);
      expect(searchInput).toHaveValue('');
      expect(screen.queryByTestId('search-clear-button')).not.toBeInTheDocument();

      expect(screen.getByText('バグ修正を行う')).toBeInTheDocument();
      expect(screen.getByText('ドキュメント作成')).toBeInTheDocument();
      expect(screen.getByText('CIテスト実行')).toBeInTheDocument();
    });

    it('一致するタスクがない場合は空メッセージを表示する', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const searchInput = screen.getByTestId('task-search-input');
      await user.type(searchInput, '存在しないタスクキーワード');

      expect(screen.getByTestId('empty-tasks-notice')).toHaveTextContent(
        '検索条件に一致するタスクは見つかりませんでした。'
      );
    });
  });

  describe('ソート機能', () => {
    const taskOld: Task = {
      id: 'sort-old',
      title: '古いタスク',
      description: '',
      status: 'todo',
      priority: 'low',
      dueDate: '2026-10-30T00:00:00.000Z',
      duckColor: '#facc15',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      completedAt: null,
    };
    const taskNew: Task = {
      id: 'sort-new',
      title: '新しいタスク',
      description: '',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-10T00:00:00.000Z',
      duckColor: '#fb923c',
      createdAt: '2026-10-05T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
      completedAt: null,
    };
    const taskMid: Task = {
      id: 'sort-mid',
      title: '中間のタスク',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null, // 期日なし
      duckColor: '#4ade80',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
      completedAt: null,
    };

    beforeEach(() => {
      useTaskStore.setState({
        tasks: [taskOld, taskNew, taskMid],
      });
    });

    it('デフォルトは作成日が新しい順 (created-desc)', () => {
      render(<TaskPanel />);
      const select = screen.getByTestId('task-sort-select') as HTMLSelectElement;
      expect(select.value).toBe('created-desc');

      const items = screen.getAllByTestId(/^task-item-/);
      expect(items[0]).toHaveTextContent('新しいタスク');
      expect(items[1]).toHaveTextContent('中間のタスク');
      expect(items[2]).toHaveTextContent('古いタスク');
    });

    it('作成日が古い順 (created-asc) で正しく並び替わる', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const select = screen.getByTestId('task-sort-select');
      await user.selectOptions(select, 'created-asc');

      const items = screen.getAllByTestId(/^task-item-/);
      expect(items[0]).toHaveTextContent('古いタスク');
      expect(items[1]).toHaveTextContent('中間のタスク');
      expect(items[2]).toHaveTextContent('新しいタスク');
    });

    it('期限が近い順 (due-asc) で正しく並び替わる (期日設定あり優先)', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const select = screen.getByTestId('task-sort-select');
      await user.selectOptions(select, 'due-asc');

      const items = screen.getAllByTestId(/^task-item-/);
      // 10-10 (taskNew) -> 10-30 (taskOld) -> null (taskMid)
      expect(items[0]).toHaveTextContent('新しいタスク');
      expect(items[1]).toHaveTextContent('古いタスク');
      expect(items[2]).toHaveTextContent('中間のタスク');
    });

    it('優先度が高い順 (priority-desc: high -> medium -> low) で並び替わる', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const select = screen.getByTestId('task-sort-select');
      await user.selectOptions(select, 'priority-desc');

      const items = screen.getAllByTestId(/^task-item-/);
      // high (taskNew) -> medium (taskMid) -> low (taskOld)
      expect(items[0]).toHaveTextContent('新しいタスク');
      expect(items[1]).toHaveTextContent('中間のタスク');
      expect(items[2]).toHaveTextContent('古いタスク');
    });
  });

  describe('タスク削除と Undo Toast 通知', () => {
    it('削除ボタンを押すとタスクが消去され、元に戻すToastが表示される', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      expect(screen.getByText('テストタスク1')).toBeInTheDocument();

      const deleteButton = screen.getByTestId('delete-task-test-1');
      await user.click(deleteButton);

      // タスクリストから消去されている
      expect(screen.queryByText('テストタスク1')).not.toBeInTheDocument();

      // Undo Toast が出現
      const undoToast = screen.getByTestId('undo-toast');
      expect(undoToast).toBeInTheDocument();
      expect(undoToast).toHaveTextContent('「テストタスク1」を削除しました');
      expect(screen.getByTestId('undo-delete-button')).toBeInTheDocument();
    });

    it('Undo Toast の「元に戻す」をクリックするとタスクが復元される', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const deleteButton = screen.getByTestId('delete-task-test-1');
      await user.click(deleteButton);

      expect(screen.queryByText('テストタスク1')).not.toBeInTheDocument();

      const undoButton = screen.getByTestId('undo-delete-button');
      await user.click(undoButton);

      // タスクが復元され、Toastが閉じる
      expect(screen.getByText('テストタスク1')).toBeInTheDocument();
      expect(screen.queryByTestId('undo-toast')).not.toBeInTheDocument();
    });

    it('Toast の閉じるボタンをクリックするとToastが非表示になる', async () => {
      const user = userEvent.setup();
      render(<TaskPanel />);

      const deleteButton = screen.getByTestId('delete-task-test-1');
      await user.click(deleteButton);

      const closeToastButton = screen.getByRole('button', { name: '通知を閉じる' });
      await user.click(closeToastButton);

      expect(screen.queryByTestId('undo-toast')).not.toBeInTheDocument();
    });
  });

  describe('レスポンシブ & キーボードアクセシビリティ', () => {
    it('onClose が提供されている場合、モバイル用閉じるボタンをクリックすると onClose が呼ばれる', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<TaskPanel isOpen={true} onClose={onClose} />);
      const closeButton = screen.getByTestId('task-panel-close-button');
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape キーを押下すると onClose が呼ばれる', () => {
      const onClose = vi.fn();
      render(<TaskPanel isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
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
