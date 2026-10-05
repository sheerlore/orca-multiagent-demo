import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useTaskStore,
  STORAGE_KEY,
  STORAGE_VERSION,
  DEFAULT_USER_SETTINGS,
  createSeedTasks,
  loadFromStorage,
  saveToStorage,
  generateTaskId,
} from './taskStore';
import type { StorageSchemaV1, Task } from '../types/task';

describe('taskStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      settings: { ...DEFAULT_USER_SETTINGS },
    });
  });

  describe('Task CRUD and Status Transitions', () => {
    it('adds a new task with unique id and default values', () => {
      const task = useTaskStore.getState().addTask('新しいタスク', 'high', '詳細メモ');
      const state = useTaskStore.getState();

      expect(state.tasks).toHaveLength(1);
      expect(task.id).toBeDefined();
      expect(task.id.length).toBeGreaterThan(0);
      expect(task.title).toBe('新しいタスク');
      expect(task.description).toBe('詳細メモ');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBeNull();
      expect(task.duckColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
      expect(task.completedAt).toBeNull();
    });

    it('trims whitespace and enforces maximum length on title and description', () => {
      const longTitle = '   ' + 'a'.repeat(120) + '   ';
      const longDescription = 'b'.repeat(1200);

      const task = useTaskStore.getState().addTask(longTitle, 'medium', longDescription);
      expect(task.title).toHaveLength(100);
      expect(task.title).toBe('a'.repeat(100));
      expect(task.description).toHaveLength(1000);
      expect(task.description).toBe('b'.repeat(1000));
    });

    it('throws error when adding a task with an empty or whitespace-only title', () => {
      expect(() => {
        useTaskStore.getState().addTask('   ');
      }).toThrow('Task title cannot be empty');
    });

    it('allows specifying custom dueDate and duckColor when adding a task', () => {
      const due = '2026-12-31T23:59:59.000Z';
      const color = '#60a5fa';
      const task = useTaskStore.getState().addTask('カスタムタスク', 'low', '詳細', due, color);

      expect(task.dueDate).toBe(due);
      expect(task.duckColor).toBe(color);
    });

    it('updates task properties including title, description, priority, and updatedAt', () => {
      const task = useTaskStore.getState().addTask('更新前タスク');
      const initialUpdatedAt = task.updatedAt;

      useTaskStore.getState().updateTask(task.id, {
        title: '更新後タスク',
        description: '新しい詳細',
        priority: 'high',
        duckColor: '#fb923c',
      });

      const updated = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(updated?.title).toBe('更新後タスク');
      expect(updated?.description).toBe('新しい詳細');
      expect(updated?.priority).toBe('high');
      expect(updated?.duckColor).toBe('#fb923c');
      expect(updated?.updatedAt).toBeDefined();
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initialUpdatedAt).getTime()
      );
    });

    it('sets completedAt when status is updated to done, and clears it when reverted', () => {
      const task = useTaskStore.getState().addTask('完了ステータステスト');
      expect(task.completedAt).toBeNull();

      // Update to done
      useTaskStore.getState().updateTask(task.id, { status: 'done' });
      const doneTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(doneTask?.status).toBe('done');
      expect(doneTask?.completedAt).not.toBeNull();

      // Update back to in-progress
      useTaskStore.getState().updateTask(task.id, { status: 'in-progress' });
      const revertedTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(revertedTask?.status).toBe('in-progress');
      expect(revertedTask?.completedAt).toBeNull();
    });

    it('cycles through task statuses via toggleStatus (todo -> in-progress -> done -> todo)', () => {
      const task = useTaskStore.getState().addTask('トグルテスト');

      // todo -> in-progress
      useTaskStore.getState().toggleStatus(task.id);
      let current = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(current.status).toBe('in-progress');
      expect(current.completedAt).toBeNull();

      // in-progress -> done
      useTaskStore.getState().toggleStatus(task.id);
      current = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(current.status).toBe('done');
      expect(current.completedAt).not.toBeNull();

      // done -> todo
      useTaskStore.getState().toggleStatus(task.id);
      current = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(current.status).toBe('todo');
      expect(current.completedAt).toBeNull();
    });

    it('deletes a task and resets selectedTaskId if the deleted task was selected', () => {
      const task1 = useTaskStore.getState().addTask('削除対象');
      const task2 = useTaskStore.getState().addTask('残すタスク');

      useTaskStore.getState().setSelectedTaskId(task1.id);
      expect(useTaskStore.getState().selectedTaskId).toBe(task1.id);

      useTaskStore.getState().deleteTask(task1.id);
      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]?.id).toBe(task2.id);
      expect(state.selectedTaskId).toBeNull();
    });

    it('restores a deleted task via restoreTask', () => {
      const task = useTaskStore.getState().addTask('元に戻すテスト');
      useTaskStore.getState().deleteTask(task.id);
      expect(useTaskStore.getState().tasks).toHaveLength(0);

      useTaskStore.getState().restoreTask(task);
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().tasks[0]?.id).toBe(task.id);
      expect(useTaskStore.getState().tasks[0]?.title).toBe('元に戻すテスト');

      // Duplicate restore should not add again
      useTaskStore.getState().restoreTask(task);
      expect(useTaskStore.getState().tasks).toHaveLength(1);
    });

    it('clears all tasks via clearAllTasks', () => {
      useTaskStore.getState().addTask('タスク1');
      useTaskStore.getState().addTask('タスク2');
      expect(useTaskStore.getState().tasks).toHaveLength(2);

      useTaskStore.getState().clearAllTasks();
      expect(useTaskStore.getState().tasks).toHaveLength(0);
      expect(useTaskStore.getState().selectedTaskId).toBeNull();
    });
  });

  describe('localStorage Persistence & Synchronization', () => {
    it('automatically synchronizes tasks to localStorage on addTask', () => {
      const task = useTaskStore.getState().addTask('保存テスト');
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed: StorageSchemaV1 = JSON.parse(raw!);
      expect(parsed.version).toBe(STORAGE_VERSION);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0]?.id).toBe(task.id);
      expect(parsed.tasks[0]?.title).toBe('保存テスト');
    });

    it('automatically synchronizes to localStorage on updateTask and deleteTask', () => {
      const task = useTaskStore.getState().addTask('更新保存テスト');
      useTaskStore.getState().updateTask(task.id, { title: '更新後' });

      let raw = localStorage.getItem(STORAGE_KEY);
      let parsed: StorageSchemaV1 = JSON.parse(raw!);
      expect(parsed.tasks[0]?.title).toBe('更新後');

      useTaskStore.getState().deleteTask(task.id);
      raw = localStorage.getItem(STORAGE_KEY);
      parsed = JSON.parse(raw!);
      expect(parsed.tasks).toHaveLength(0);
    });

    it('automatically synchronizes to localStorage on toggleStatus', () => {
      const task = useTaskStore.getState().addTask('トグル保存テスト');
      useTaskStore.getState().toggleStatus(task.id);

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: StorageSchemaV1 = JSON.parse(raw!);
      expect(parsed.tasks[0]?.status).toBe('in-progress');
    });

    it('restores tasks and settings from localStorage when existing data is found', () => {
      const persistedTasks: Task[] = [
        {
          id: 'persisted-1',
          title: '既存データタスク',
          description: '既存詳細',
          status: 'in-progress',
          priority: 'high',
          dueDate: '2026-10-10T12:00:00.000Z',
          duckColor: '#4ade80',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
          completedAt: null,
        },
      ];
      const persistedSchema: StorageSchemaV1 = {
        version: 1,
        lastUpdated: '2026-10-02T00:00:00.000Z',
        tasks: persistedTasks,
        settings: {
          soundEnabled: true,
          showTitleTags: false,
          cameraFollowMode: true,
        },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedSchema));

      useTaskStore.getState().loadFromStorage();
      const state = useTaskStore.getState();

      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]?.id).toBe('persisted-1');
      expect(state.tasks[0]?.title).toBe('既存データタスク');
      expect(state.settings.soundEnabled).toBe(true);
      expect(state.settings.showTitleTags).toBe(false);
      expect(state.settings.cameraFollowMode).toBe(true);
    });
  });

  describe('Initial Onboarding Seed Data (SPEC 3.5.3)', () => {
    it('seeds 3 tutorial ducks (todo, in-progress, done) on first access when localStorage is empty', () => {
      localStorage.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      useTaskStore.getState().loadFromStorage();
      const tasks = useTaskStore.getState().tasks;

      expect(tasks).toHaveLength(3);

      const todoDuck = tasks.find((t) => t.status === 'todo');
      const inProgressDuck = tasks.find((t) => t.status === 'in-progress');
      const doneDuck = tasks.find((t) => t.status === 'done');

      expect(todoDuck).toBeDefined();
      expect(todoDuck?.title).toContain('QuackTrackへようこそ！');
      expect(todoDuck?.completedAt).toBeNull();

      expect(inProgressDuck).toBeDefined();
      expect(inProgressDuck?.title).toContain('タスクを完了にしてみて！');
      expect(inProgressDuck?.completedAt).toBeNull();

      expect(doneDuck).toBeDefined();
      expect(doneDuck?.title).toContain('チュートリアル完了！');
      expect(doneDuck?.completedAt).not.toBeNull();

      // Confirms it was written to localStorage
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      expect(savedRaw).not.toBeNull();
      const savedSchema: StorageSchemaV1 = JSON.parse(savedRaw!);
      expect(savedSchema.tasks).toHaveLength(3);
    });

    it('resetToInitial restores the 3 tutorial seed ducks and default settings', () => {
      useTaskStore.getState().addTask('作業タスク');
      useTaskStore.getState().setSoundEnabled(true);
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().settings.soundEnabled).toBe(true);

      useTaskStore.getState().resetToInitial();
      const state = useTaskStore.getState();

      expect(state.tasks).toHaveLength(3);
      expect(state.settings.soundEnabled).toBe(false);
      expect(state.settings.showTitleTags).toBe(true);
      expect(state.settings.cameraFollowMode).toBe(false);

      const savedSchema: StorageSchemaV1 = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(savedSchema.tasks).toHaveLength(3);
    });

    it('createSeedTasks returns valid Task objects', () => {
      const seeds = createSeedTasks();
      expect(seeds).toHaveLength(3);
      seeds.forEach((seed) => {
        expect(seed.id).toBeDefined();
        expect(seed.title).toBeTruthy();
        expect(typeof seed.description).toBe('string');
        expect(['todo', 'in-progress', 'done']).toContain(seed.status);
        expect(['low', 'medium', 'high']).toContain(seed.priority);
        expect(seed.duckColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(seed.createdAt).toBeDefined();
        expect(seed.updatedAt).toBeDefined();
      });
    });
  });

  describe('User Settings Management', () => {
    it('initializes with default user settings', () => {
      const settings = useTaskStore.getState().settings;
      expect(settings.soundEnabled).toBe(false);
      expect(settings.showTitleTags).toBe(true);
      expect(settings.cameraFollowMode).toBe(false);
    });

    it('updates settings partially and persists to localStorage', () => {
      useTaskStore.getState().updateSettings({ soundEnabled: true });
      expect(useTaskStore.getState().settings.soundEnabled).toBe(true);
      expect(useTaskStore.getState().settings.showTitleTags).toBe(true);

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: StorageSchemaV1 = JSON.parse(raw!);
      expect(parsed.settings.soundEnabled).toBe(true);
    });

    it('provides dedicated setters for sound, title tags, and camera follow', () => {
      useTaskStore.getState().setSoundEnabled(true);
      expect(useTaskStore.getState().settings.soundEnabled).toBe(true);

      useTaskStore.getState().setShowTitleTags(false);
      expect(useTaskStore.getState().settings.showTitleTags).toBe(false);

      useTaskStore.getState().setCameraFollowMode(true);
      expect(useTaskStore.getState().settings.cameraFollowMode).toBe(true);

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: StorageSchemaV1 = JSON.parse(raw!);
      expect(parsed.settings.soundEnabled).toBe(true);
      expect(parsed.settings.showTitleTags).toBe(false);
      expect(parsed.settings.cameraFollowMode).toBe(true);
    });
  });

  describe('JSON Export and Import (SPEC 3.5.4)', () => {
    it('exports data matching StorageSchemaV1 format', () => {
      const task = useTaskStore.getState().addTask('エクスポート対象タスク', 'high');
      useTaskStore.getState().setSoundEnabled(true);

      const exported = useTaskStore.getState().exportData();
      expect(exported.version).toBe(STORAGE_VERSION);
      expect(exported.lastUpdated).toBeDefined();
      expect(exported.tasks).toHaveLength(1);
      expect(exported.tasks[0]?.id).toBe(task.id);
      expect(exported.settings.soundEnabled).toBe(true);

      const jsonString = useTaskStore.getState().exportJsonString();
      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe(1);
      expect(parsed.tasks[0]?.title).toBe('エクスポート対象タスク');
    });

    it('downloads backup via trigger in browser environment', () => {
      // Mock createObjectURL & revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = mockCreateObjectURL;
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      useTaskStore.getState().addTask('ダウンロードテスト');
      useTaskStore.getState().downloadBackup('custom-backup.json');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      clickSpy.mockRestore();
    });

    it('successfully imports a valid JSON string backup', () => {
      const backupData: StorageSchemaV1 = {
        version: 1,
        lastUpdated: '2026-10-06T00:00:00.000Z',
        tasks: [
          {
            id: 'imp-1',
            title: 'インポートタスク',
            description: 'インポートされた詳細',
            status: 'done',
            priority: 'low',
            dueDate: '2026-11-01T00:00:00.000Z',
            duckColor: '#f472b6',
            createdAt: '2026-10-06T00:00:00.000Z',
            updatedAt: '2026-10-06T00:00:00.000Z',
            completedAt: '2026-10-06T00:00:00.000Z',
          },
        ],
        settings: {
          soundEnabled: true,
          showTitleTags: false,
          cameraFollowMode: true,
        },
      };

      const result = useTaskStore.getState().importData(JSON.stringify(backupData));
      expect(result).toBe(true);

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]?.id).toBe('imp-1');
      expect(state.tasks[0]?.title).toBe('インポートタスク');
      expect(state.tasks[0]?.status).toBe('done');
      expect(state.settings.soundEnabled).toBe(true);
      expect(state.settings.showTitleTags).toBe(false);

      // Verify persisted
      const saved: StorageSchemaV1 = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.tasks[0]?.id).toBe('imp-1');
    });

    it('successfully imports an object directly or task array', () => {
      const rawArray = [
        {
          title: '配列形式タスク',
          status: 'todo',
          priority: 'medium',
        },
      ];

      const result = useTaskStore.getState().importData(rawArray);
      expect(result).toBe(true);

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]?.title).toBe('配列形式タスク');
      expect(state.tasks[0]?.id).toBeDefined();
      expect(state.tasks[0]?.duckColor).toBeDefined();
    });

    it('rejects invalid or corrupted JSON data gracefully without mutating existing state', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      useTaskStore.getState().addTask('維持されるタスク');

      expect(useTaskStore.getState().importData('invalid json string')).toBe(false);
      expect(useTaskStore.getState().importData(null)).toBe(false);
      expect(useTaskStore.getState().importData(123)).toBe(false);
      expect(useTaskStore.getState().importData({ something: 'wrong' })).toBe(false);
      expect(useTaskStore.getState().importData({ tasks: [{ noTitle: true }] })).toBe(false);

      // State is preserved
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().tasks[0]?.title).toBe('維持されるタスク');
      consoleSpy.mockRestore();
    });
  });

  describe('Storage and ID generation utility functions', () => {
    it('generateTaskId generates non-empty unique strings', () => {
      const id1 = generateTaskId();
      const id2 = generateTaskId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('saveToStorage and loadFromStorage handle graceful fallback on corrupt storage', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, '{ invalid json');
      const loaded = loadFromStorage();
      // Should fallback to seed tasks
      expect(loaded.tasks).toHaveLength(3);
      expect(loaded.settings).toEqual(DEFAULT_USER_SETTINGS);
      consoleSpy.mockRestore();
    });

    it('saveToStorage persists valid schema', () => {
      saveToStorage([], DEFAULT_USER_SETTINGS);
      const parsed: StorageSchemaV1 = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(parsed.version).toBe(1);
      expect(parsed.tasks).toEqual([]);
      expect(parsed.settings).toEqual(DEFAULT_USER_SETTINGS);
    });
  });
});
