import path from "node:path";
import { describe, expect, it } from "vitest";
import collector from "../electron/services/codex-collector.cjs";

const fixtureHome = path.resolve("fixtures/redacted-codex-home");

describe("codex collector", () => {
  it("reads fixture settings without raw secrets", () => {
    process.env.CODEX_HOME = fixtureHome;
    const settings = collector.getSettings(process.cwd());
    expect(settings.mcpServers.length).toBe(1);
    expect(settings.redactedPreview).toContain("[redacted]");
  });

  it("lists fixture sessions", () => {
    process.env.CODEX_HOME = fixtureHome;
    const sessions = collector.getSessions(process.cwd(), "", 10);
    expect(sessions.length).toBe(1);
    expect(sessions[0].title).toContain("Inspect local Codex");
  });
});
