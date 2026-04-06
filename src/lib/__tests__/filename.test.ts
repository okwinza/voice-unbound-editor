import { describe, it, expect } from "vitest";
import { nextFilename, validateFilename } from "../filename";

describe("nextFilename", () => {
  it("increments a zero-padded suffix", () => {
    const r = nextFilename("okw_battlecry_01.json", new Set());
    expect(r.name).toBe("okw_battlecry_02.json");
    expect(r.numbered).toBe(true);
  });

  it("preserves the original pad width", () => {
    const r = nextFilename("clip_007.json", new Set());
    expect(r.name).toBe("clip_008.json");
  });

  it("skips over existing siblings", () => {
    const siblings = new Set([
      "okw_battlecry_02.json",
      "okw_battlecry_03.json",
    ]);
    const r = nextFilename("okw_battlecry_01.json", siblings);
    expect(r.name).toBe("okw_battlecry_04.json");
  });

  it("appends _copy to an un-numbered filename", () => {
    const r = nextFilename("battlecry.json", new Set());
    expect(r.name).toBe("battlecry_copy.json");
    expect(r.numbered).toBe(false);
  });

  it("bumps _copy → _copy_2 if _copy exists", () => {
    const r = nextFilename(
      "battlecry.json",
      new Set(["battlecry_copy.json"]),
    );
    expect(r.name).toBe("battlecry_copy_2.json");
  });

  it("bumps existing _copy_N", () => {
    const r = nextFilename("battlecry_copy_3.json", new Set());
    expect(r.name).toBe("battlecry_copy_4.json");
  });

  it("throws on non-json filenames", () => {
    expect(() => nextFilename("foo.txt", new Set())).toThrow();
  });
});

describe("validateFilename", () => {
  it("accepts normal json filenames", () => {
    expect(validateFilename("okw_battlecry_01.json").ok).toBe(true);
  });

  it("rejects empty", () => {
    expect(validateFilename("").ok).toBe(false);
  });

  it("rejects non-json extensions", () => {
    expect(validateFilename("foo.txt").ok).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(validateFilename("foo/bar.json").ok).toBe(false);
    expect(validateFilename("foo:bar.json").ok).toBe(false);
    expect(validateFilename("foo*.json").ok).toBe(false);
  });
});
