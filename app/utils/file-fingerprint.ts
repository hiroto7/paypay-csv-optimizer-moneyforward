// 同じ内容のファイルを、選び直しや共有し直しでも同じ作業として扱うための判定値。
// 安全なコンテキストでない場合など、crypto.subtleを使えないときはファイルの属性で代用する。
export const createFileFingerprint = async (file: File): Promise<string> => {
  try {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      const hex = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return `sha256:${hex}`;
    }
  } catch (error) {
    console.warn("Failed to hash file:", error);
  }

  return `file:${file.name}:${file.size}:${file.lastModified}`;
};
