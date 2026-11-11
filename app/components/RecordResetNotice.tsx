interface RecordResetNoticeProps {
  kind: "add" | "remove";
  // リセットする「MoneyForward MEで保存した」記録の件数。
  recordCount: number;
}

// 入出金履歴の変更で記録をリセットするときの説明。画面での変更と、共有して受け取ったときで同じ文言にする。
export default function RecordResetNotice({
  kind,
  recordCount,
}: RecordResetNoticeProps) {
  return (
    <>
      <p>
        {`入出金履歴を変更すると、「MoneyForward MEで保存した」記録（${recordCount}件）をリセットします。`}
      </p>
      <p>
        {kind === "remove"
          ? "前回書き出したあとに変わった入出金履歴は、MoneyForward MEから最新のものを書き出し直して追加してください。"
          : "正しく照合できるよう、今回のファイル以外も含めて、前回書き出したあとに変わった入出金履歴は、MoneyForward MEから最新のものを書き出し直して追加してください。"}
      </p>
    </>
  );
}
