import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuckCanvas } from './DuckCanvas';
import { useCameraStore } from '../store/cameraStore';
import { useTaskStore } from '../store/taskStore';

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
          dueDate: '2026-10-31T00:00:00.000Z',
          duckColor: '#facc15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      selectedTaskId: null,
      hoveredTaskId: null,
      isDetailDrawerOpen: false,
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

  it('3Dアヒルのホバーでフロートツールチップが表示され、マウスアウトで非表示になる', () => {
    render(<DuckCanvas />);

    const duckEntity = screen.getByTestId('duck-test-duck-1');
    expect(screen.queryByTestId('duck-tooltip')).not.toBeInTheDocument();

    // ホバー発生
    fireEvent.pointerOver(duckEntity, { clientX: 200, clientY: 250 });

    const tooltip = screen.getByTestId('duck-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('テストタスク1');
    expect(tooltip).toHaveTextContent('期日: 2026-10-31');
    expect(tooltip).toHaveTextContent('未着手');
    expect(useTaskStore.getState().hoveredTaskId).toBe('test-duck-1');

    // マウスアウト
    fireEvent.pointerOut(duckEntity);
    expect(screen.queryByTestId('duck-tooltip')).not.toBeInTheDocument();
    expect(useTaskStore.getState().hoveredTaskId).toBeNull();
  });

  it('3Dアヒルのクリックでカメラフォーカス・詳細ドロワー自動展開・選択状態が設定される', async () => {
    const user = userEvent.setup();
    const focusOnSpy = vi.spyOn(useCameraStore.getState(), 'focusOn');

    render(<DuckCanvas />);

    const duckEntity = screen.getByTestId('duck-test-duck-1');
    await user.click(duckEntity);

    expect(focusOnSpy).toHaveBeenCalled();
    expect(useTaskStore.getState().selectedTaskId).toBe('test-duck-1');
    expect(useTaskStore.getState().isDetailDrawerOpen).toBe(true);

    focusOnSpy.mockRestore();
  });
});
