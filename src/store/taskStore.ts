import { create } from 'zustand';
import type { Task, TaskPriority, TaskStatus } from '../types/task';

const DEFAULT_COLORS = ['#facc15', '#fb923c', '#4ade80', '#60a5fa', '#f472b6'];

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  addTask: (title: string, priority?: TaskPriority, description?: string) => Task;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  toggleStatus: (id: string) => void;
  setSelectedTaskId: (id: string | null) => void;
}

const initialTasks: Task[] = [
  {
    id: 'sample-1',
    title: '仕様書の確認と設計',
    description: 'QuackTrackのアーキテクチャと仕様の確認',
    status: 'done',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    duckColor: '#4ade80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    title: 'QuackTrackの土台構築',
    description: 'React + Three.js + Tailwind + Vitest の環境整備',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  },
  {
    id: 'sample-3',
    title: 'アヒルの3Dモデルとアニメーション',
    description: '可愛い羽ばたきと歩行アクションの実装',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 259200000).toISOString(),
    duckColor: '#fb923c',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  },
];

export const useTaskStore = create<TaskState>((set) => ({
  tasks: initialTasks,
  selectedTaskId: null,
  addTask: (title, priority = 'medium', description = '') => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description,
      status: 'todo',
      priority,
      dueDate: null,
      duckColor: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)] ?? '#facc15',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },
  updateTask: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...updates,
              updatedAt: now,
              completedAt:
                updates.status === 'done'
                  ? (task.completedAt ?? now)
                  : updates.status
                    ? null
                    : task.completedAt,
            }
          : task
      ),
    }));
  },
  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }));
  },
  toggleStatus: (id) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== id) return task;
        const nextStatus: TaskStatus =
          task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
        const now = new Date().toISOString();
        return {
          ...task,
          status: nextStatus,
          updatedAt: now,
          completedAt: nextStatus === 'done' ? now : null,
        };
      }),
    }));
  },
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
}));
