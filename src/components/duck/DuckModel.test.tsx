import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuckModel } from './DuckModel';
import { Duck } from './Duck';
import { DuckTitleTag } from './DuckTitleTag';
import { Headband } from './accessories/Headband';
import { Crown } from './accessories/Crown';
import { FloatRing } from './accessories/FloatRing';
import { Sparkles } from './accessories/Sparkles';
import { duckGeometries } from './geometries';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types/task';

// Dreiのコンポーネントをモック
vi.mock('@react-three/drei', () => ({
  Billboard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-billboard">{children}</div>
  ),
  Text: ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <div data-testid="mock-text" data-color={color}>
      {children}
    </div>
  ),
  Sparkles: () => <div data-testid="mock-drei-sparkles" />,
}));

// R3FのuseFrameをモック
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('DuckModel & Accessories', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (
        msg.includes('is using incorrect casing') ||
        msg.includes('is unrecognized in this browser') ||
        msg.includes('React does not recognize the')
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });
  const baseTask: Task = {
    id: 'test-duck-1',
    title: '牛乳を買う',
    description: 'スーパーで低脂肪乳を購入する',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    duckColor: '#facc15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  beforeEach(() => {
    useTaskStore.setState({
      settings: {
        soundEnabled: false,
        showTitleTags: true,
        cameraFollowMode: false,
      },
    });
  });

  describe('アヒル3Dモデルの基本階層構成', () => {
    it('胴体、頭部、くちばし、左右の翼、左右の足が正しくレンダリングされる', () => {
      render(<DuckModel status="todo" duckColor="#facc15" />);

      expect(screen.getByTestId('duck-model')).toBeInTheDocument();
      expect(screen.getByTestId('duck-body')).toBeInTheDocument();
      expect(screen.getByTestId('duck-head')).toBeInTheDocument();
      expect(screen.getByTestId('duck-beak')).toBeInTheDocument();
      expect(screen.getByTestId('duck-wing-left')).toBeInTheDocument();
      expect(screen.getByTestId('duck-wing-right')).toBeInTheDocument();
      expect(screen.getByTestId('duck-feet')).toBeInTheDocument();
      expect(screen.getByTestId('duck-foot-left')).toBeInTheDocument();
      expect(screen.getByTestId('duck-foot-right')).toBeInTheDocument();
    });

    it('低ポリゴン共有ジオメトリが全パーツで定義・再利用されている', () => {
      expect(duckGeometries.body).toBeDefined();
      expect(duckGeometries.head).toBeDefined();
      expect(duckGeometries.beak).toBeDefined();
      expect(duckGeometries.wing).toBeDefined();
      expect(duckGeometries.foot).toBeDefined();
      expect(duckGeometries.tail).toBeDefined();
      expect(duckGeometries.headbandRing).toBeDefined();
      expect(duckGeometries.crownBase).toBeDefined();
      expect(duckGeometries.floatRing).toBeDefined();
    });
  });

  describe('duckColorの反映と選択ハイライト', () => {
    it('指定したduckColorが胴体・頭・翼に適用される', () => {
      const { container } = render(<DuckModel status="todo" duckColor="#4ade80" />);

      // マテリアルのcolor属性を検証
      const bodyMaterial = container.querySelector(
        '[data-testid="duck-body"] meshstandardmaterial'
      );
      const headMaterial = container.querySelector(
        '[data-testid="duck-head"] meshstandardmaterial'
      );
      const wingLeftMaterial = container.querySelector(
        '[data-testid="duck-wing-left"] meshstandardmaterial'
      );
      const wingRightMaterial = container.querySelector(
        '[data-testid="duck-wing-right"] meshstandardmaterial'
      );

      expect(bodyMaterial?.getAttribute('color')).toBe('#4ade80');
      expect(headMaterial?.getAttribute('color')).toBe('#4ade80');
      expect(wingLeftMaterial?.getAttribute('color')).toBe('#4ade80');
      expect(wingRightMaterial?.getAttribute('color')).toBe('#4ade80');

      // くちばしと足は常にオレンジ系
      const beakMaterial = container.querySelector(
        '[data-testid="duck-beak"] meshstandardmaterial'
      );
      const footMaterial = container.querySelector(
        '[data-testid="duck-foot-left"] meshstandardmaterial'
      );
      expect(beakMaterial?.getAttribute('color')).toBe('#f97316');
      expect(footMaterial?.getAttribute('color')).toBe('#ea580c');
    });

    it('isSelected=trueのとき、発光色emissive="#38bdf8"が適用される', () => {
      const { container } = render(
        <DuckModel status="todo" duckColor="#facc15" isSelected={true} />
      );

      const bodyMaterial = container.querySelector(
        '[data-testid="duck-body"] meshstandardmaterial'
      );
      expect(bodyMaterial?.getAttribute('emissive')).toBe('#38bdf8');
    });

    it('taskプロパティから直接duckColorやstatusを読み込める', () => {
      const { container } = render(<DuckModel task={{ ...baseTask, duckColor: '#a78bfa' }} />);

      const bodyMaterial = container.querySelector(
        '[data-testid="duck-body"] meshstandardmaterial'
      );
      expect(bodyMaterial?.getAttribute('color')).toBe('#a78bfa');
    });
  });

  describe('ステータス別アクセサリー分岐', () => {
    it('todo状態: 装飾アクセサリーなしのスタンダードな姿', () => {
      render(<DuckModel status="todo" />);

      expect(screen.queryByTestId('accessory-headband')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessory-crown')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessory-float-ring')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessory-sparkles')).not.toBeInTheDocument();

      // 草原を歩くため足が表示される
      expect(screen.getByTestId('duck-feet')).toBeInTheDocument();
    });

    it('in-progress状態: 赤いハチマキ（作業バンダナ）のみを着用', () => {
      render(<DuckModel status="in-progress" />);

      expect(screen.getByTestId('accessory-headband')).toBeInTheDocument();
      expect(screen.queryByTestId('accessory-crown')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessory-float-ring')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessory-sparkles')).not.toBeInTheDocument();

      // 足は表示
      expect(screen.getByTestId('duck-feet')).toBeInTheDocument();
    });

    it('done状態: 金の王冠・浮き輪・キラキラパーティクルを着用し、足は水中に隠れる', () => {
      render(<DuckModel status="done" />);

      expect(screen.queryByTestId('accessory-headband')).not.toBeInTheDocument();
      expect(screen.getByTestId('accessory-crown')).toBeInTheDocument();
      expect(screen.getByTestId('accessory-float-ring')).toBeInTheDocument();
      expect(screen.getByTestId('accessory-sparkles')).toBeInTheDocument();

      // 水泳中のため足は非表示（アンマウント）
      expect(screen.queryByTestId('duck-feet')).not.toBeInTheDocument();
    });

    it('各アクセサリーコンポーネントが単体でレンダリング可能', () => {
      const { unmount: u1 } = render(<Headband />);
      expect(screen.getByTestId('accessory-headband')).toBeInTheDocument();
      u1();

      const { unmount: u2 } = render(<Crown />);
      expect(screen.getByTestId('accessory-crown')).toBeInTheDocument();
      u2();

      const { unmount: u3 } = render(<FloatRing />);
      expect(screen.getByTestId('accessory-float-ring')).toBeInTheDocument();
      u3();

      const { unmount: u4 } = render(<Sparkles />);
      expect(screen.getByTestId('accessory-sparkles')).toBeInTheDocument();
      expect(screen.getByTestId('mock-drei-sparkles')).toBeInTheDocument();
      u4();
    });
  });

  describe('頭上タスクタイトルタグ', () => {
    it('showTitleTags=trueの場合、タスクタイトルタグが表示される', () => {
      useTaskStore.setState({
        settings: {
          soundEnabled: false,
          showTitleTags: true,
          cameraFollowMode: false,
        },
      });

      render(<DuckTitleTag title="短いタイトル" />);
      expect(screen.getByTestId('duck-title-tag')).toBeInTheDocument();
      expect(screen.getByText('短いタイトル')).toBeInTheDocument();
    });

    it('12文字を超えるタイトルは省略表示される', () => {
      render(<DuckTitleTag title="これはとても長いタスクのタイトルです" />);
      expect(screen.getByText('これはとても長いタスクの...')).toBeInTheDocument();
    });

    it('showTitleTags=falseの場合、タイトルタグが非表示になる', () => {
      useTaskStore.setState({
        settings: {
          soundEnabled: false,
          showTitleTags: false,
          cameraFollowMode: false,
        },
      });

      render(<DuckTitleTag title="非表示テスト" />);
      expect(screen.queryByTestId('duck-title-tag')).not.toBeInTheDocument();
    });

    it('DuckModelにtitleを渡した場合も連動してタイトルタグが表示される', () => {
      render(<DuckModel status="todo" title="タスク名" />);
      expect(screen.getByTestId('duck-title-tag')).toBeInTheDocument();
      expect(screen.getByText('タスク名')).toBeInTheDocument();
    });
  });

  describe('Duckエンティティコンポーネント連携', () => {
    it('DuckコンポーネントがクリックされたときonSelectコールバックが発火する', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<Duck task={baseTask} index={0} isSelected={false} onSelect={onSelect} />);

      const duckEntity = screen.getByTestId(`duck-${baseTask.id}`);
      expect(duckEntity).toBeInTheDocument();

      await user.click(duckEntity);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });
});
