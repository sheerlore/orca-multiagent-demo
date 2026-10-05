import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Search,
  X,
  ArrowDownUp,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';
import { getDuckSpawnPosition } from '../utils/sceneMath';
import type { Task, TaskPriority, TaskStatus } from '../types/task';

export type SortOption = 'created-desc' | 'created-asc' | 'due-asc' | 'priority-desc';

export interface TaskPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function TaskPanel({ isOpen = true, onClose }: TaskPanelProps) {
  const {
    tasks,
    selectedTaskId,
    hoveredTaskId,
    addTask,
    deleteTask,
    restoreTask,
    toggleStatus,
    setSelectedTaskId,
    setHoveredTaskId,
    setIsDetailDrawerOpen,
  } = useTaskStore();
  const focusOn = useCameraStore((state) => state.focusOn);

  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created-desc');

  // Undo Toast 状態
  const [undoToast, setUndoToast] = useState<{
    task: Task;
    message: string;
  } | null>(null);

  // Escキーでドロワーを閉じる（モバイル時）
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Undo Toast の自動消去タイマー (5秒)
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="text"]');
    const titleToCreate = (input?.value || newTitle).trim();
    if (!titleToCreate) return;
    addTask(titleToCreate, priority);
    setNewTitle('');
    if (input) {
      input.value = '';
    }
  };

  const handleDelete = (task: Task) => {
    deleteTask(task.id);
    setUndoToast({
      task,
      message: `「${task.title}」を削除しました`,
    });
  };

  const handleUndo = () => {
    if (undoToast) {
      restoreTask(undoToast.task);
      setUndoToast(null);
    }
  };

  // 検索・フィルタ・ソートのパイプライン処理
  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // タブフィルタ
        if (filter === 'active' && t.status === 'done') return false;
        if (filter === 'done' && t.status !== 'done') return false;

        // キーワード検索（title & description の部分一致・大文字小文字無視）
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchesTitle = t.title.toLowerCase().includes(q);
          const matchesDescription = (t.description || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesDescription) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due-asc') {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'created-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'priority-desc') {
          const weights: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };
          const diff = weights[b.priority] - weights[a.priority];
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // 'created-desc' (デフォルト: 作成日が新しい順)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, filter, searchQuery, sortBy]);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
            <Circle className="w-3 h-3" /> 未着手
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
            <Clock className="w-3 h-3 animate-spin" /> 進行中
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> 完了
          </span>
        );
    }
  };

  return (
    <aside
      data-testid="task-panel"
      aria-label="タスク一覧パネル"
      className={`h-full flex flex-col bg-slate-900/95 backdrop-blur-md border-r border-slate-800 transition-transform duration-300 ease-in-out
        w-80 md:w-96
        fixed md:relative inset-y-0 left-0 z-40 md:z-10
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <span className="text-2xl" role="img" aria-label="duck">
            🦆
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
              QuackTrack
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400">3Dアヒルと進めるタスク管理</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="パネルを閉じる"
            data-testid="task-panel-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Task Input Form (Enterキーで送信可能) */}
      <form onSubmit={handleCreate} className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="新しいタスクを入力..."
            aria-label="新しいタスクを入力"
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-sm rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            aria-label="タスクを追加"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">優先度:</span>
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                priority === p
                  ? 'bg-slate-700 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </form>

      {/* Search & Sort Controls */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900/60">
        {/* Keyword Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タイトル・メモを検索..."
            aria-label="タスク検索"
            data-testid="task-search-input"
            className="w-full pl-8 pr-8 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="検索をクリア"
              data-testid="search-clear-button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
            <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
            <label htmlFor="task-sort-select" className="text-[11px] font-medium">
              並び替え:
            </label>
          </div>
          <select
            id="task-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="ソート順"
            data-testid="task-sort-select"
            className="flex-1 max-w-[200px] px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
          >
            <option value="created-desc">作成日が新しい順</option>
            <option value="created-asc">作成日が古い順</option>
            <option value="due-asc">期限が近い順</option>
            <option value="priority-desc">優先度が高い順</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium text-slate-400">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
            filter === 'all' ? 'text-amber-400 border-b-2 border-amber-400' : 'hover:text-slate-200'
          }`}
        >
          すべて ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
            filter === 'active'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'hover:text-slate-200'
          }`}
        >
          進行中 ({tasks.filter((t) => t.status !== 'done').length})
        </button>
        <button
          onClick={() => setFilter('done')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
            filter === 'done'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'hover:text-slate-200'
          }`}
        >
          完了 ({tasks.filter((t) => t.status === 'done').length})
        </button>
      </div>

      {/* Undo Toast Notification */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="undo-toast"
          className="mx-3 my-2 p-2.5 bg-slate-800/95 border border-amber-500/40 rounded-lg shadow-xl flex items-center justify-between text-xs text-slate-100 animate-in fade-in slide-in-from-bottom-2 shrink-0"
        >
          <span className="truncate flex-1 mr-2">{undoToast.message}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors cursor-pointer active:scale-95 shadow-xs"
              aria-label="削除を取り消す"
              data-testid="undo-delete-button"
            >
              元に戻す
            </button>
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
              aria-label="通知を閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500" data-testid="empty-tasks-notice">
            {searchQuery
              ? '検索条件に一致するタスクは見つかりませんでした。'
              : 'タスクはありません。新しいタスクを追加してください。'}
          </div>
        ) : (
          filteredAndSortedTasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            const isHovered = hoveredTaskId === task.id;
            return (
              <div
                key={task.id}
                data-testid={`task-item-${task.id}`}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setIsDetailDrawerOpen(true);
                  const taskIndex = tasks.findIndex((t) => t.id === task.id);
                  const pos = getDuckSpawnPosition(task.status, taskIndex >= 0 ? taskIndex : 0);
                  focusOn(pos);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : isHovered
                      ? 'bg-slate-800/70 border-amber-400/60 shadow-sm ring-1 ring-amber-400/30'
                      : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(task);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors rounded cursor-pointer shrink-0"
                    aria-label={`削除: ${task.title}`}
                    data-testid={`delete-task-${task.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(task.id);
                    }}
                    className="cursor-pointer transition-transform active:scale-95"
                    aria-label={`ステータス変更: ${task.title}`}
                  >
                    {getStatusBadge(task.status)}
                  </button>
                  <div className="flex items-center gap-1.5">
                    {task.dueDate && (
                      <span className="text-[10px] text-slate-400" title={`期日: ${task.dueDate}`}>
                        {task.dueDate.split('T')[0]}
                      </span>
                    )}
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: task.duckColor ?? '#facc15' }}
                      title="アヒルの羽色"
                    />
                    <span className="text-[10px] text-slate-400 uppercase">{task.priority}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
        <span>ドラッグで視点回転 / スクロールで拡大</span>
      </div>
    </aside>
  );
}
