import type { TaskStatus } from '../types/task';

export interface DuckPositionEntry {
  id: string;
  x: number;
  y: number;
  z: number;
  status: TaskStatus;
}

/**
 * React再レンダリングを回避するための、アヒル現在座標のインメモリ共有レジストリ。
 * useFrame内で各アヒルが現在位置を毎フレーム更新し、他アヒルとの近接検知（反発力計算）に利用します。
 */
export class DuckPositionRegistry {
  private entries = new Map<string, DuckPositionEntry>();

  register(id: string, x: number, y: number, z: number, status: TaskStatus): void {
    this.entries.set(id, { id, x, y, z, status });
  }

  update(id: string, x: number, y: number, z: number, status: TaskStatus): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.x = x;
      entry.y = y;
      entry.z = z;
      entry.status = status;
    } else {
      this.entries.set(id, { id, x, y, z, status });
    }
  }

  unregister(id: string): void {
    this.entries.delete(id);
  }

  /**
   * 同一エリア（草原同士、池同士）に属する近傍アヒル一覧を取得（自身を除く）
   */
  getNeighbors(
    excludeId: string,
    status?: TaskStatus
  ): Array<{ id: string; x: number; z: number }> {
    const isDone = status === 'done';
    const neighbors: Array<{ id: string; x: number; z: number }> = [];

    for (const [id, entry] of this.entries.entries()) {
      if (id !== excludeId) {
        if (!status || (isDone ? entry.status === 'done' : entry.status !== 'done')) {
          neighbors.push({ id: entry.id, x: entry.x, z: entry.z });
        }
      }
    }

    return neighbors;
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  get(id: string): DuckPositionEntry | undefined {
    return this.entries.get(id);
  }
}

export const duckPositionRegistry = new DuckPositionRegistry();
