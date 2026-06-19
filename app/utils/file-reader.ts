/**
 * ファイルをUTF-8として読める場合はUTF-8、読めない場合はShift_JISとして読み込む
 * @param file 読み込むファイル
 * @returns ファイルの内容
 */
export const readFileAsTextAuto = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("shift_jis").decode(buffer);
  }
};

export const createFileIdentity = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

/**
 * 複数のファイルをUTF-8/Shift_JIS自動判定で読み込む
 * @param files 読み込むファイルのリスト
 * @returns 各ファイルの内容の配列
 */
export const readFilesAsTextAuto = async (
  files: FileList | File[],
): Promise<string[]> => {
  return Promise.all(Array.from(files).map((file) => readFileAsTextAuto(file)));
};
