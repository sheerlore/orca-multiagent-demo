import { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupModalContentProps {
  onClose: () => void;
}

function BackupModalContent({ onClose }: BackupModalContentProps) {
  const { tasks, settings, downloadBackup, importData, resetToInitial } = useTaskStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleExport = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `quacktrack-backup-${today}.json`;
      downloadBackup(filename);
      setSuccessMessage(`バックアップ「${filename}」をダウンロードしました！`);
      setErrorMessage(null);
    } catch (err) {
      console.error(err);
      setErrorMessage('エクスポート中にエラーが発生しました。');
      setSuccessMessage(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
          reader.readAsText(file);
        });
      }

      // JSON パースの事前検証
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('無効なJSONフォーマットです');
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('バックアップデータの形式が不正です');
      }

      // tasks 配列の型検証
      const rawTasks = Array.isArray(parsed)
        ? parsed
        : 'tasks' in (parsed as Record<string, unknown>) &&
            Array.isArray((parsed as Record<string, unknown>).tasks)
          ? ((parsed as Record<string, unknown>).tasks as unknown[])
          : null;

      if (!rawTasks) {
        throw new Error('タスク一覧データが見つかりません');
      }

      // 各タスク要素が必須プロパティ title を有するか検証
      for (const item of rawTasks) {
        if (!item || typeof item !== 'object') {
          throw new Error('タスクデータの形式が不正です');
        }
        const t = item as Record<string, unknown>;
        if (typeof t.title !== 'string' || !t.title.trim()) {
          throw new Error('タスクタイトルが存在しないデータが含まれています');
        }
      }

      const success = importData(content);
      if (success) {
        setSuccessMessage(
          `「${file.name}」から ${rawTasks.length}件のタスクを正常に復元しました！`
        );
        setErrorMessage(null);
      } else {
        throw new Error('インポート処理に失敗しました');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'インポートに失敗しました。正しいJSONファイルを選択してください。';
      setErrorMessage(`インポートエラー: ${msg}`);
      setSuccessMessage(null);
    } finally {
      setIsProcessing(false);
      // 入力リセットにより同一ファイルを再度選択可能に
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('現在のタスクをチュートリアルの初期データ（3羽）に戻しますか？')) {
      resetToInitial();
      setSuccessMessage('初期チュートリアルデータにリセットしました。');
      setErrorMessage(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      data-testid="backup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="backup-modal-title" className="text-base font-bold text-slate-100">
                データバックアップ＆移行
              </h2>
              <p className="text-xs text-slate-400">JSON形式での保存・復元・管理</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="閉じる"
            data-testid="backup-modal-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[75vh]">
          {/* Status Notifications */}
          {successMessage && (
            <div
              role="alert"
              data-testid="backup-success-alert"
              className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              data-testid="backup-error-alert"
              className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2 animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Data Overview */}
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg space-y-1.5 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>現在の登録状況</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>タスク総数:</span>
              <span className="font-medium text-slate-200">{tasks.length} 件</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>効果音設定:</span>
              <span className="font-medium text-slate-200">
                {settings.soundEnabled ? '有効 (ON)' : '無効 (OFF)'}
              </span>
            </div>
          </div>

          {/* Export Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-400" />
              JSONファイルエクスポート
            </h3>
            <p className="text-xs text-slate-400">
              現在の全タスクおよび設定データをJSON形式で端末にダウンロードします。
            </p>
            <button
              type="button"
              onClick={handleExport}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer active:scale-98"
              data-testid="export-json-button"
            >
              <Download className="w-4 h-4" />
              <span>バックアップをダウンロード (.json)</span>
            </button>
          </div>

          {/* Import Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              JSONファイルインポート
            </h3>
            <p className="text-xs text-slate-400">
              保存したバックアップJSONファイルを選択して、タスクと設定を一括復元します。
            </p>

            <label
              htmlFor="backup-file-upload"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>{isProcessing ? '読み込み中...' : 'ファイルを選択 (.json)'}</span>
              <input
                id="backup-file-upload"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="sr-only"
                data-testid="backup-file-input"
              />
            </label>
          </div>

          {/* Reset Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">初期状態に戻したい場合:</span>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 underline transition-colors cursor-pointer"
                data-testid="reset-initial-button"
              >
                <RefreshCw className="w-3 h-3" />
                チュートリアルデータにリセット
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            data-testid="backup-modal-ok-button"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export function BackupModal({ isOpen, onClose }: BackupModalProps) {
  if (!isOpen) return null;
  return <BackupModalContent onClose={onClose} />;
}
