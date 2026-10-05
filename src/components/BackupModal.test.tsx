import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupModal } from './BackupModal';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';

describe('BackupModal Component', () => {
  const initialTask: Task = {
    id: 'test-backup-1',
    title: 'バックアップ対象タスク',
    description: '詳細説明',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-10-20T00:00:00.000Z',
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  beforeEach(() => {
    localStorage.clear();
    useTaskStore.setState({
      tasks: [initialTask],
      settings: {
        soundEnabled: true,
        showTitleTags: true,
        cameraFollowMode: false,
      },
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<BackupModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('backup-modal')).not.toBeInTheDocument();
  });

  it('renders dialog elements when isOpen is true', () => {
    render(<BackupModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('backup-modal')).toBeInTheDocument();
    expect(screen.getByText('データバックアップ＆移行')).toBeInTheDocument();
    expect(screen.getByText('タスク総数:')).toBeInTheDocument();
    expect(screen.getByText('1 件')).toBeInTheDocument();
  });

  it('calls onClose when close button or Esc key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(<BackupModal isOpen={true} onClose={onClose} />);

    // Click close button (X)
    const closeBtn = screen.getByTestId('backup-modal-close-button');
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    rerender(<BackupModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when clicking outside modal backdrop', () => {
    const onClose = vi.fn();
    render(<BackupModal isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByTestId('backup-modal');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exports JSON backup and triggers download when download button is clicked', async () => {
    const user = userEvent.setup();
    const downloadBackupSpy = vi.spyOn(useTaskStore.getState(), 'downloadBackup');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<BackupModal isOpen={true} onClose={vi.fn()} />);

    const exportBtn = screen.getByTestId('export-json-button');
    await user.click(exportBtn);

    expect(downloadBackupSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('backup-success-alert')).toBeInTheDocument();
    expect(
      screen.getByText(/バックアップ「quacktrack-backup-.*\.json」をダウンロードしました！/)
    ).toBeInTheDocument();

    downloadBackupSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('successfully imports valid JSON file and updates taskStore', async () => {
    const user = userEvent.setup();
    render(<BackupModal isOpen={true} onClose={vi.fn()} />);

    const backupData = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      tasks: [
        {
          id: 'imported-1',
          title: '復元されたタスク',
          description: 'インポート成功メモ',
          status: 'done',
          priority: 'high',
          dueDate: null,
          duckColor: '#4ade80',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      settings: {
        soundEnabled: false,
        showTitleTags: true,
        cameraFollowMode: true,
      },
    };

    const file = new File([JSON.stringify(backupData)], 'quacktrack-backup-2026-10-06.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('backup-file-input');
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByTestId('backup-success-alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/から 1件のタスクを正常に復元しました！/)).toBeInTheDocument();

    const currentTasks = useTaskStore.getState().tasks;
    expect(currentTasks).toHaveLength(1);
    expect(currentTasks[0]?.id).toBe('imported-1');
    expect(currentTasks[0]?.title).toBe('復元されたタスク');
  });

  it('shows error notification when imported file is invalid JSON', async () => {
    const user = userEvent.setup();
    render(<BackupModal isOpen={true} onClose={vi.fn()} />);

    const corruptedFile = new File(['THIS IS NOT JSON {[[{'], 'broken.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('backup-file-input');
    await user.upload(fileInput, corruptedFile);

    await waitFor(() => {
      expect(screen.getByTestId('backup-error-alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/無効なJSONフォーマットです/)).toBeInTheDocument();

    // Store is preserved
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0]?.id).toBe('test-backup-1');
  });

  it('shows error notification when imported JSON tasks have missing title', async () => {
    const user = userEvent.setup();
    render(<BackupModal isOpen={true} onClose={vi.fn()} />);

    const invalidTasksData = {
      version: 1,
      tasks: [
        {
          id: 'bad-1',
          title: '   ', // Empty title
          status: 'todo',
        },
      ],
    };

    const file = new File([JSON.stringify(invalidTasksData)], 'invalid-tasks.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('backup-file-input');
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByTestId('backup-error-alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/タスクタイトルが存在しないデータが含まれています/)
    ).toBeInTheDocument();
  });

  it('resets to initial tutorial seed tasks when reset button is confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<BackupModal isOpen={true} onClose={vi.fn()} />);

    const resetBtn = screen.getByTestId('reset-initial-button');
    await user.click(resetBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId('backup-success-alert')).toBeInTheDocument();
    expect(screen.getByText('初期チュートリアルデータにリセットしました。')).toBeInTheDocument();

    // チュートリアル3羽が復元されている
    expect(useTaskStore.getState().tasks).toHaveLength(3);

    confirmSpy.mockRestore();
  });
});
