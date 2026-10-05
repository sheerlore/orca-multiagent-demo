import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderBar } from './HeaderBar';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';

describe('HeaderBar Component', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: '未完了タスク1',
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
          id: 'task-2',
          title: '進行中タスク2',
          description: '',
          status: 'in-progress',
          priority: 'high',
          dueDate: null,
          duckColor: '#fb923c',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
        {
          id: 'task-3',
          title: '完了タスク3',
          description: '',
          status: 'done',
          priority: 'low',
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
        cameraFollowMode: false,
      },
    });

    useCameraStore.setState({
      resetTrigger: 0,
      targetFocus: null,
    });
  });

  it('renders application logo and title', () => {
    render(<HeaderBar />);
    expect(screen.getByText('QuackTrack')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'duck' })).toBeInTheDocument();
  });

  it('displays accurate duck count badges for unfinished and completed tasks', () => {
    render(<HeaderBar />);
    // 未完了は todo (1) + in-progress (1) = 2羽
    expect(screen.getByTestId('duck-count-active')).toHaveTextContent('未完了: 2羽');
    // 完了は done (1) = 1羽
    expect(screen.getByTestId('duck-count-done')).toHaveTextContent('完了: 1羽');
  });

  it('toggles sound ON and OFF via sound button and updates store & icon', async () => {
    const user = userEvent.setup();
    render(<HeaderBar />);

    const soundButton = screen.getByTestId('sound-toggle-button');
    expect(screen.getByTestId('volume-off-icon')).toBeInTheDocument();
    expect(useTaskStore.getState().settings.soundEnabled).toBe(false);

    // Click to turn ON
    await user.click(soundButton);
    expect(useTaskStore.getState().settings.soundEnabled).toBe(true);
    expect(screen.getByTestId('volume-on-icon')).toBeInTheDocument();

    // Click to turn OFF
    await user.click(soundButton);
    expect(useTaskStore.getState().settings.soundEnabled).toBe(false);
    expect(screen.getByTestId('volume-off-icon')).toBeInTheDocument();
  });

  it('calls resetCamera on camera store when camera reset button is clicked', async () => {
    const user = userEvent.setup();
    const resetCameraSpy = vi.spyOn(useCameraStore.getState(), 'resetCamera');

    render(<HeaderBar />);
    const cameraButton = screen.getByTestId('camera-reset-button');
    await user.click(cameraButton);

    expect(resetCameraSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().resetTrigger).toBe(1);

    resetCameraSpy.mockRestore();
  });

  it('calls onOpenBackupModal when backup button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenBackupModal = vi.fn();

    render(<HeaderBar onOpenBackupModal={onOpenBackupModal} />);
    const backupButton = screen.getByTestId('backup-modal-open-button');
    await user.click(backupButton);

    expect(onOpenBackupModal).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleDrawer when hamburger menu button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleDrawer = vi.fn();

    const { rerender } = render(<HeaderBar onToggleDrawer={onToggleDrawer} isDrawerOpen={false} />);
    const hamburgerButton = screen.getByTestId('hamburger-menu-button');
    expect(hamburgerButton).toHaveAttribute('aria-label', 'メニューを開く');
    expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(hamburgerButton);
    expect(onToggleDrawer).toHaveBeenCalledTimes(1);

    // Rerender as open
    rerender(<HeaderBar onToggleDrawer={onToggleDrawer} isDrawerOpen={true} />);
    expect(screen.getByTestId('hamburger-menu-button')).toHaveAttribute(
      'aria-label',
      'メニューを閉じる'
    );
    expect(screen.getByTestId('hamburger-menu-button')).toHaveAttribute('aria-expanded', 'true');
  });
});
