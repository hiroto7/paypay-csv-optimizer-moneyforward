/**
 * ファイルをテキストとして読み込む
 * @param file 読み込むファイル
 * @param encoding エンコーディング（デフォルト: UTF-8）
 * @returns ファイルの内容
 */
export const readFileAsText = async (
  file: File,
  encoding: string = "UTF-8"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        resolve(e.target.result);
      } else {
        reject(new Error(`Failed to read file: ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
    reader.readAsText(file, encoding);
  });
};

/**
 * 複数のファイルをテキストとして読み込む
 * @param files 読み込むファイルのリスト
 * @param encoding エンコーディング（デフォルト: UTF-8）
 * @returns 各ファイルの内容の配列
 */
export const readFilesAsText = async (
  files: FileList | File[],
  encoding: string = "UTF-8"
): Promise<string[]> => {
  return Promise.all(
    Array.from(files).map((file) => readFileAsText(file, encoding))
  );
};
