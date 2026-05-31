import { describe, expect, it } from "vitest";
import redact from "../electron/services/redact.cjs";

describe("redaction", () => {
  it("redacts sensitive keys", () => {
    expect(redact.redactValue({ token: "abc", keep: "value" })).toEqual({
      token: "[redacted]",
      keep: "value"
    });
  });

  it("redacts shaped secrets in strings", () => {
    const shapedSecret = "Bearer " + "abcdefghijklmnopqrstuvwxyz123456";
    const text = redact.redactString(`Authorization: ${shapedSecret}`);
    expect(text).toContain("[redacted]");
  });

  it("redacts private Windows user path segments", () => {
    const text = redact.redactString("C:\\Users\\alice\\.codex\\sessions");
    expect(text).toBe("%USERPROFILE%\\.codex\\sessions");
  });
});
