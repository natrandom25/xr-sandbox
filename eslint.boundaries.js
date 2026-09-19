import path from "node:path";

// Import boundary rule. Enforces the table in docs/folder-structure.md.
// It reads only the import specifier, resolves relative ones against the file,
// and compares folder kinds. Bare packages are checked for types/ and core/.

const KINDS = [
  ["src/types/", "types"],
  ["src/core/api/", "core/api"],
  ["src/core/models/", "core/models"],
  ["src/core/", "core"],
  ["src/adapters/", "adapters"],
  ["src/storage/", "storage"],
  ["src/renderer/", "renderer"],
  ["electron/preload/", "electron/preload"],
  ["electron/main/", "electron/main"],
  ["scripts/", "scripts"],
  ["tests/", "tests"],
];

const CORE_INTERNAL = ["core", "core/models"];

// What each kind may import. A kind may always import its own folder.
const ALLOW = {
  types: ["types"],
  core: ["types", ...CORE_INTERNAL],
  "core/api": ["types", "core/api", ...CORE_INTERNAL],
  adapters: ["types", "adapters"],
  storage: ["types", "storage"],
  "electron/preload": ["types", "electron/preload"],
  "electron/main": ["types", "core/api", "storage", "electron/main"],
  renderer: ["types", "core/api", "renderer"],
  scripts: ["types", "core/api", "storage", "scripts"],
  tests: ["types", "core/api", ...CORE_INTERNAL, "adapters", "storage", "renderer", "tests"],
};

const toPosix = (p) => p.split(path.sep).join("/");

function kindOf(rel) {
  const withSlash = rel.endsWith("/") ? rel : `${rel}/`;
  for (const [prefix, kind] of KINDS) {
    if (withSlash.startsWith(prefix)) return kind;
  }
  return "other";
}

// core/models files are core files for the purpose of "who is importing".
const importerKind = (kind) => (kind === "core/models" ? "core" : kind);

function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..";
}

function packageAllowed(from, spec) {
  if (from === "types") return false;
  if (from === "core" || from === "core/api") return spec === "zod" || spec.startsWith("zod/");
  return true;
}

const rule = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const root = context.cwd;
    const filename = context.filename;
    const from = importerKind(kindOf(toPosix(path.relative(root, filename))));
    if (!(from in ALLOW)) return {};

    function check(node, source) {
      if (!source || typeof source.value !== "string") return;
      const spec = source.value;
      if (isRelative(spec)) {
        const target = toPosix(path.relative(root, path.resolve(path.dirname(filename), spec)));
        const to = target.startsWith("..") ? "other" : kindOf(target);
        if (!ALLOW[from].includes(to)) {
          context.report({ node, message: `import boundary: ${from} may not import ${to} ("${spec}")` });
        }
      } else if (!packageAllowed(from, spec)) {
        const hint = from === "types" ? "no packages" : "only zod";
        context.report({ node, message: `import boundary: ${from} may not import package "${spec}" (${hint})` });
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
    };
  },
};

export default { rules: { "import-boundary": rule } };
