import { describe, expect, it } from "vitest";
import { hits, lintAt } from "./lint";

const CORE = "src/core/rng/x.ts";
const PROPS = "no-restricted-properties";
const SYNTAX = "no-restricted-syntax";

// Each ban has its own message text. Eight bans map to two built-in rules,
// so a test asserts the rule id AND the message text (G0-05).
const bans = [
  { name: "Math.random", code: "export const a = Math.random();\n", rule: PROPS },
  { name: "Date.now", code: "export const a = Date.now();\n", rule: PROPS },
  { name: "performance.now", code: "export const a = performance.now();\n", rule: PROPS },
  { name: "new Date", code: "export const a = new Date();\n", rule: SYNTAX },
  { name: "Math.hypot", code: "export const a = Math.hypot(3, 4);\n", rule: PROPS },
  { name: "Math.pow", code: "export const a = Math.pow(2, 3);\n", rule: PROPS },
  { name: "the ** operator", code: "export const a = 2 ** 3;\n", rule: SYNTAX },
  { name: "the **= operator", code: "let a = 2;\na **= 3;\nexport { a };\n", rule: SYNTAX },
];

describe("G0-05 core bans", () => {
  for (const ban of bans) {
    it(`G0-05 ${ban.name} fails lint in src/core with its own rule id and message`, async () => {
      const messages = await lintAt(CORE, ban.code);
      const banMessages = messages.filter((m) => m.message.includes("core ban:"));
      expect(banMessages).toHaveLength(1);
      expect(hits(messages, ban.rule, `core ban: ${ban.name}`)).toHaveLength(1);
    });
  }
});
