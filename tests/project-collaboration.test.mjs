import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { projectRole, canSubmitWork } from "../lib/auth/project-role.ts";

test("roles come from stored project membership", () => {
  const project = { created_by: "client", freelancer_id: "freelancer" };
  assert.equal(projectRole(project, "client"), "CLIENT");
  assert.equal(projectRole(project, "freelancer"), "FREELANCER");
  assert.equal(projectRole(project, "stranger"), null);
  assert.equal(canSubmitWork(project, "client"), false);
  assert.equal(canSubmitWork(project, "freelancer"), true);
  assert.equal(canSubmitWork(project, "stranger"), false);
});

test("legacy single-account projects still permit owner sample submissions", () => {
  assert.equal(canSubmitWork({ created_by: "client", freelancer_id: null }, "client"), true);
  assert.equal(canSubmitWork({ created_by: null, freelancer_id: null }, "stranger"), false);
});

function harness(route, { signedIn = true, accessible = true, rpcError = null } = {}) {
  const calls = [];
  const response = { json: (value, init) => Response.json(value, init) };
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "authenticated-user" } : null }, error: null }) },
    from() { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: accessible ? { id: "milestone" } : null, error: null }) }; return q; },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: { success: true }, error: rpcError }; },
  };
  const dependencies = {
    "next/server": { NextResponse: response },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/supabase/admin": { createAdminClient: () => client },
  };
  function load(path) {
    const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require(name) { if (!dependencies[name]) throw Error(name); return dependencies[name]; }, Response, URL });
    return exports;
  }
  dependencies["@/lib/auth/collaboration-response"] = load("../lib/auth/collaboration-response.ts");
  const handler = load(`../app/api/milestone/[milestoneId]/${route}/route.ts`).POST;
  return { calls, run: body => handler(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ milestoneId: "milestone" }) }) };
}

for (const route of ["submit", "dispute"]) {
  test(`${route}: signed-out users cannot invoke privileged transactions`, async () => {
    const h = harness(route, { signedIn: false });
    assert.equal((await h.run({})).status, 401);
    assert.equal(h.calls.length, 0);
  });
}

test("submission ignores forged actor identity and accepts content without a URL", async () => {
  const h = harness("submit");
  assert.equal((await h.run({ submissionContent: "<footer>A real deliverable</footer>", actorId: "client", p_actor: "client" })).status, 200);
  assert.equal(h.calls[0].args.p_actor, "authenticated-user");
  assert.equal(h.calls[0].args.p_url, "");
});

test("invalid submission URL never reaches the transaction", async () => {
  const h = harness("submit");
  assert.equal((await h.run({ submissionContent: "<footer>A real deliverable</footer>", submissionUrl: "javascript:alert(1)" })).status, 400);
  assert.equal(h.calls.length, 0);
});

test("dispute outsiders cannot invoke the transaction", async () => {
  const h = harness("dispute", { accessible: false });
  assert.equal((await h.run({ reason: "The deliverable is incomplete." })).status, 403);
  assert.equal(h.calls.length, 0);
});

test("dispute accepts only supported actions, never a forced payment outcome", async () => {
  const h = harness("dispute");
  assert.equal((await h.run({ action: "force_capture" })).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.run({ action: "accept_revision", actorId: "other-participant" })).status, 200);
  assert.equal(h.calls[0].args.p_actor, "authenticated-user");
});

test("database authorization, validation, and conflict failures are preserved", async () => {
  for (const [code, status] of [["42501", 403], ["22023", 400], ["P0001", 409], ["XX000", 500]]) {
    const h = harness("dispute", { rpcError: { code, message: "database detail" } });
    const result = await h.run({ action: "accept_revision" });
    assert.equal(result.status, status);
    if (status === 500) assert.doesNotMatch((await result.json()).error, /database detail/);
  }
});
