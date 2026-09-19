import { describe, expect, it } from "vitest";
import { hits, lintAt } from "./lint";

const RULE = "xr/import-boundary";

async function violations(file: string, code: string) {
  const messages = await lintAt(file, code);
  return messages.filter((m) => m.ruleId === RULE);
}

describe("G0-04 forbidden import edges fail with the import rule id", () => {
  it("G0-04 renderer to storage", async () => {
    const m = await lintAt("src/renderer/app/x.ts", "import { a } from '../../storage/a';\nexport { a };\n");
    expect(hits(m, RULE, "renderer may not import storage")).toHaveLength(1);
  });
  it("G0-04 renderer to core/models", async () => {
    const m = await lintAt("src/renderer/app/x.ts", "import { a } from '../../core/models/imu/a';\nexport { a };\n");
    expect(hits(m, RULE, "renderer may not import core/models")).toHaveLength(1);
  });
  it("G0-04 electron to renderer", async () => {
    const m = await lintAt("electron/main/x.ts", "import { a } from '../../src/renderer/app/a';\nexport { a };\n");
    expect(hits(m, RULE, "electron/main may not import renderer")).toHaveLength(1);
  });
  it("G0-04 core to a project folder outside types", async () => {
    const m = await lintAt("src/core/rng/x.ts", "import { a } from '../../renderer/app/a';\nexport { a };\n");
    expect(hits(m, RULE, "core may not import renderer")).toHaveLength(1);
  });
  it("G0-04 core to a package other than zod", async () => {
    const react = await lintAt("src/core/rng/x.ts", "import React from 'react';\nexport { React };\n");
    expect(hits(react, RULE, 'core may not import package "react"')).toHaveLength(1);
    const fs = await lintAt("src/core/rng/x.ts", "import fs from 'node:fs';\nexport { fs };\n");
    expect(hits(fs, RULE, 'core may not import package "node:fs"')).toHaveLength(1);
  });
  it("G0-04 adapters to core", async () => {
    const m = await lintAt("src/adapters/x.ts", "import { a } from '../core/api';\nexport { a };\n");
    expect(hits(m, RULE, "adapters may not import core/api")).toHaveLength(1);
  });
  it("G0-04 storage to core", async () => {
    const m = await lintAt("src/storage/x.ts", "import { a } from '../core/api';\nexport { a };\n");
    expect(hits(m, RULE, "storage may not import core/api")).toHaveLength(1);
  });
  it("G0-04 nothing imports tests", async () => {
    const m = await lintAt("src/renderer/app/x.ts", "import { a } from '../../../tests/core/a';\nexport { a };\n");
    expect(hits(m, RULE, "renderer may not import tests")).toHaveLength(1);
  });
  it("G0-04 dynamic import and re-export are checked too", async () => {
    const dyn = await violations("src/renderer/app/x.ts", "export const p = import('../../storage/a');\n");
    expect(dyn).toHaveLength(1);
    const re = await violations("src/renderer/app/x.ts", "export * from '../../storage/a';\n");
    expect(re).toHaveLength(1);
  });
});

describe("G0-04 allowed edges stay clean", () => {
  const allowed: Array<[string, string, string]> = [
    ["renderer to core/api", "src/renderer/app/x.ts", "import { a } from '../../core/api';\nexport { a };\n"],
    ["renderer to types", "src/renderer/app/x.ts", "import type { A } from '../../types';\nexport type { A };\n"],
    ["main to storage", "electron/main/x.ts", "import { a } from '../../src/storage/a';\nexport { a };\n"],
    ["main to core/api", "electron/main/x.ts", "import { a } from '../../src/core/api';\nexport { a };\n"],
    ["core to types", "src/core/rng/x.ts", "import type { A } from '../../types';\nexport type { A };\n"],
    ["core to zod", "src/core/rng/x.ts", "import { z } from 'zod';\nexport { z };\n"],
    ["core/api to core/models", "src/core/api/x.ts", "import { a } from '../models/imu/a';\nexport { a };\n"],
    ["tests to core internals", "tests/core/x.ts", "import { a } from '../../src/core/rng/a';\nexport { a };\n"],
    ["scripts to core/api", "scripts/x.mjs", "import { a } from '../src/core/api/index.js';\nexport { a };\n"],
  ];
  for (const [name, file, code] of allowed) {
    it(`G0-04 ${name} is allowed`, async () => {
      expect(await violations(file, code)).toHaveLength(0);
    });
  }
});
