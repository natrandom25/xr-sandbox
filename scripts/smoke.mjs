import http from "node:http";
import { runApp } from "./run-app.mjs";

// G0-11, G0-14, G0-15 on the packaged build. Prints one CHECK line per gate id.
// A local http server counts requests. The renderer must never reach it.

const hits = { count: 0 };
const server = http.createServer((_req, res) => {
  hits.count += 1;
  res.end("reachable");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

const run = await runApp(["--xr-smoke", `--xr-local-url=http://localhost:${port}/`], { timeoutMs: 30000 });
server.close();

const r = run.result ?? {};
const fetched = r.fetched ?? {};
const csp = typeof fetched.csp === "string" ? fetched.csp : "";

const checks = [
  {
    id: "G0-11",
    ok: run.code === 0 && !run.timedOut && r.windowShown === true && r.packaged === true,
    detail: `exit=${run.code} timedOut=${run.timedOut} windowShown=${r.windowShown} packaged=${r.packaged}`,
  },
  {
    id: "G0-14",
    ok:
      csp.includes("default-src 'self'") &&
      csp.includes("connect-src 'none'") &&
      fetched.external === "blocked" &&
      fetched.localhost === "blocked" &&
      hits.count === 0 &&
      r.rendered === true,
    detail: `external=${fetched.external} localhost=${fetched.localhost} serverHits=${hits.count} rendered=${r.rendered} csp=${csp ? "present" : "missing"}`,
  },
  {
    id: "G0-15",
    ok: r.webgl2 === true && r.error === null,
    detail: `webgl2=${r.webgl2} renderer=${r.glRenderer} error=${r.error}`,
  },
];

for (const c of checks) console.log(`CHECK ${c.id} ${c.ok ? "PASS" : "FAIL"} ${c.detail}`);
console.log(`INFO mainFetch=${r.mainFetch} firstPaintMs=${r.firstPaintMs} electron=${r.electron} node=${r.node} v8=${r.v8}`);
if (!checks.every((c) => c.ok)) {
  console.log(`INFO stderr tail: ${run.stderr.split("\n").slice(-8).join(" | ")}`);
  process.exit(1);
}
