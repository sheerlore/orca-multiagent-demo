# QuackTrack 🦆

> **「無機質なタスクリストを、生命感あふれるアヒルの庭園へ」**  
> 3Dアイソメトリック箱庭空間でタスクがアヒルとして自律歩行する新感覚タスク管理Webアプリケーション

---

## 📖 概要 (Overview)

QuackTrack は、登録したタスクが愛らしい「アヒル（Duck）」の3Dキャラクターとしてアイソメトリック（等角投影）の庭園フィールドを歩き回るタスク管理Webアプリケーションです。

- **3D箱庭シミュレーション**: 草原エリアと池エリアからなる箱庭ジオラマ空間
- **タスク状態連動**: 状態（未着手・進行中・完了）や優先度に応じてアヒルの位置やアニメーションが動的に変化
- **直感的な操作性**: 3Dカメラの回転/ズーム操作と洗練された2Dタスク管理パネルの融合
- **ゼロコスト・ローカル完結**: ログイン不要、クライアントサイド完結で高速動作

---

## 🛠 技術スタック (Tech Stack)

| カテゴリ             | 技術                                                |
| :------------------- | :-------------------------------------------------- |
| **フロントエンド**   | React 19, TypeScript (Strict Mode)                  |
| **ビルドツール**     | Vite 6                                              |
| **3Dグラフィックス** | Three.js, `@react-three/fiber`, `@react-three/drei` |
| **スタイリング**     | Tailwind CSS v4, Lucide React                       |
| **状態管理**         | Zustand                                             |
| **テスト基盤**       | Vitest, `@testing-library/react`, jsdom             |
| **コード品質**       | ESLint, Prettier                                    |
| **CI / CD**          | GitHub Actions (Node.js 20)                         |

詳細な技術選定理由については [docs/ADR-001-stack.md](file:///Users/sheerlore/develop/orca-multiagent-demo/docs/ADR-001-stack.md) および仕様書 [docs/SPEC.md](file:///Users/sheerlore/develop/orca-multiagent-demo/docs/SPEC.md) を参照してください。

---

## 💻 必要環境 (Requirements)

- **Node.js**: `20.x` 以上（推奨: LTS）
- **npm**: `10.x` 以上

---

## 🚀 はじめかた (Getting Started)

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いて動作を確認します。

---

## ✅ 検証コマンド (Verification Command)

プロジェクトの型検査・リント・自動テストを一括で検証するコマンドです：

```bash
npm run check
# または
make check
```

このコマンドは以下を順番に実行し、すべてPASSすることを確認します：

1. `tsc --noEmit` (TypeScript型チェック)
2. `eslint .` (ESLint静的解析)
3. `vitest run` (Vitestユニット・コンポーネントテスト)

### 個別コマンド一覧

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド (tsc --noEmit && vite build)
npm run preview      # ビルド成果物のローカルプレビュー
npm run lint         # ESLintによる静的解析
npm run format       # Prettierによるコードフォーマット整形
npm run format:check # Prettierによるフォーマット検証
npm run test         # Vitestによるテスト実行
```

Makefile も利用可能です：

```bash
make check           # npm run check の実行
make build           # npm run build の実行
make test            # npm run test の実行
make lint            # npm run lint の実行
make format          # npm run format の実行
```

---

## 📂 プロジェクト構成 (Directory Structure)

```text
.
├── .agents/             # マルチエージェント定義・スキル・ペルソナ
├── .github/
│   └── workflows/
│       └── ci.yml       # GitHub Actions CIワークフロー
├── docs/                # プロジェクト仕様書・ADR (設計決定記録)
├── public/              # 静的アセット (favicon, アイコンなど)
├── src/
│   ├── components/      # UIおよび3Dコンポーネント
│   │   ├── DuckCanvas.tsx
│   │   ├── TaskPanel.tsx
│   │   └── TaskPanel.test.tsx
│   ├── store/           # Zustand状態管理
│   │   ├── taskStore.ts
│   │   └── taskStore.test.ts
│   ├── test/            # テスト環境設定
│   │   └── setup.ts
│   ├── types/           # TypeScript型定義
│   │   └── task.ts
│   ├── App.tsx          # アプリケーションルート
│   ├── index.css        # グローバルCSS (Tailwind)
│   ├── main.tsx         # エントリーポイント
│   └── vite-env.d.ts    # Vite型定義
├── AGENTS.md            # マルチエージェント共通ルール・検証コマンド
├── eslint.config.js     # ESLint Flat Config
├── Makefile             # 開発用Makeターゲット
├── package.json
├── tsconfig.json        # TypeScript設定
├── vite.config.ts       # Vite & Vitest設定
└── README.md
```

---

## 🤖 マルチエージェント開発ルール

本リポジトリはAIマルチエージェントオーケストレーションによって開発が進められます。
開発運用ルール・ブランチ規約・Issueラベル状態遷移については [AGENTS.md](file:///Users/sheerlore/develop/orca-multiagent-demo/AGENTS.md) を確認してください。
