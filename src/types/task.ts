export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  duckColor: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface UserSettings {
  soundEnabled: boolean;
  showTitleTags: boolean;
  cameraFollowMode: boolean;
}

export interface StorageSchemaV1 {
  version: 1;
  lastUpdated: string;
  tasks: Task[];
  settings: UserSettings;
}
