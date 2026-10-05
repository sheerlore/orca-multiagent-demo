import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Sparkles } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import type { TaskPriority, TaskStatus } from '../types/task';

export function TaskPanel() {
  const { tasks, selectedTaskId, addTask, deleteTask, toggleStatus, setSelectedTaskId } =
    useTaskStore();

  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), priority);
    setNewTitle('');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

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
    <aside className="w-80 md:w-96 h-full flex flex-col bg-slate-900/90 backdrop-blur-md border-r border-slate-800 z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
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
      </div>

      {/* Task Input Form */}
      <form onSubmit={handleCreate} className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="新しいタスクを入力..."
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
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
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

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium text-slate-400">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-center transition-colors ${
            filter === 'all' ? 'text-amber-400 border-b-2 border-amber-400' : 'hover:text-slate-200'
          }`}
        >
          すべて ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 text-center transition-colors ${
            filter === 'active'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'hover:text-slate-200'
          }`}
        >
          進行中 ({tasks.filter((t) => t.status !== 'done').length})
        </button>
        <button
          onClick={() => setFilter('done')}
          className={`flex-1 py-2 text-center transition-colors ${
            filter === 'done'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'hover:text-slate-200'
          }`}
        >
          完了 ({tasks.filter((t) => t.status === 'done').length})
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            タスクはありません。新しいタスクを追加してください。
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
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
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors rounded"
                    aria-label={`削除: ${task.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <button
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
