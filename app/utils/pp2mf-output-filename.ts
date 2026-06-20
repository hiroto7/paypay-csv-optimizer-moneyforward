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
