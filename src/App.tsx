import { useState, useEffect } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { TaskPanel } from './components/TaskPanel';
import { DuckCanvas } from './components/DuckCanvas';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { BackupModal } from './components/BackupModal';

export function App() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Escキーでモーダルやモバイルドロワーを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isBackupModalOpen) {
          setIsBackupModalOpen(false);
        } else if (isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBackupModalOpen, isMobileDrawerOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden relative text-slate-100">
      {/* ヘッダーバー (ロゴ・頭数バッジ・音声トグル・視点リセット・バックアップ・ハンバーガー) */}
      <HeaderBar
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onToggleDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
        isDrawerOpen={isMobileDrawerOpen}
      />

      {/* メインレイアウト領域 */}
      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* モバイル用ドロワー背景オーバーレイ */}
        {isMobileDrawerOpen && (
          <div
            data-testid="mobile-drawer-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* タスク一覧パネル (デスクトップ: 常時表示 / モバイル: ドロワー開閉) */}
        <TaskPanel isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} />

        {/* 3D アイソメトリックキャンバス */}
        <main className="flex-1 h-full relative overflow-hidden">
          <DuckCanvas />
        </main>

        {/* タスク詳細・編集ドロワー */}
        <TaskDetailDrawer />
      </div>

      {/* バックアップ・データ移行モーダル */}
      <BackupModal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} />
    </div>
  );
}

export default App;
