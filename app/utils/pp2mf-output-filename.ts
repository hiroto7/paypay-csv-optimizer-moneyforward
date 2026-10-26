const PP2MF_OUTPUT_FILENAME_PREFIX = "pp2mf-";

export const createPp2mfOutputFilename = (
  filenameBase: string,
  index: number,
  totalParts: number,
) =>
  `${PP2MF_OUTPUT_FILENAME_PREFIX}${filenameBase}${
    totalParts > 1 ? `_part${index + 1}` : ""
  }.csv`;

export const isPp2mfOutputFilename = (filename: string): boolean =>
  filename.toLowerCase().startsWith(PP2MF_OUTPUT_FILENAME_PREFIX);

// 口座名からファイル名に使える部分を作る。同じ結果になる口座には番号を付けて区別する。
export const createUniqueFilenameBases = (names: readonly string[]) => {
  const usedBases = new Set<string>();

  return names.map((name) => {
    const normalizedName =
      name
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "transactions";
    let filenameBase = normalizedName;
    let suffix = 2;

    while (usedBases.has(filenameBase)) {
      filenameBase = `${normalizedName}-${suffix}`;
      suffix++;
    }

    usedBases.add(filenameBase);
    return filenameBase;
  });
};
