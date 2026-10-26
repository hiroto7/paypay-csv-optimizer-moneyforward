const downloadCsv = (filename: string, blob: Blob) => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 共有シートでファイルを渡す。共有できない環境ではダウンロードで代替する。
// 共有シートを閉じた（AbortError）ときだけfalseを返す。
export const shareFile = async (file: File): Promise<boolean> => {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return false;
      console.error("Share failed, falling back to download:", error);
    }
  }

  downloadCsv(file.name, file);
  return true;
};

export const shareCsv = async (
  filename: string,
  data: string,
): Promise<boolean> =>
  // MoneyForward MEへ渡すファイルは、共有とダウンロードのどちらもBOM付きUTF-8にする。
  shareFile(new File([`\uFEFF${data}`], filename, { type: "text/csv" }));
