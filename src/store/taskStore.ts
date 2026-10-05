import { create } from 'zustand';
import type { Task, TaskPriority, TaskStatus, UserSettings, StorageSchemaV1 } from '../types/task';

export const STORAGE_KEY = 'quacktrack_tasks_v1';
export const STORAGE_VERSION = 1;

export const DEFAULT_COLORS = [
  '#facc15', // Lemon Yellow
  '#fb923c', // Orange
  '#4ade80', // Mint Green
  '#60a5fa', // Sky Blue
  '#f472b6', // Pastel Pink
  '#a78bfa', // Lavender Purple
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  soundEnabled: false,
  showTitleTags: true,
  cameraFollowMode: false,
};

export function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSeedTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-task-1',
      title: 'QuackTrackへようこそ！🦆 アヒルをクリックして詳細を見てね',
      description:
        'アヒルをクリックすると詳細確認や編集ができます。タスクをどんどん追加してみましょう！',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      duckColor: '#facc15',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
    {
      id: 'seed-task-2',
      title: 'タスクを完了にしてみて！池で泳ぎ始めるよ✨',
      description: 'ステータスを変更するとアヒルが池へ移動します。ハチマキを締めて頑張る姿に注目！',
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      duckColor: '#fb923c',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
    {
      id: 'seed-task-3',
      title: 'チュートリアル完了！🎉',
      description:
        '完了したタスクのアヒルは池でのんびりプカプカ泳ぎます。王冠を被ってリラックス中。',
      status: 'done',
      priority: 'low',
      dueDate: null,
      duckColor: '#4ade80',
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    },
  ];
}

export function saveToStorage(tasks: Task[], settings: UserSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload: StorageSchemaV1 = {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      tasks,
      settings,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.setItem('quacktrack-tasks', JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function loadFromStorage(): { tasks: Task[]; settings: UserSettings } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      tasks: createSeedTasks(),
      settings: { ...DEFAULT_USER_SETTINGS },
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First access: initialize with 3 tutorial ducks and default settings, and persist
      const initialTasks = createSeedTasks();
      const initialSettings = { ...DEFAULT_USER_SETTINGS };
      saveToStorage(initialTasks, initialSettings);
      return { tasks: initialTasks, settings: initialSettings };
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const tasks = Array.isArray(parsed.tasks) ? (parsed.tasks as Task[]) : [];
      const settings: UserSettings = {
        ...DEFAULT_USER_SETTINGS,
        ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
      };
      return { tasks, settings };
    }
  } catch (err) {
    console.error('Failed to load tasks from localStorage:', err);
  }

  return {
    tasks: createSeedTasks(),
    settings: { ...DEFAULT_USER_SETTINGS },
  };
}

export interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  isDetailDrawerOpen: boolean;
  settings: UserSettings;

  // Task actions
  addTask: (
    title: string,
    priority?: TaskPriority,
    description?: string,
    dueDate?: string | null,
    duckColor?: string
  ) => Task;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (task: Task) => void;
  toggleStatus: (id: string) => void;
  setSelectedTaskId: (id: string | null) => void;
  setHoveredTaskId: (id: string | null) => void;
  setIsDetailDrawerOpen: (open: boolean) => void;
  openDetailDrawer: (id: string) => void;
  closeDetailDrawer: () => void;

  // Settings actions
  updateSettings: (updates: Partial<UserSettings>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setShowTitleTags: (show: boolean) => void;
  setCameraFollowMode: (enabled: boolean) => void;

  // Import / Export / Storage
  exportData: () => StorageSchemaV1;
  exportJsonString: () => string;
  downloadBackup: (filename?: string) => void;
  importData: (input: string | unknown) => boolean;
  loadFromStorage: () => void;
  resetToInitial: () => void;
  clearAllTasks: () => void;
}

const initial = loadFromStorage();

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: initial.tasks,
  selectedTaskId: null,
  hoveredTaskId: null,
  isDetailDrawerOpen: false,
  settings: initial.settings,

  addTask: (title, priority = 'medium', description = '', dueDate = null, duckColor) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty');
    }
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateTaskId(),
      title: trimmedTitle.slice(0, 100),
      description: description.slice(0, 1000),
      status: 'todo',
      priority,
      dueDate: dueDate ?? null,
      duckColor:
        duckColor ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)] ?? '#facc15',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    set((state) => {
      const updatedTasks = [newTask, ...state.tasks];
      saveToStorage(updatedTasks, state.settings);
      return { tasks: updatedTasks };
    });

    return newTask;
  },

  updateTask: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== id) return task;
        const nextStatus = updates.status ?? task.status;
        let nextCompletedAt = task.completedAt;

        if (updates.status !== undefined) {
          if (updates.status === 'done') {
            nextCompletedAt = updates.completedAt ?? task.completedAt ?? now;
          } else {
            nextCompletedAt = null;
          }
        } else if (updates.completedAt !== undefined) {
          nextCompletedAt = updates.completedAt;
        }

        return {
          ...task,
          ...updates,
          title: updates.title !== undefined ? updates.title.trim().slice(0, 100) : task.title,
          description:
            updates.description !== undefined
              ? updates.description.slice(0, 1000)
              : task.description,
          status: nextStatus,
          completedAt: nextCompletedAt,
          updatedAt: now,
        };
      });

      saveToStorage(updatedTasks, state.settings);
      return { tasks: updatedTasks };
    });
  },

  deleteTask: (id) => {
    set((state) => {
      const updatedTasks = state.tasks.filter((task) => task.id !== id);
      saveToStorage(updatedTasks, state.settings);
      const isSelected = state.selectedTaskId === id;
      return {
        tasks: updatedTasks,
        selectedTaskId: isSelected ? null : state.selectedTaskId,
        isDetailDrawerOpen: isSelected ? false : state.isDetailDrawerOpen,
        hoveredTaskId: state.hoveredTaskId === id ? null : state.hoveredTaskId,
      };
    });
  },

  restoreTask: (task) => {
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) {
        return state;
      }
      const updatedTasks = [task, ...state.tasks];
      saveToStorage(updatedTasks, state.settings);
      return { tasks: updatedTasks };
    });
  },

  toggleStatus: (id) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== id) return task;
        const nextStatus: TaskStatus =
          task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
        return {
          ...task,
          status: nextStatus,
          updatedAt: now,
          completedAt: nextStatus === 'done' ? now : null,
        };
      });

      saveToStorage(updatedTasks, state.settings);
      return { tasks: updatedTasks };
    });
  },

  setSelectedTaskId: (id) =>
    set({
      selectedTaskId: id,
      isDetailDrawerOpen: id !== null,
    }),

  setHoveredTaskId: (id) => set({ hoveredTaskId: id }),

  setIsDetailDrawerOpen: (open) =>
    set((state) => ({
      isDetailDrawerOpen: open,
      selectedTaskId: open ? state.selectedTaskId : null,
    })),

  openDetailDrawer: (id) =>
    set({
      selectedTaskId: id,
      isDetailDrawerOpen: true,
    }),

  closeDetailDrawer: () =>
    set({
      isDetailDrawerOpen: false,
      selectedTaskId: null,
    }),

  updateSettings: (updates) => {
    set((state) => {
      const newSettings: UserSettings = {
        ...state.settings,
        ...updates,
      };
      saveToStorage(state.tasks, newSettings);
      return { settings: newSettings };
    });
  },

  setSoundEnabled: (enabled) => {
    get().updateSettings({ soundEnabled: enabled });
  },

  setShowTitleTags: (show) => {
    get().updateSettings({ showTitleTags: show });
  },

  setCameraFollowMode: (enabled) => {
    get().updateSettings({ cameraFollowMode: enabled });
  },

  exportData: () => {
    const state = get();
    return {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      tasks: state.tasks,
      settings: state.settings,
    };
  },

  exportJsonString: () => {
    return JSON.stringify(get().exportData(), null, 2);
  },

  downloadBackup: (filename) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const jsonStr = get().exportJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `quacktrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importData: (input) => {
    try {
      let parsed: unknown = input;
      if (typeof input === 'string') {
        parsed = JSON.parse(input);
      }

      if (!parsed || typeof parsed !== 'object') {
        return false;
      }

      let rawTasks: unknown[];
      let rawSettings: unknown = undefined;

      if (Array.isArray(parsed)) {
        rawTasks = parsed;
      } else {
        const obj = parsed as Record<string, unknown>;
        if (!('tasks' in obj) || !Array.isArray(obj.tasks)) {
          return false;
        }
        rawTasks = obj.tasks;
        if ('settings' in obj && typeof obj.settings === 'object' && obj.settings !== null) {
          rawSettings = obj.settings;
        }
      }

      const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high'];
      const now = new Date().toISOString();

      const normalizedTasks: Task[] = [];
      for (const item of rawTasks) {
        if (!item || typeof item !== 'object') {
          return false;
        }
        const rawTask = item as Record<string, unknown>;
        if (typeof rawTask.title !== 'string' || !rawTask.title.trim()) {
          return false;
        }

        const status: TaskStatus =
          typeof rawTask.status === 'string' && validStatuses.includes(rawTask.status as TaskStatus)
            ? (rawTask.status as TaskStatus)
            : 'todo';

        const priority: TaskPriority =
          typeof rawTask.priority === 'string' &&
          validPriorities.includes(rawTask.priority as TaskPriority)
            ? (rawTask.priority as TaskPriority)
            : 'medium';

        const createdAt = typeof rawTask.createdAt === 'string' ? rawTask.createdAt : now;
        const updatedAt = typeof rawTask.updatedAt === 'string' ? rawTask.updatedAt : now;
        let completedAt: string | null = null;
        if (typeof rawTask.completedAt === 'string') {
          completedAt = rawTask.completedAt;
        } else if (status === 'done') {
          completedAt = updatedAt;
        }

        normalizedTasks.push({
          id: typeof rawTask.id === 'string' && rawTask.id ? rawTask.id : generateTaskId(),
          title: rawTask.title.trim().slice(0, 100),
          description:
            typeof rawTask.description === 'string' ? rawTask.description.slice(0, 1000) : '',
          status,
          priority,
          dueDate: typeof rawTask.dueDate === 'string' ? rawTask.dueDate : null,
          duckColor:
            typeof rawTask.duckColor === 'string' && rawTask.duckColor
              ? rawTask.duckColor
              : (DEFAULT_COLORS[normalizedTasks.length % DEFAULT_COLORS.length] ?? '#facc15'),
          createdAt,
          updatedAt,
          completedAt,
        });
      }

      const currentSettings = get().settings;
      const settingsObj = (rawSettings ?? {}) as Record<string, unknown>;
      const newSettings: UserSettings = {
        soundEnabled:
          typeof settingsObj.soundEnabled === 'boolean'
            ? settingsObj.soundEnabled
            : currentSettings.soundEnabled,
        showTitleTags:
          typeof settingsObj.showTitleTags === 'boolean'
            ? settingsObj.showTitleTags
            : currentSettings.showTitleTags,
        cameraFollowMode:
          typeof settingsObj.cameraFollowMode === 'boolean'
            ? settingsObj.cameraFollowMode
            : currentSettings.cameraFollowMode,
      };

      set({
        tasks: normalizedTasks,
        settings: newSettings,
        selectedTaskId: null,
        hoveredTaskId: null,
        isDetailDrawerOpen: false,
      });
      saveToStorage(normalizedTasks, newSettings);
      return true;
    } catch (err) {
      console.error('Failed to import data:', err);
      return false;
    }
  },

  loadFromStorage: () => {
    const loaded = loadFromStorage();
    set({ tasks: loaded.tasks, settings: loaded.settings });
  },

  resetToInitial: () => {
    const initialTasks = createSeedTasks();
    const initialSettings = { ...DEFAULT_USER_SETTINGS };
    saveToStorage(initialTasks, initialSettings);
    set({
      tasks: initialTasks,
      settings: initialSettings,
      selectedTaskId: null,
      hoveredTaskId: null,
      isDetailDrawerOpen: false,
    });
  },

  clearAllTasks: () => {
    set((state) => {
      saveToStorage([], state.settings);
      return {
        tasks: [],
        selectedTaskId: null,
        hoveredTaskId: null,
        isDetailDrawerOpen: false,
      };
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __quacktrack_task_store?: typeof useTaskStore }).__quacktrack_task_store =
    useTaskStore;
}
