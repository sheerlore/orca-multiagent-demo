import { useEffect, useState } from 'react';
import { X, Trash2, CheckCircle2, RotateCcw, Calendar, Palette, Flag, Save } from 'lucide-react';
import { useTaskStore, DEFAULT_COLORS } from '../store/taskStore';
import type { Task, TaskPriority, TaskStatus } from '../types/task';

interface TaskDetailDrawerContentProps {
  task: Task;
}

function TaskDetailDrawerContent({ task }: TaskDetailDrawerContentProps) {
  const { closeDetailDrawer, updateTask, deleteTask, toggleStatus } = useTaskStore();

  // フォーム用ローカル状態（key={task.id}によりタスク切り替え時に自動初期化）
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? (task.dueDate.split('T')[0] ?? '') : '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [duckColor, setDuckColor] = useState(task.duckColor || '#facc15');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Escキーによるドロワー閉じる処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDetailDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDetailDrawer]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    updateTask(task.id, {
      title: trimmedTitle,
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      status,
      duckColor,
    });

    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  const handleDelete = () => {
    deleteTask(task.id);
  };

  const handleToggleDone = () => {
    toggleStatus(task.id);
  };

  const isDone = task.status === 'done';

  return (
    <aside
      data-testid="task-detail-drawer"
      aria-label="タスク詳細編集ドロワー"
      className="fixed right-0 top-0 bottom-0 w-80 md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl z-30 flex flex-col transition-all duration-300 ease-in-out text-slate-100"
    >
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full inline-block border border-white/20 shadow-sm"
            style={{ backgroundColor: duckColor }}
          />
          <h2 className="text-base font-bold text-slate-100">タスク詳細編集</h2>
        </div>
        <button
          type="button"
          onClick={closeDetailDrawer}
          className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* フォーム入力領域 */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* タイトル */}
        <div>
          <label htmlFor="detail-title" className="block text-xs font-semibold text-slate-300 mb-1">
            タイトル <span className="text-rose-400">*</span>
          </label>
          <input
            id="detail-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder-slate-500"
            placeholder="タスクのタイトル"
          />
        </div>

        {/* 詳細メモ */}
        <div>
          <label
            htmlFor="detail-description"
            className="block text-xs font-semibold text-slate-300 mb-1"
          >
            詳細メモ
          </label>
          <textarea
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none placeholder-slate-500"
            placeholder="タスクの詳細やメモを入力..."
          />
        </div>

        {/* 期日 (カレンダー入力) */}
        <div>
          <label
            htmlFor="detail-duedate"
            className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            期日 (カレンダー入力)
          </label>
          <div className="flex gap-2">
            <input
              id="detail-duedate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                aria-label="期日をクリア"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 優先度 */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            優先度
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'low', label: '低 (Low)' },
                { id: 'medium', label: '中 (Medium)' },
                { id: 'high', label: '高 (High)' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  priority === p.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm font-semibold'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 状態 (ステータス) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            状態 (ステータス)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'todo', label: '未着手' },
                { id: 'in-progress', label: '進行中' },
                { id: 'done', label: '完了' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  status === s.id
                    ? 'bg-slate-700 border-amber-400 text-amber-300 font-semibold shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* アヒルの羽色 (duckColor) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            アヒルの色 (duckColor)
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDuckColor(c)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer border-2 ${
                  duckColor.toLowerCase() === c.toLowerCase()
                    ? 'scale-110 border-white ring-2 ring-amber-400'
                    : 'border-slate-700 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`色選択: ${c}`}
              />
            ))}
            <label
              className="w-7 h-7 rounded-full border-2 border-slate-700 hover:scale-105 cursor-pointer flex items-center justify-center bg-slate-800 overflow-hidden relative"
              title="カスタムカラー選択"
            >
              <input
                type="color"
                value={duckColor}
                onChange={(e) => setDuckColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                aria-label="カスタムカラーピッカー"
              />
              <span className="text-[10px] text-slate-400 font-bold">＋</span>
            </label>
          </div>
        </div>

        {/* 完了トグルボタン */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleToggleDone}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
              isDone
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            aria-label={isDone ? '未完了に戻す' : '完了にする'}
          >
            {isDone ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                未完了に戻す
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                タスクを完了にする
              </>
            )}
          </button>
        </div>
      </form>

      {/* フッターアクション（保存・削除） */}
      <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900/90">
        <button
          type="button"
          onClick={() => handleSave()}
          className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
          aria-label="保存する"
        >
          <Save className="w-4 h-4" />
          {showSavedFeedback ? '保存しました！✨' : '保存する'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          aria-label="削除"
        >
          <Trash2 className="w-3.5 h-3.5" />
          このタスクを削除
        </button>
      </div>
    </aside>
  );
}

export function TaskDetailDrawer() {
  const { tasks, selectedTaskId, isDetailDrawerOpen } = useTaskStore();
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  if (!isDetailDrawerOpen || !selectedTask) {
    return null;
  }

  return <TaskDetailDrawerContent key={selectedTask.id} task={selectedTask} />;
}
