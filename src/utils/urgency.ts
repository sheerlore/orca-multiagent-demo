import type { TaskStatus } from '../types/task';

export type UrgencyLevel =
  | 'relaxed'
  | 'normal'
  | 'hurried'
  | 'panicked'
  | 'critical'
  | 'overdue';

export interface UrgencyInfo {
  urgencyLevel: UrgencyLevel;
  speedMultiplier: number;
  animSpeedMultiplier: number;
  hoursRemaining: number | null;
}

/**
 * 期限(DueDate)とタスクステータスに基づく緊急度、移動速度倍率、アニメーション倍率を算出する。
 * (docs/SPEC.md 3.3.4「期限（DueDate）と歩行速度・演出の連動アルゴリズム」準拠)
 *
 * @param dueDate 期限文字列 (ISO形式またはYYYY-MM-DD、null/undefined可)
 * @param status タスクステータス ('todo' | 'in-progress' | 'done')
 * @param now 現在時刻 (指定がない場合は new Date())
 */
export function calculateUrgency(
  dueDate?: string | null,
  status: TaskStatus = 'todo',
  now: Date = new Date()
): UrgencyInfo {
  let hoursRemaining: number | null = null;

  if (dueDate && typeof dueDate === 'string' && dueDate.trim().length > 0) {
    const dueMs = new Date(dueDate).getTime();
    if (!Number.isNaN(dueMs)) {
      const diffMs = dueMs - now.getTime();
      const rawHours = diffMs / (1000 * 60 * 60);
      hoursRemaining = Math.round(rawHours * 1e6) / 1e6;
    }
  }

  // 1. 完了 ('done'): 締め切り解除、極上のリラックス (0.6x)
  if (status === 'done') {
    return {
      urgencyLevel: 'relaxed',
      speedMultiplier: 0.6,
      animSpeedMultiplier: 0.6,
      hoursRemaining,
    };
  }

  // 2. 期限なし (no dueDate or invalid date): 通常歩行 (1.0x)
  if (hoursRemaining === null) {
    return {
      urgencyLevel: 'normal',
      speedMultiplier: 1.0,
      animSpeedMultiplier: 1.0,
      hoursRemaining: null,
    };
  }

  // 3. 期限超過 (hoursRemaining < 0): 怒りのプンプク歩行 (2.0x)
  if (hoursRemaining < 0) {
    return {
      urgencyLevel: 'overdue',
      speedMultiplier: 2.0,
      animSpeedMultiplier: 2.0,
      hoursRemaining,
    };
  }

  // 4. 残り4時間未満 (0 <= hoursRemaining < 4): 直前パニック猛ダッシュ (2.5x)
  if (hoursRemaining < 4) {
    return {
      urgencyLevel: 'critical',
      speedMultiplier: 2.5,
      animSpeedMultiplier: 2.5,
      hoursRemaining,
    };
  }

  // 5. 残り4〜24時間 (4 <= hoursRemaining < 24): 焦り気味パタパタ歩行 (1.8x)
  if (hoursRemaining < 24) {
    return {
      urgencyLevel: 'panicked',
      speedMultiplier: 1.8,
      animSpeedMultiplier: 1.8,
      hoursRemaining,
    };
  }

  // 6. 残り24〜48時間 (24 <= hoursRemaining < 48): やや早足 (1.3x)
  if (hoursRemaining < 48) {
    return {
      urgencyLevel: 'hurried',
      speedMultiplier: 1.3,
      animSpeedMultiplier: 1.3,
      hoursRemaining,
    };
  }

  // 7. 残り48時間以上 (hoursRemaining >= 48): 余裕たっぷり通常歩行 (1.0x)
  return {
    urgencyLevel: 'normal',
    speedMultiplier: 1.0,
    animSpeedMultiplier: 1.0,
    hoursRemaining,
  };
}

export const getUrgencyInfo = calculateUrgency;
