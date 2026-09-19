import { ESLint, type Linter } from "eslint";
import { fileURLToPath } from "node:url";
import path from "node:path";

export type Msg = Linter.LintMessage;

// Repo root, taken from this file's location and not from process.cwd(),
// so the tests give the same result from any working folder.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const eslint = new ESLint({ cwd: root });

// Lint `code` as if it lived at `relPath` under the repo root (for example
// "src/core/x.ts"). The file is never written to disk. It must sit at a real
// path shape inside src/core/ so the core-only rules apply. A fixture placed
// under tests/ would fall outside those rules and pass for the wrong reason.
export async function lintAt(relPath: string, code: string): Promise<Msg[]> {
  const filePath = path.join(root, relPath);
  if (await eslint.isPathIgnored(filePath)) {
    throw new Error(`lint-break: ${relPath} is ignored by the ESLint config, so a clean result would mean nothing`);
  }
  const results = await eslint.lintText(code, { filePath });
  const result = results[0];
  if (result === undefined) {
    throw new Error(`lint-break: no result for ${relPath}`);
  }
  const fatal = result.messages.find((m) => m.fatal === true);
  if (fatal !== undefined) {
    throw new Error(`lint-break: fixture did not parse (${fatal.message})`);
  }
  return result.messages;
}

// Messages that carry this rule id AND contain this text. Asserting both is
// how two built-in rules can tell eight bans apart (G0-05).
export function hits(messages: Msg[], ruleId: string, text: string): Msg[] {
  return messages.filter((m) => m.ruleId === ruleId && m.message.includes(text));
}
