import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuckCanvas } from './DuckCanvas';
import { useCameraStore } from '../store/cameraStore';
import { useTaskStore } from '../store/taskStore';

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="mock-r3f-canvas" />,
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./world/World', () => ({
  World: () => <div data-testid="mock-world" />,
}));

describe('DuckCanvas Component', () => {
  beforeEach(() => {
    useCameraStore.setState({
      resetTrigger: 0,
      targetFocus: null,
    });
    useTaskStore.setState({
      tasks: [
        {
          id: 'test-duck-1',
          title: 'テストタスク1',
          status: 'todo',
          priority: 'medium',
          description: '',
          dueDate: null,
          duckColor: '#facc15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      selectedTaskId: null,
    });
  });

  it('renders canvas container, overlay buttons, and legends', () => {
    render(<DuckCanvas />);

    expect(screen.getByTestId('duck-canvas-container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '視点リセット' })).toBeInTheDocument();
    expect(screen.getByText('草原')).toBeInTheDocument();
    expect(screen.getByText('池')).toBeInTheDocument();
  });

  it('triggers camera reset when "視点リセット" button is clicked', async () => {
    const user = userEvent.setup();
    render(<DuckCanvas />);

    const initialTrigger = useCameraStore.getState().resetTrigger;
    const resetButton = screen.getByRole('button', { name: '視点リセット' });

    await user.click(resetButton);

    expect(useCameraStore.getState().resetTrigger).toBe(initialTrigger + 1);
  });
});
