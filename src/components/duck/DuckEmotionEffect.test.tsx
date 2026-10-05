import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DuckEmotionEffect } from './DuckEmotionEffect';

// Dreiのモック
vi.mock('@react-three/drei', () => ({
  Billboard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-billboard">{children}</div>
  ),
  Text: ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <div data-testid="mock-text" data-color={color}>
      {children}
    </div>
  ),
}));

// R3FのuseFrameをモック
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('DuckEmotionEffect Component', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (
        msg.includes('is using incorrect casing') ||
        msg.includes('is unrecognized in this browser') ||
        msg.includes('React does not recognize the') ||
        msg.includes('for a non-boolean attribute')
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('normal, relaxed, hurried の場合は何も描画しない (null)', () => {
    const { container: c1 } = render(<DuckEmotionEffect urgencyLevel="normal" />);
    expect(c1.firstChild).toBeNull();
    expect(screen.queryByTestId('duck-emotion-effect')).not.toBeInTheDocument();

    const { container: c2 } = render(<DuckEmotionEffect urgencyLevel="relaxed" />);
    expect(c2.firstChild).toBeNull();

    const { container: c3 } = render(<DuckEmotionEffect urgencyLevel="hurried" />);
    expect(c3.firstChild).toBeNull();
  });

  it('panicked の場合は青い汗マーク（水滴メッシュ）が描画される', () => {
    render(<DuckEmotionEffect urgencyLevel="panicked" />);
    expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
    expect(screen.getByTestId('emotion-panicked')).toBeInTheDocument();
    expect(screen.getByTestId('sweat-drop')).toBeInTheDocument();
  });

  it('critical の場合は複数の水滴メッシュが飛び散るエフェクトが描画される', () => {
    render(<DuckEmotionEffect urgencyLevel="critical" />);
    expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
    expect(screen.getByTestId('emotion-critical')).toBeInTheDocument();
    const drops = screen.getAllByTestId('critical-sweat-drop');
    expect(drops.length).toBeGreaterThanOrEqual(3);
  });

  it('overdue の場合は白い蒸気リングと怒りマークが描画される', () => {
    render(<DuckEmotionEffect urgencyLevel="overdue" />);
    expect(screen.getByTestId('duck-emotion-effect')).toBeInTheDocument();
    expect(screen.getByTestId('emotion-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('steam-ring-1')).toBeInTheDocument();
    expect(screen.getByTestId('steam-ring-2')).toBeInTheDocument();
    expect(screen.getByTestId('anger-symbol')).toBeInTheDocument();
    expect(screen.getByText('💢')).toBeInTheDocument();
  });
});
