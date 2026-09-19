import { describe, expect, it } from "vitest";
import * as api from "../../src/core/api";

describe("G0-09 node tests", () => {
  it("G0-09 a core test runs in the node environment with no window", () => {
    expect("window" in globalThis).toBe(false);
    expect(typeof process.versions.node).toBe("string");
    expect(api).toBeDefined();
  });
});
