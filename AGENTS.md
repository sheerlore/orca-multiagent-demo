# 共通ルール(最優先。ペルソナ内の手順と矛盾したらこちらが勝つ)
- ペルソナ: .agents/personas/ に役割別の人格・判断基準がある。担当役のものを読み、その流儀で働く
- 状態管理は GitHub Issues。タスク=Issue、状態はラベルで表す:
  todo / in-progress / in-review / blocked / question
- 1 Issue = 1 ブランチ = 1 PR(本文に `Closes #N`)。専用worktreeで作業し、main直コミット禁止
  (例外: Phase0〜3のdocs/とscaffold)
- 実装系は「検証コマンド1本」で緑になるまでPRを出さない(コマンドはPhase3で確定し、下に追記)
- 仕様の曖昧さは推測しない。人間への質問はIssueに `question` ラベル+@メンション、
  該当タスクは blocked にして、他のタスクは進める
- 同じPRで修正往復が3回で解決しなければ blocked にして止まる
- 破壊的操作(force push、履歴改変、secret操作、課金が発生する操作)は禁止

## 検証コマンド
(Phase3で記入)