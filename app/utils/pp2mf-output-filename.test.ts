import { describe, expect, it } from "vitest";
import {
  createPp2mfOutputFilename,
  isPp2mfOutputFilename,
} from "./pp2mf-output-filename";

describe("createPp2mfOutputFilename", () => {
  it("PP2MFの出力だと分かるファイル名を生成する", () => {
    expect(createPp2mfOutputFilename("paypay残高", 0, 1)).toBe(
      "pp2mf-paypay残高.csv",
    );
    expect(createPp2mfOutputFilename("visa-1234", 1, 2)).toBe(
      "pp2mf-visa-1234_part2.csv",
    );
  });
});

describe("isPp2mfOutputFilename", () => {
  it.each([
    "pp2mf-paypay残高.csv",
    "PP2MF-visa-1234_part1.csv",
    "Pp2mF-transactions.csv",
  ])("%sをPP2MFの出力として判定する", (filename) => {
    expect(isPp2mfOutputFilename(filename)).toBe(true);
  });

  it.each([
    "paypay-paypay残高.csv",
    "paypay-pp2mf.csv",
    "my-pp2mf-paypay残高.csv",
  ])("%sをPP2MFの出力として判定しない", (filename) => {
    expect(isPp2mfOutputFilename(filename)).toBe(false);
  });
});
