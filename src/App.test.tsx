import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useTaskStore } from './store/taskStore';
import { useCameraStore } from './store/cameraStore';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  Billboard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Sparkles: () => <div data-testid="mock-drei-sparkles" />,
}));

vi.mock('./components/world/World', () => ({
  World: () => <div data-testid="mock-world" />,
}));

describe('App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useCameraStore.setState({
      resetTrigger: 0,
      targetFocus: null,
    });
    useTaskStore.setState({
      tasks: [
        {
          id: 'app-task-1',
          title: 'アプリテストタスク1',
          description: 'アプリ全体の連携テスト用',
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
      settings: {
        soundEnabled: false,
        showTitleTags: true,
        cameraFollowMode: false,
      },
    });
  });

  it('renders HeaderBar, TaskPanel, and DuckCanvas', () => {
    render(<App />);

    expect(screen.getByTestId('header-bar')).toBeInTheDocument();
    expect(screen.getByTestId('task-panel')).toBeInTheDocument();
    expect(screen.getByTestId('duck-canvas-container')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-app-task-1')).toBeInTheDocument();
  });

  it('opens and closes BackupModal via header button and close actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByTestId('backup-modal')).not.toBeInTheDocument();

    // Open modal via header button
    const backupButton = screen.getByTestId('backup-modal-open-button');
    await user.click(backupButton);

    expect(screen.getByTestId('backup-modal')).toBeInTheDocument();

    // Close via Esc key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByTestId('backup-modal')).not.toBeInTheDocument();
  });

  it('toggles mobile drawer via hamburger button and closes on backdrop click', async () => {
    const user = userEvent.setup();
    render(<App />);

    const hamburgerButton = screen.getByTestId('hamburger-menu-button');
    expect(screen.queryByTestId('mobile-drawer-backdrop')).not.toBeInTheDocument();

    // Open drawer
    await user.click(hamburgerButton);
    const backdrop = screen.getByTestId('mobile-drawer-backdrop');
    expect(backdrop).toBeInTheDocument();

    // Click backdrop to close
    await user.click(backdrop);
    expect(screen.queryByTestId('mobile-drawer-backdrop')).not.toBeInTheDocument();
  });

  it('closes mobile drawer on Escape key press', async () => {
    const user = userEvent.setup();
    render(<App />);

    const hamburgerButton = screen.getByTestId('hamburger-menu-button');
    await user.click(hamburgerButton);
    expect(screen.getByTestId('mobile-drawer-backdrop')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByTestId('mobile-drawer-backdrop')).not.toBeInTheDocument();
  });
});
