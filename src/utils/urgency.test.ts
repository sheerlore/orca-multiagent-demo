import { describe, it, expect } from 'vitest';
import { calculateUrgency, getUrgencyInfo } from './urgency';

describe('calculateUrgency & getUrgencyInfo', () => {
  const baseNow = new Date('2026-10-06T12:00:00.000Z');

  describe('done状態の判定', () => {
    it('status === "done" のとき、期限に関係なく relaxed (0.6x, 0.6x) になる', () => {
      // 過去の期限（本来なら overdue）
      const pastDue = new Date(baseNow.getTime() - 2 * 3600 * 1000).toISOString();
      const resPast = calculateUrgency(pastDue, 'done', baseNow);
      expect(resPast.urgencyLevel).toBe('relaxed');
      expect(resPast.speedMultiplier).toBe(0.6);
      expect(resPast.animSpeedMultiplier).toBe(0.6);
      expect(resPast.hoursRemaining).toBe(-2);

      // 直前（本来なら critical）
      const criticalDue = new Date(baseNow.getTime() + 1 * 3600 * 1000).toISOString();
      const resCrit = calculateUrgency(criticalDue, 'done', baseNow);
      expect(resCrit.urgencyLevel).toBe('relaxed');
      expect(resCrit.speedMultiplier).toBe(0.6);
      expect(resCrit.animSpeedMultiplier).toBe(0.6);

      // 期限なし
      const resNoDue = calculateUrgency(null, 'done', baseNow);
      expect(resNoDue.urgencyLevel).toBe('relaxed');
      expect(resNoDue.speedMultiplier).toBe(0.6);
      expect(resNoDue.animSpeedMultiplier).toBe(0.6);
      expect(resNoDue.hoursRemaining).toBeNull();
    });
  });

  describe('期限なし (no dueDate) の判定', () => {
    it('dueDate が null / undefined / 空文字 / 無効な文字列のとき normal (1.0x, 1.0x) になる', () => {
      expect(calculateUrgency(undefined, 'todo', baseNow)).toEqual({
        urgencyLevel: 'normal',
        speedMultiplier: 1.0,
        animSpeedMultiplier: 1.0,
        hoursRemaining: null,
      });

      expect(calculateUrgency(null, 'todo', baseNow)).toEqual({
        urgencyLevel: 'normal',
        speedMultiplier: 1.0,
        animSpeedMultiplier: 1.0,
        hoursRemaining: null,
      });

      expect(calculateUrgency('', 'todo', baseNow)).toEqual({
        urgencyLevel: 'normal',
        speedMultiplier: 1.0,
        animSpeedMultiplier: 1.0,
        hoursRemaining: null,
      });

      expect(calculateUrgency('not-a-valid-date', 'todo', baseNow)).toEqual({
        urgencyLevel: 'normal',
        speedMultiplier: 1.0,
        animSpeedMultiplier: 1.0,
        hoursRemaining: null,
      });
    });
  });

  describe('境界値テスト (48時間, 24時間, 4時間, 0時間, 超過)', () => {
    it('残り48時間以上: normal (1.0x, 1.0x)', () => {
      // ちょうど48時間
      const exact48h = new Date(baseNow.getTime() + 48 * 3600 * 1000).toISOString();
      const res48 = calculateUrgency(exact48h, 'todo', baseNow);
      expect(res48.urgencyLevel).toBe('normal');
      expect(res48.speedMultiplier).toBe(1.0);
      expect(res48.animSpeedMultiplier).toBe(1.0);
      expect(res48.hoursRemaining).toBe(48);

      // 72時間後 (余裕)
      const after72h = new Date(baseNow.getTime() + 72 * 3600 * 1000).toISOString();
      const res72 = calculateUrgency(after72h, 'todo', baseNow);
      expect(res72.urgencyLevel).toBe('normal');
      expect(res72.speedMultiplier).toBe(1.0);
      expect(res72.animSpeedMultiplier).toBe(1.0);
      expect(res72.hoursRemaining).toBe(72);
    });

    it('残り24〜48時間: hurried (1.3x, 1.3x)', () => {
      // 47.99時間 (48時間未満)
      const justUnder48 = new Date(baseNow.getTime() + 47.99 * 3600 * 1000).toISOString();
      const resUnder48 = calculateUrgency(justUnder48, 'todo', baseNow);
      expect(resUnder48.urgencyLevel).toBe('hurried');
      expect(resUnder48.speedMultiplier).toBe(1.3);
      expect(resUnder48.animSpeedMultiplier).toBe(1.3);
      expect(resUnder48.hoursRemaining).toBe(47.99);

      // 36時間
      const exact36h = new Date(baseNow.getTime() + 36 * 3600 * 1000).toISOString();
      const res36 = calculateUrgency(exact36h, 'in-progress', baseNow);
      expect(res36.urgencyLevel).toBe('hurried');
      expect(res36.speedMultiplier).toBe(1.3);
      expect(res36.animSpeedMultiplier).toBe(1.3);
      expect(res36.hoursRemaining).toBe(36);

      // ちょうど24時間
      const exact24h = new Date(baseNow.getTime() + 24 * 3600 * 1000).toISOString();
      const res24 = calculateUrgency(exact24h, 'todo', baseNow);
      expect(res24.urgencyLevel).toBe('hurried');
      expect(res24.speedMultiplier).toBe(1.3);
      expect(res24.animSpeedMultiplier).toBe(1.3);
      expect(res24.hoursRemaining).toBe(24);
    });

    it('残り4〜24時間: panicked (1.8x, 1.8x)', () => {
      // 23.99時間 (24時間未満)
      const justUnder24 = new Date(baseNow.getTime() + 23.99 * 3600 * 1000).toISOString();
      const resUnder24 = calculateUrgency(justUnder24, 'todo', baseNow);
      expect(resUnder24.urgencyLevel).toBe('panicked');
      expect(resUnder24.speedMultiplier).toBe(1.8);
      expect(resUnder24.animSpeedMultiplier).toBe(1.8);
      expect(resUnder24.hoursRemaining).toBe(23.99);

      // 12時間
      const exact12h = new Date(baseNow.getTime() + 12 * 3600 * 1000).toISOString();
      const res12 = calculateUrgency(exact12h, 'todo', baseNow);
      expect(res12.urgencyLevel).toBe('panicked');
      expect(res12.speedMultiplier).toBe(1.8);
      expect(res12.animSpeedMultiplier).toBe(1.8);
      expect(res12.hoursRemaining).toBe(12);

      // ちょうど4時間
      const exact4h = new Date(baseNow.getTime() + 4 * 3600 * 1000).toISOString();
      const res4 = calculateUrgency(exact4h, 'todo', baseNow);
      expect(res4.urgencyLevel).toBe('panicked');
      expect(res4.speedMultiplier).toBe(1.8);
      expect(res4.animSpeedMultiplier).toBe(1.8);
      expect(res4.hoursRemaining).toBe(4);
    });

    it('残り4時間未満 (0時間〜4時間): critical (2.5x, 2.5x)', () => {
      // 3.99時間 (4時間未満)
      const justUnder4 = new Date(baseNow.getTime() + 3.99 * 3600 * 1000).toISOString();
      const resUnder4 = calculateUrgency(justUnder4, 'todo', baseNow);
      expect(resUnder4.urgencyLevel).toBe('critical');
      expect(resUnder4.speedMultiplier).toBe(2.5);
      expect(resUnder4.animSpeedMultiplier).toBe(2.5);
      expect(resUnder4.hoursRemaining).toBe(3.99);

      // 1時間
      const exact1h = new Date(baseNow.getTime() + 1 * 3600 * 1000).toISOString();
      const res1 = calculateUrgency(exact1h, 'todo', baseNow);
      expect(res1.urgencyLevel).toBe('critical');
      expect(res1.speedMultiplier).toBe(2.5);
      expect(res1.animSpeedMultiplier).toBe(2.5);
      expect(res1.hoursRemaining).toBe(1);

      // ちょうど0時間 (締切ジャスト)
      const exact0h = new Date(baseNow.getTime()).toISOString();
      const res0 = calculateUrgency(exact0h, 'todo', baseNow);
      expect(res0.urgencyLevel).toBe('critical');
      expect(res0.speedMultiplier).toBe(2.5);
      expect(res0.animSpeedMultiplier).toBe(2.5);
      expect(res0.hoursRemaining).toBe(0);
    });

    it('期限超過 (hoursRemaining < 0): overdue (2.0x, 2.0x)', () => {
      // -0.01時間超過 (数分遅れ)
      const slightOverdue = new Date(baseNow.getTime() - 0.01 * 3600 * 1000).toISOString();
      const resSlight = calculateUrgency(slightOverdue, 'todo', baseNow);
      expect(resSlight.urgencyLevel).toBe('overdue');
      expect(resSlight.speedMultiplier).toBe(2.0);
      expect(resSlight.animSpeedMultiplier).toBe(2.0);
      expect(resSlight.hoursRemaining).toBe(-0.01);

      // 5時間超過
      const overdue5h = new Date(baseNow.getTime() - 5 * 3600 * 1000).toISOString();
      const res5 = calculateUrgency(overdue5h, 'todo', baseNow);
      expect(res5.urgencyLevel).toBe('overdue');
      expect(res5.speedMultiplier).toBe(2.0);
      expect(res5.animSpeedMultiplier).toBe(2.0);
      expect(res5.hoursRemaining).toBe(-5);
    });
  });

  describe('YYYY-MM-DD 形式の日付入力サポート', () => {
    it('YYYY-MM-DD 形式の文字列でも正しく残り時間と緊急度が計算される', () => {
      // 2026-10-08T00:00:00.000Z に対し 2026-10-10 は 48時間後
      const testNow = new Date('2026-10-08T00:00:00.000Z');
      const res = calculateUrgency('2026-10-10', 'todo', testNow);
      expect(res.hoursRemaining).toBe(48);
      expect(res.urgencyLevel).toBe('normal');

      // 2026-10-09 は 24時間後
      const res24 = calculateUrgency('2026-10-09', 'todo', testNow);
      expect(res24.hoursRemaining).toBe(24);
      expect(res24.urgencyLevel).toBe('hurried');
    });
  });

  describe('エイリアス関数 getUrgencyInfo', () => {
    it('getUrgencyInfo が calculateUrgency と同一の動作をする', () => {
      expect(getUrgencyInfo).toBe(calculateUrgency);
    });
  });
});
