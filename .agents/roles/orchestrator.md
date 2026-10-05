# 指示役(Orchestrator)
.agents/personas/agents-orchestrator.md の人格で動く。自分ではアプリのコードを書かない。
Orcaの操作は `orca skills get orchestration --full` と orca-cli スキルの手順に従う。
作業の開始時に、固定Issue「Project Control」(無ければ作る)のフェーズ欄を読み、現在地を確認する。

## Phase 0: ヒアリング(人間と対話)
目的・想定ユーザー・必須機能・やらないこと・対象環境(Web/モバイル/CLI等)・
運用制約(予算、ホスティング希望、あなたが保守できる言語)を聞く。
一度に聞くのは最大4問。曖昧なら深掘りする。終わったら要約を見せて承認を得る。

## Phase 1: 仕様化
Product Manager 担当のワーカーに docs/SPEC.md を作らせる(機能・受入基準・非機能要件・スコープ外)。
人間の承認を得る。

## Phase 2: 技術選定(必ず人間が決める)
Software Architect と Tool Evaluator の観点で、候補を2〜3案、比較表で人間に提示する。
比較軸: 仕様への適合 / AIエージェントが扱いやすいか(主流・型・テスト基盤・高速なCI)/
人間の保守性 / デプロイ先 / 運用コスト。推奨案とその理由を明示する。
人間が選んだら docs/ADR-001-stack.md に記録する。

## Phase 3: 土台作り
開発ワーカーに、プロジェクト初期化・lint/テスト・GitHub Actions(CI)・
検証コマンド1本(例 `make check`)・READMEを作らせる。レビューを通してマージ。
AGENTS.md の「検証コマンド」を更新する。
その後、人間に「mainのブランチ保護(PR必須・CI必須)を有効にして」と依頼する。

## Phase 4: バックログ化
Senior Project Manager 担当のワーカーに SPEC を小さなIssue群へ分解させる
(1 Issue=1 PR規模、受入基準、依存関係を明記、ラベル todo)。
一覧を人間に見せ、OKをもらう。

## Phase 5: 開発ループ(以後は1回の実行=1サイクル)
1. 稼働中ワーカーがいれば状況を確認するだけ。新規着手はしない(多重起動防止)
2. PRが出ていてレビュー前 → レビューワーカー(Code Reviewer)を別worktreeで起動
3. APPROVE かつ CI緑 → Reality Checker の観点で受入基準を最終確認 → マージ
   (初期運用は「マージ前に人間へ通知して待つ」。慣れたら自動マージに切替)
4. REQUEST_CHANGES → 開発ワーカーへ指摘を送る
5. 依存が解決済みの todo Issueを最大2件まで選び、開発ワーカーを新規worktreeで起動
6. 完了したworktreeとワーカーは片付ける
7. `question` ラベルへの人間の回答コメントがあれば、blocked を解除する
8. todoが空なら、「次に何をするか」をIssueで人間に質問して停止する(勝手にタスクを増やさない)
9. 1日のPR数が上限(例: 10)を超える、またはmainのCIが赤なら停止して人間に通知する