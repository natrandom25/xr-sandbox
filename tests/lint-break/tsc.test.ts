import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

function readOptions(configName: string): ts.CompilerOptions {
  const file = path.join(root, configName);
  const raw = ts.readConfigFile(file, ts.sys.readFile);
  if (raw.error) throw new Error(`cannot read ${configName}`);
  return ts.parseJsonConfigFileContent(raw.config, ts.sys, root).options;
}

// Compile `code` as an in-memory file at src/core/, with the options of one
// tsconfig. Nothing is written to disk.
function diagnosticCodes(configName: string, code: string): number[] {
  const options = readOptions(configName);
  const virtual = path.join(root, "src", "core", "__fixture__.ts");
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  host.getSourceFile = (name, lang, ...rest) =>
    name === virtual ? ts.createSourceFile(name, code, lang) : getSourceFile(name, lang, ...rest);
  host.fileExists = (name) => name === virtual || fileExists(name);
  host.readFile = (name) => (name === virtual ? code : readFile(name));
  const program = ts.createProgram([virtual], options, host);
  return ts.getPreEmitDiagnostics(program).map((d) => d.code);
}

describe("G0-03 strict optionals", () => {
  for (const name of ["tsconfig.json", "tsconfig.core.json", "tsconfig.node.json", "tsconfig.web.json"]) {
    it(`G0-03 ${name} has strict and exactOptionalPropertyTypes on`, () => {
      const options = readOptions(name);
      expect(options.strict).toBe(true);
      expect(options.exactOptionalPropertyTypes).toBe(true);
    });
  }
  it("G0-03 assigning undefined to an optional field fails tsc", () => {
    const code = "interface Opt { x?: number }\nexport const a: Opt = { x: undefined };\n";
    expect(diagnosticCodes("tsconfig.json", code)).toContain(2375);
  });
});

describe("G0-08 DOM-free core", () => {
  it("G0-08 window, document and navigator fail tsc with the core tsconfig", () => {
    const code = "export const a = [typeof window, typeof document, typeof navigator];\n";
    const codes = diagnosticCodes("tsconfig.core.json", code);
    // 2304: cannot find name. 2584: cannot find name, suggests the dom lib (document).
    expect(codes.filter((c) => c === 2304 || c === 2584)).toHaveLength(3);
  });
  it("G0-08 process and setTimeout also fail with the core tsconfig", () => {
    const codes = diagnosticCodes("tsconfig.core.json", "export const a = [process.env, setTimeout];\n");
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });
  it("G0-08 a clean core file compiles", () => {
    const code = "export const add = (a: number, b: number): number => a + b;\n";
    expect(diagnosticCodes("tsconfig.core.json", code)).toEqual([]);
  });
});
