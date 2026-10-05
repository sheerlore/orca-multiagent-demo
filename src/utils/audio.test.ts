import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playCelebrationJingle, getAudioContext, _resetAudioContextForTesting } from './audio';

describe('audio utility (Web Audio API)', () => {
  let mockOscillator: {
    type: string;
    frequency: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };

  let mockGain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  };

  let mockResume: ReturnType<typeof vi.fn>;
  let mockAudioContextInstance: {
    state: AudioContextState;
    currentTime: number;
    destination: object;
    resume: ReturnType<typeof vi.fn>;
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
  };

  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    _resetAudioContextForTesting();

    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockResume = vi.fn().mockResolvedValue(undefined);

    mockAudioContextInstance = {
      state: 'running',
      currentTime: 10,
      destination: {},
      resume: mockResume,
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGain),
    };

    // class によるコンストラクタ定義
    class MockAudioContext {
      constructor() {
        return mockAudioContextInstance as unknown as AudioContext;
      }
    }

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    _resetAudioContextForTesting();
    window.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('soundEnabled が false の場合は音声を生成しない', () => {
    playCelebrationJingle(false);
    expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
    expect(mockAudioContextInstance.createGain).not.toHaveBeenCalled();
  });

  it('soundEnabled が true の場合にオシレーターとゲインを生成して再生する', () => {
    playCelebrationJingle(true);

    // クワッ(1) + ピロリン4音(4) = 計5個のオシレーター
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(5);
    // マスターゲイン(1) + クワッ(1) + 4音(4) = 計6個のGainNode
    expect(mockAudioContextInstance.createGain).toHaveBeenCalledTimes(6);
    expect(mockOscillator.start).toHaveBeenCalledTimes(5);
    expect(mockOscillator.stop).toHaveBeenCalledTimes(5);
  });

  it('soundEnabled の引数を省略した場合はデフォルトで再生される', () => {
    playCelebrationJingle();
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
  });

  it('AudioContext が suspended 状態の場合は resume() が呼び出される', () => {
    mockAudioContextInstance.state = 'suspended';
    playCelebrationJingle(true);
    expect(mockResume).toHaveBeenCalled();
  });

  it('AudioContext が未対応の環境でも例外をスローせず安全に終了する', () => {
    // AudioContext が存在しない環境
    // @ts-expect-error test purpose
    delete window.AudioContext;
    // @ts-expect-error test purpose
    delete window.webkitAudioContext;

    expect(() => {
      playCelebrationJingle(true);
    }).not.toThrow();
  });

  it('AudioContext 内部でエラーが発生してもキャッチしてクラッシュしない', () => {
    mockAudioContextInstance.createOscillator.mockImplementation(() => {
      throw new Error('Web Audio error');
    });

    expect(() => {
      playCelebrationJingle(true);
    }).not.toThrow();
  });

  it('getAudioContext() は AudioContext がない場合 null を返す', () => {
    // @ts-expect-error test purpose
    delete window.AudioContext;
    // @ts-expect-error test purpose
    delete window.webkitAudioContext;

    expect(getAudioContext()).toBeNull();
  });
});
