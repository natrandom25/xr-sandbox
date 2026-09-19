import tseslint from "typescript-eslint";
import boundaries from "./eslint.boundaries.js";

// Bans inside src/core/**. Every message starts with "core ban:" and names the
// banned item, so a test can tell the eight bans apart (G0-05).
const propertyBans = [
  ["Math", "random", "use the seeded rng"],
  ["Math", "hypot", "use explicit multiplication and Math.sqrt"],
  ["Math", "pow", "use explicit multiplication and Math.sqrt"],
  ["Date", "now", "no wall clock in core, use simulated time"],
  ["performance", "now", "no wall clock in core, use simulated time"],
];

const propertyRules = propertyBans.map(([object, property, why]) => ({
  object,
  property,
  message: `core ban: ${object}.${property} (${why})`,
}));

// The same members reached through another object (globalThis.Date.now) or by
// destructuring (const { pow } = Math). The plain form is caught by the rule above.
const reachedSelectors = propertyBans.flatMap(([object, property, why]) => {
  const message = `core ban: ${object}.${property} (${why})`;
  return [
    {
      selector: `MemberExpression[object.type='MemberExpression'][object.property.name='${object}'][property.name='${property}']`,
      message,
    },
    { selector: `VariableDeclarator[init.name='${object}'] > ObjectPattern > Property[key.name='${property}']`, message },
  ];
});

const syntaxBans = [
  { selector: "NewExpression[callee.name='Date']", message: "core ban: new Date (no wall clock in core)" },
  {
    selector: "NewExpression[callee.type='MemberExpression'][callee.property.name='Date']",
    message: "core ban: new Date (no wall clock in core)",
  },
  { selector: "BinaryExpression[operator='**']", message: "core ban: the ** operator (use explicit multiplication)" },
  { selector: "AssignmentExpression[operator='**=']", message: "core ban: the **= operator (use explicit multiplication)" },
  ...reachedSelectors,
];

export default [
  { ignores: ["node_modules/**", "out/**", "dist/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ["src/**/*.{ts,tsx}", "electron/**/*.ts", "scripts/**/*.mjs", "tests/**/*.ts"],
    plugins: { xr: boundaries },
    rules: { "xr/import-boundary": "error" },
  },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-properties": ["error", ...propertyRules],
      "no-restricted-syntax": ["error", ...syntaxBans],
    },
  },
];
