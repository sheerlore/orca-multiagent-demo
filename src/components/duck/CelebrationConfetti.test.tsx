import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CelebrationConfetti } from './CelebrationConfetti';

let recordedFrameCallback:
  ((state: { clock: { getElapsedTime: () => number } }, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: { clock: { getElapsedTime: () => number } }, delta: number) => void) => {
    recordedFrameCallback = cb;
  },
}));

describe('CelebrationConfetti Component', () => {
  beforeEach(() => {
    recordedFrameCallback = null;
  });

  it('紙吹雪グループと指定数のパーティクルメッシュがレンダリングされる', () => {
    render(<CelebrationConfetti count={15} />);

    expect(screen.getByTestId('celebration-confetti')).toBeInTheDocument();
    for (let i = 0; i < 15; i++) {
      expect(screen.getByTestId(`confetti-particle-${i}`)).toBeInTheDocument();
    }
  });

  it('デフォルトで42個のパーティクルが生成される', () => {
    render(<CelebrationConfetti />);

    expect(screen.getByTestId('celebration-confetti')).toBeInTheDocument();
    expect(screen.getByTestId('confetti-particle-0')).toBeInTheDocument();
    expect(screen.getByTestId('confetti-particle-41')).toBeInTheDocument();
  });

  it('duration経過時にonCompleteが呼び出され、パーティクルが消滅する', () => {
    const onComplete = vi.fn();
    const { rerender } = render(<CelebrationConfetti duration={1.0} onComplete={onComplete} />);

    expect(screen.getByTestId('celebration-confetti')).toBeInTheDocument();

    // 0.4秒経過 (0.08s * 5)
    act(() => {
      for (let i = 0; i < 5; i++) {
        recordedFrameCallback?.({ clock: { getElapsedTime: () => i * 0.08 } }, 0.08);
      }
    });
    expect(onComplete).not.toHaveBeenCalled();

    // さらに0.8秒経過 (0.08s * 10、累計1.2秒でduration 1.0秒を超過)
    act(() => {
      for (let i = 0; i < 10; i++) {
        recordedFrameCallback?.({ clock: { getElapsedTime: () => 0.4 + i * 0.08 } }, 0.08);
      }
    });

    expect(onComplete).toHaveBeenCalledTimes(1);

    // 再レンダリングでDOMから除去される
    rerender(<CelebrationConfetti duration={1.0} onComplete={onComplete} />);
    expect(screen.queryByTestId('celebration-confetti')).not.toBeInTheDocument();
  });
});
