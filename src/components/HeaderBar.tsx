import { Volume2, VolumeX, RotateCcw, Database, Menu, X, Sparkles } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useCameraStore } from '../store/cameraStore';

export interface HeaderBarProps {
  onOpenBackupModal?: () => void;
  onToggleDrawer?: () => void;
  isDrawerOpen?: boolean;
}

export function HeaderBar({
  onOpenBackupModal,
  onToggleDrawer,
  isDrawerOpen = false,
}: HeaderBarProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const soundEnabled = useTaskStore((state) => state.settings.soundEnabled);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  const resetCamera = useCameraStore((state) => state.resetCamera);
  const clearFocus = useCameraStore((state) => state.clearFocus);

  const activeCount = tasks.filter((t) => t.status !== 'done').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const handleToggleSound = () => {
    updateSettings({ soundEnabled: !soundEnabled });
  };

  const handleResetCamera = () => {
    clearFocus();
    resetCamera();
  };

  return (
    <header
      data-testid="header-bar"
      className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 md:px-4 flex items-center justify-between z-20 shrink-0 w-full"
    >
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger button (visible only on mobile screen < md) */}
        <button
          type="button"
          onClick={onToggleDrawer}
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={isDrawerOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={isDrawerOpen}
          data-testid="hamburger-menu-button"
        >
          {isDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Application Logo */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-2xl" role="img" aria-label="duck">
            🦆
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-100 text-base md:text-lg tracking-tight">
              QuackTrack
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
          </div>
        </div>
      </div>

      {/* Center: Duck counter badge */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 text-xs"
        aria-label={`タスク頭数: 未完了 ${activeCount}羽, 完了 ${doneCount}羽`}
      >
        <span
          data-testid="duck-count-active"
          className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5 shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>未完了: {activeCount}羽</span>
        </span>
        <span
          data-testid="duck-count-done"
          className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1.5 shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>完了: {doneCount}羽</span>
        </span>
      </div>

      {/* Right: Sound toggle, Camera reset, Backup modal open */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Sound toggle button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            soundEnabled
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
          title={soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする'}
          aria-label={soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする'}
          data-testid="sound-toggle-button"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" data-testid="volume-on-icon" />
          ) : (
            <VolumeX className="w-4 h-4" data-testid="volume-off-icon" />
          )}
        </button>

        {/* Camera reset button */}
        <button
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-medium cursor-pointer"
          title="カメラ視点を初期位置にリセット"
          aria-label="カメラ視点リセット"
          data-testid="camera-reset-button"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">視点リセット</span>
        </button>

        {/* Backup / Settings modal open button */}
        <button
          type="button"
          onClick={onOpenBackupModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-medium cursor-pointer"
          title="バックアップ・データ移行"
          aria-label="バックアップ・データ移行"
          data-testid="backup-modal-open-button"
        >
          <Database className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">バックアップ</span>
        </button>
      </div>
    </header>
  );
}
