/** RM1/RMD integration receipt. Starts the built app and checks its HTTP page. */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const port = process.env.AURUM_SMOKE_PORT ?? "3199";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));
try {
  let response;
  for (let i = 0; i < 100; i++) {
    try {
      response = await fetch(`http://127.0.0.1:${port}`);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert(response, "Built app did not answer");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const marker of [
    "AURUM CIVITAS",
    "EXPERIMENTAL_FIXTURE_NOT_CANONICAL_BALANCE",
    "<canvas",
    "Carregar cenário JSON",
  ])
    assert(html.includes(marker), "Missing " + marker);
  const receipt = {
    semantic_ids: ["RM1", "RMD"],
    http_status: response.status,
    html_sha256: createHash("sha256").update(html).digest("hex"),
    checks: [
      "app responds",
      "scenario label visible",
      "canvas rendered in HTML",
      "configuration loader present",
    ],
    browser_interaction:
      "NOT_EXECUTED: browser binary unavailable; download returned truncated archive",
    source_sha256: createHash("sha256")
      .update(
        readFileSync(
          new URL("../components/game/game-world.tsx", import.meta.url),
        ),
      )
      .digest("hex"),
  };
  writeFileSync(
    new URL("../evidence/http-smoke.json", import.meta.url),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  child.kill("SIGTERM");
}
