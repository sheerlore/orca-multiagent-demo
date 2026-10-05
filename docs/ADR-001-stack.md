# ADR-001: 技術スタックの選定 (Technology Stack Selection)

- **ステータス**: Accepted
- **日付**: 2026-10-06
- **決定者**: 人間（プロダクトオーナー / 開発者）
- **起草者**: Software Architect / Tool Evaluator
- **関連ドキュメント**: [docs/SPEC.md](file:///Users/sheerlore/develop/orca-multiagent-demo/docs/SPEC.md)

---

## 1. コンテキスト (Context)

QuackTrackは、アイソメトリックな3D空間（箱庭）でタスクがアヒルとして自律歩行し、期限や状態によって見た目や歩行速度が動的に変化するタスク管理Webアプリケーションです。

本プロジェクトの成功には以下の要求を満たす技術スタックが必要です：
1. **仕様適合性**:
   - 3Dアイソメトリック空間、アニメーション、パーティクル、シャドウの美麗かつ軽量な描画。
   - 2DのUI操作（タスクCRUD）と3D空間上のアヒル（クリック、ホバー、フォーカス）のスムーズな双方向状態連動。
2. **AIマルチエージェント開発への親和性**:
   - 枯れたデファクトスタンダードであり、学習データ・コード生成の品質が最も高いこと。
   - TypeScriptによる強力な静的型チェックと、壊れにくい宣言的UIモデル。
   - 高速なビルド・テスト環境（Vitest, Vite）により、CIが高速に緑/赤をフィードバックできること。
3. **人間の保守性**:
   - 3DのシーングラフとUIコンポーネントが統一的なメンタルモデルで記述でき、見通しが良いこと。
4. **運用コストゼロ**:
   - 完全な静的SPAとしてビルド可能であり、GitHub Pages / Vercel等の無料枠で永続運用できること。

---

## 2. 検討された選択肢 (Options Evaluated)

### 案A: React + React Three Fiber (R3F) + Vite + TypeScript + Tailwind CSS (採用案)
- **コア技術**: React 19 / 18, `@react-three/fiber`, `@react-three/drei`, Three.js, Vite, TypeScript, Tailwind CSS, Zustand, Vitest, Playwright
- **概要**: 3DシーングラフをReactコンポーネントとして宣言的に記述。UIと3Dオブジェクトが同じReactツリーおよびグローバル状態（Zustand等）を共有。

### 案B: Vanilla Three.js + Vite + TypeScript + Tailwind CSS
- **コア技術**: Three.js, Vite, TypeScript, Tailwind CSS, Vitest, Playwright
- **概要**: Three.jsの低レベルAPIを直接操作。UIはプレーンなDOMまたは軽量ライブラリで構築し、独自のイベントディスパッチャやコールバックで3DとUIをブリッジする。

### 案C: Babylon.js + React + Vite + TypeScript + Tailwind CSS
- **コア技術**: Babylon.js, React, Vite, TypeScript, Tailwind CSS, Vitest
- **概要**: 包括的なゲームエンジン機能（GUI、パーティクル、アニメーション）が最初からパッケージ化されたリッチなWebゲーム向けスタック。

---

## 3. 比較評価表 (Comparison Matrix)

| 比較軸 | 案A: React + R3F + Vite (推奨・採用) | 案B: Vanilla Three.js + Vite | 案C: Babylon.js + React + Vite |
| :--- | :--- | :--- | :--- |
| **仕様への適合** | **◎ 非常に高い**<br>UIと3Dの双方向同期がReact状態管理で自然に統合 | **◯ 良好**<br>描画力は同等だが、UI⇔3D同期の手動グルーコードが必要 | **◎ 高い**<br>ゲーム機能は豊富だがWeb UIとの結合がやや重厚 |
| **AIエージェント親和性** | **◎ 最高**<br>型定義が完璧、React+Three.jsの知見・例が世界最多、高速CI | **◯ 普通**<br>Three.js自体の知見は多いが、独自設計部分でAIがブレやすい | **△ やや低い**<br>Three.js系に比べネット上のサンプル・知見が少なくAI生成精度が劣る |
| **人間の保守性** | **◎ 非常に高い**<br>コンポーネント指向で凝集度が高く、保守しやすい | **△ やや低い**<br>シーングラフ管理とイベント同期の自作コードが肥大化しやすい | **◯ 良好**<br>エンジンAPIは整っているが独自概念の学習コストが高い |
| **CI / テスト速度** | **◎ 超高速**<br>Vite + Vitestによる秒速テスト実行 | **◎ 超高速**<br>Vite + Vitest | **◯ 普通**<br>エンジンバンドルが大きくテスト起動にやや時間を要する |
| **デプロイ・運用コスト** | **◎ 完全0円**<br>静的SPA (GitHub Pages / Vercel) | **◎ 完全0円**<br>静的SPA (GitHub Pages / Vercel) | **◎ 完全0円**<br>静的SPA (GitHub Pages / Vercel) |

---

## 4. 決定 (Decision)

人間（オーナー）の判断により、**案A: React + React Three Fiber + Vite + TypeScript + Tailwind CSS** を採用する。

### 採用スタック一覧
1. **ランタイム & ビルド**: Node.js 20+ (LTS), Vite
2. **言語**: TypeScript (Strict mode)
3. **フロントエンドフレームワーク**: React 19 / 18
4. **3Dグラフィックス**: Three.js, `@react-three/fiber` (R3F), `@react-three/drei`
5. **スタイリング**: Tailwind CSS, Lucide React (アイコン)
6. **状態管理**: Zustand (軽量かつ3Dループ外/内から高速アクセス可能)
7. **アニメーション・補間**: `@react-spring/three` または Three.js `useFrame` 内でのLerp
8. **サウンド**: Web Audio API (軽量SE生成・再生)
9. **テスト基盤**: Vitest (Unit / Component), Playwright (E2E)
10. **Linter / Formatter**: ESLint, Prettier
11. **CI / ホスティング**: GitHub Actions CI, GitHub Pages (または Vercel)

---

## 5. 決定の理由 (Rationale)

1. **宣言的3DとUIの統合**:
   アヒルの状態（色、ハチマキ、王冠、速度）はタスクの状態そのものです。R3Fを採用することで、`<Duck key={task.id} task={task} />` のように宣言的に3DオブジェクトをDOMコンポーネント同様にレンダリングでき、手動でのオブジェクト生成・破棄・同期のバグを根本から排除できます。
2. **マルチエージェント開発（AI）の生産性最大化**:
   AIエージェントにとってReact + TypeScriptは最も得意とするスタックであり、コンポーネント単位でタスクを独立して並行開発・テストすることが容易です。
3. **エコシステムと再利用性**:
   `@react-three/drei` により、OrthographicCamera、OrbitControls、Text3D、BillBoard、HTMLオーバーレイなど、仕様書に記載された機能の高品質な部品がすぐに利用可能です。

---

## 6. 結果・影響 (Consequences)

### メリット
- UIと3Dのデータフローが一元化され、コードの見通しが極めて良くなる。
- 高速なHMR（Hot Module Replacement）により開発サイクルが迅速。
- Vitestによりロジック（締め切り計算、歩行AIベクトル計算、タスクCRUD）を秒速で単体テスト可能。

### トレードオフと対策
- **Three.js / R3Fのバンドルサイズ**:
  - *対策*: Viteのチャンク分割とTree shakingを適用し、初期バンドルサイズを2MB以下に収める。
- **Reactの再レンダリングによる3Dフレームレート低下懸念**:
  - *対策*: 毎フレームの歩行計算や位置更新はReactのState変更ではなく、`useFrame` フック内のRef直接更新で行い、不要な再レンダリングを防止する。
