/**
 * Web Audio API を用いたシンセサイズ音声生成ユーティリティ
 * docs/SPEC.md 3.4.3「タスク完了セレブレーション（達成演出）」準拠
 */

// グローバル AudioContext キャッシュ
let cachedAudioContext: AudioContext | null = null;

/** テスト用キャッシュクリア関数 */
export function _resetAudioContextForTesting(): void {
  cachedAudioContext = null;
}

/**
 * 安全に AudioContext を取得する。
 * ブラウザ未対応環境や SSR / テスト環境では null を返す。
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  try {
    if (!cachedAudioContext || cachedAudioContext.state === 'closed') {
      cachedAudioContext = new AudioContextClass();
    }
    return cachedAudioContext;
  } catch (err) {
    // ブラウザのポリシーや初期化エラーを安全に無視
    console.warn('AudioContext initialization failed:', err);
    return null;
  }
}

/**
 * 軽快でかわいい「クワッ・ピロリン♪」の達成ジングルを合成再生する。
 *
 * 1. 「クワッ！」: 420Hz -> 680Hz -> 320Hz のアヒル風短音 (0.14秒)
 * 2. 「ピロリン♪」: C6 -> E6 -> G6 -> C7 のきらびやかな上昇アルペジオチャイム (0.5秒)
 *
 * @param soundEnabled 音声が有効かどうか（デフォルト: true）
 */
export function playCelebrationJingle(soundEnabled: boolean = true): void {
  if (!soundEnabled) {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // ブラウザの Autoplay Policy による suspended 状態を復帰
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // ユーザーインタラクション制限等によるエラーは無視
      });
    }

    const now = ctx.currentTime;

    // 全体音量を制御するマスターゲイン
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.connect(ctx.destination);

    // ============================================
    // 1. 「クワッ！」パート (0.00s ~ 0.14s)
    // ============================================
    const duckOsc = ctx.createOscillator();
    const duckGain = ctx.createGain();

    duckOsc.type = 'sawtooth';
    // ピッチのクイックな急上昇と急降下で「クワッ」感を演出
    duckOsc.frequency.setValueAtTime(420, now);
    duckOsc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
    duckOsc.frequency.exponentialRampToValueAtTime(320, now + 0.14);

    // 音量エンベロープ
    duckGain.gain.setValueAtTime(0.001, now);
    duckGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    duckGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    duckOsc.connect(duckGain);
    duckGain.connect(masterGain);

    duckOsc.start(now);
    duckOsc.stop(now + 0.15);

    // ============================================
    // 2. 「ピロリン♪」パート (0.13s ~ 0.70s)
    // ============================================
    // C6 (1046.50Hz), E6 (1318.51Hz), G6 (1567.98Hz), C7 (2093.00Hz)
    const notes = [
      { freq: 1046.5, time: 0.13, duration: 0.22, gain: 0.22 },
      { freq: 1318.51, time: 0.22, duration: 0.22, gain: 0.25 },
      { freq: 1567.98, time: 0.31, duration: 0.25, gain: 0.28 },
      { freq: 2093.0, time: 0.4, duration: 0.45, gain: 0.32 },
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      noteOsc.type = 'triangle';
      noteOsc.frequency.setValueAtTime(freq, now + time);

      const noteStart = now + time;
      const noteEnd = noteStart + duration;

      noteGain.gain.setValueAtTime(0.001, noteStart);
      noteGain.gain.linearRampToValueAtTime(gain, noteStart + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      noteOsc.connect(noteGain);
      noteGain.connect(masterGain);

      noteOsc.start(noteStart);
      noteOsc.stop(noteEnd);
    });
  } catch (err) {
    // どんなブラウザ制限や例外が発生してもアプリケーションをクラッシュさせない
    console.warn('Failed to play celebration jingle:', err);
  }
}
