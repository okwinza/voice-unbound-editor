import { describe, it, expect } from "vitest";
import {
  parseFormRef,
  serializeFormRef,
  isFormRef,
  isHexLocalId,
  normalizeHex,
} from "../form-refs";

describe("parseFormRef", () => {
  it("parses the canonical form (Skyrim.esm|0x7)", () => {
    const r = parseFormRef("Skyrim.esm|0x7");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.plugin).toBe("Skyrim.esm");
      expect(r.value.localIdHex).toBe("00000007");
    }
  });

  it("parses 8-digit form refs verbatim", () => {
    const r = parseFormRef("Dawnguard.esm|0x01234ABC");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.localIdHex).toBe("01234abc");
  });

  it("accepts .esp, .esm, .esl", () => {
    expect(parseFormRef("foo.esp|0x1").ok).toBe(true);
    expect(parseFormRef("foo.esm|0x1").ok).toBe(true);
    expect(parseFormRef("foo.esl|0x1").ok).toBe(true);
  });

  it("accepts plugin names with spaces and punctuation", () => {
    expect(parseFormRef("Unofficial Skyrim Patch.esp|0xABCDEF").ok).toBe(true);
  });

  it("rejects missing 0x prefix", () => {
    expect(parseFormRef("Skyrim.esm|7").ok).toBe(false);
  });

  it("rejects malformed shape", () => {
    expect(parseFormRef("Skyrim.esm 0x7").ok).toBe(false);
    expect(parseFormRef("|0x7").ok).toBe(false);
    expect(parseFormRef("Skyrim.txt|0x7").ok).toBe(false);
    expect(parseFormRef("").ok).toBe(false);
  });

  it("rejects > 8 hex digits", () => {
    expect(parseFormRef("foo.esm|0x123456789").ok).toBe(false);
  });

  it("serializes back into canonical form", () => {
    const ref = { plugin: "Skyrim.esm", localIdHex: "00000007" };
    expect(serializeFormRef(ref)).toBe("Skyrim.esm|0x00000007");
  });
});

describe("isFormRef / isHexLocalId / normalizeHex", () => {
  it("isFormRef is consistent with parseFormRef", () => {
    expect(isFormRef("Skyrim.esm|0x7")).toBe(true);
    expect(isFormRef("player")).toBe(false);
  });

  it("isHexLocalId accepts 1-8 hex chars with optional 0x", () => {
    expect(isHexLocalId("7")).toBe(true);
    expect(isHexLocalId("0x7")).toBe(true);
    expect(isHexLocalId("0xABCDEF01")).toBe(true);
    expect(isHexLocalId("0x123456789")).toBe(false);
    expect(isHexLocalId("GHIJ")).toBe(false);
    expect(isHexLocalId("")).toBe(false);
  });

  it("normalizeHex strips 0x and pads to 8", () => {
    expect(normalizeHex("7")).toBe("00000007");
    expect(normalizeHex("0x7")).toBe("00000007");
    expect(normalizeHex("0XABCDEF01")).toBe("abcdef01");
  });
});
