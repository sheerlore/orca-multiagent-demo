import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CelebrationSplash } from './CelebrationSplash';

let recordedFrameCallback:
  | ((state: { clock: { getElapsedTime: () => number } }, delta: number) => void)
  | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: { clock: { getElapsedTime: () => number } }, delta: number) => void) => {
    recordedFrameCallback = cb;
  },
}));

describe('CelebrationSplash Component', () => {
  beforeEach(() => {
    recordedFrameCallback = null;
  });

  it('スプラッシュ波紋グループおよび内外のリングメッシュがレンダリングされる', () => {
    render(<CelebrationSplash />);

    expect(screen.getByTestId('celebration-splash')).toBeInTheDocument();
    expect(screen.getByTestId('splash-inner-ring')).toBeInTheDocument();
    expect(screen.getByTestId('splash-outer-ring')).toBeInTheDocument();
  });

  it('duration経過時にonCompleteが呼び出され、コンポーネントが破棄される', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <CelebrationSplash duration={0.8} onComplete={onComplete} />
    );

    expect(screen.getByTestId('celebration-splash')).toBeInTheDocument();

    // 0.4秒経過 (0.08s * 5) -> まだ未完了
    act(() => {
      for (let i = 0; i < 5; i++) {
        recordedFrameCallback?.({ clock: { getElapsedTime: () => i * 0.08 } }, 0.08);
      }
    });
    expect(onComplete).not.toHaveBeenCalled();

    // さらに0.6秒経過 (0.08s * 8、累計1.04秒でduration 0.8秒を超過)
    act(() => {
      for (let i = 0; i < 8; i++) {
        recordedFrameCallback?.({ clock: { getElapsedTime: () => 0.4 + i * 0.08 } }, 0.08);
      }
    });

    expect(onComplete).toHaveBeenCalledTimes(1);

    // 再レンダリングでDOMから除去される
    rerender(<CelebrationSplash duration={0.8} onComplete={onComplete} />);
    expect(screen.queryByTestId('celebration-splash')).not.toBeInTheDocument();
  });
});
