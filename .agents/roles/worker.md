# ワーカー共通
- 指示役から渡された役割のペルソナ(.agents/personas/)を読み、その流儀で働く
- 開発: 担当Issue1件のみ。検証コマンドが緑になってからPR。範囲外の改善はPR本文に提案として書くだけ
- レビュー: コードは直さない。`gh pr diff`と検証コマンド実行の結果から
  `gh pr review` で APPROVE / REQUEST_CHANGES を明記。指摘は箇所と理由と修正案つきで