import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { createHash } from "node:crypto";
import { analyzeArtifact } from "../lib/verification/analyze-artifact.ts";
import { hasUnresolvedDispute, verificationStates } from "../lib/payment/workflow-state.ts";
import { evaluatePaymentPolicy } from "../lib/payment/policy.ts";

// Execute the actual route with in-memory dependencies; never load credentials.
function harness(decision = "APPROVED") {
  const milestone = {
    id: "milestone", project_id: "project", title: "Website", status: "SUBMITTED",
    acceptance_criteria: ["Include a footer"], payment_release_locked_at: null,
    paypal_capture_id: null,
  };
  let activityUnavailable = false;
  const tables = {
    milestones: [milestone], projects: [{ id: "project", created_by: "owner" }],
    submissions: [{ id: "submission", milestone_id: "milestone", version: 1,
      status: "SUBMITTED", submission_content: "<html><body><footer>Contact us</footer></body></html>" }],
    ai_evaluations: [], activity_events: [], disputes: [],
  };
  function from(table) {
    let action = "select", values;
    const filters = [];
    const query = {
      select() { return query; }, order() { return query; }, limit() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      is(key, value) { filters.push((row) => (row[key] ?? null) === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      update(input) { action = "update"; values = input; return query; },
      insert(input) { action = "insert"; values = input; return query; },
      single() { return execute(true); }, maybeSingle() { return execute(true); },
      then(resolve, reject) { return execute(false).then(resolve, reject); },
    };
    async function execute(single) {
      if (action === "insert") {
        if (table === "activity_events" && activityUnavailable) return { data: null, error: { message: "Activity storage unavailable" } };
        tables[table].push({ ...values });
        return { data: null, error: null };
      }
      const rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
      if (action === "update") {
        if (table === "submissions" && values.status === "ESCALATE") {
          return { data: null, error: { message: "submissions_status_check" } };
        }
        rows.forEach((row) => Object.assign(row, values));
      }
      return { data: single ? (rows[0] ? { ...rows[0] } : null) : rows.map((row) => ({ ...row })), error: null };
    }
    return query;
  }
  const database = { from, auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) } };
  let calls = 0, complete;
  const gate = new Promise((resolve) => { complete = resolve; });
  const dependencies = {
    "next/server": { NextResponse: { json: (data, init) => Response.json(data, init) } },
    "@google/genai": {
      Type: { OBJECT: "object", STRING: "string", NUMBER: "number", ARRAY: "array", BOOLEAN: "boolean" },
      GoogleGenAI: class {
        models = { generateContent: async () => {
          calls++;
          await gate;
          return { text: JSON.stringify({ status: decision, score: 1, confidence: 0.95,
            criteria_results: [{ requirement: "Include a footer", passed: true, evidence: "Footer exists." }],
            summary: "Source assessed." }) };
        } };
      },
    },
    "@/lib/supabase/server": { createClient: async () => database },
    "@/lib/supabase/admin": { createAdminClient: () => database },
    "@/lib/verification/analyze-artifact": { analyzeArtifact },
    "@/lib/payment/workflow-state": { verificationStates },
  };
  function loadRoute(route) {
    const source = readFileSync(new URL(`../app/api/milestone/[milestoneId]/${route}/route.ts`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports, require(name) { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; },
      process: { env: {} }, console: { error() {} }, Response,
    });
    return () => exports.POST(new Request(`http://localhost/api/${route}`, { method: "POST" }), { params: Promise.resolve({ milestoneId: "milestone" }) });
  }
  return {
    milestone, tables, complete, calls: () => calls, dependencies, loadRoute,
    failActivity: () => { activityUnavailable = true; },
    run: loadRoute("verify"),
  };
}

async function waitForModel(h) {
  for (let i = 0; i < 30 && !h.calls(); i++) await Promise.resolve();
  assert.equal(h.calls(), 1);
}

test("two concurrent verifications invoke the model only once", async () => {
  const h = harness();
  const first = h.run();
  await waitForModel(h);
  assert.equal((await h.run()).status, 409);
  h.complete();
  assert.equal((await first).status, 200);
  assert.equal(h.calls(), 1);
  assert.equal(h.milestone.status, "APPROVED");
  assert.equal(h.milestone.payment_release_locked_at, null);
});

test("a slow verification cannot overwrite a paid milestone", async () => {
  const h = harness();
  const pending = h.run();
  await waitForModel(h);
  h.milestone.status = "PAID";
  h.milestone.paypal_capture_id = "existing-capture";
  h.complete();
  assert.equal((await pending).status, 500);
  assert.equal(h.milestone.status, "PAID");
  assert.equal(h.milestone.paypal_capture_id, "existing-capture");
});

test("escalation persists without violating the submission constraint", async () => {
  const h = harness("ESCALATE");
  h.complete();
  assert.equal((await h.run()).status, 200);
  assert.equal(h.tables.submissions[0].status, "UNDER_REVIEW");
  assert.equal(h.milestone.status, "DISPUTED");
});

test("existing payment or dispute lock prevents verification", async () => {
  const h = harness();
  h.milestone.payment_release_locked_at = "existing-lock";
  assert.equal((await h.run()).status, 409);
  assert.equal(h.calls(), 0);
});

function releaseHarness() {
  const h = harness();
  Object.assign(h.milestone, { status: "APPROVED", paypal_authorization_id: "authorization", paypal_order_id: "order", amount: "500.00" });
  h.tables.projects[0].currency = "USD";
  h.tables.submissions[0].status = "APPROVED";
  h.tables.ai_evaluations.push({
    id: "evaluation", submission_id: "submission", status: "APPROVED", score: 1, confidence: 0.95,
    criteria_results: [{ requirement: "Include a footer", passed: true, evidence: "Footer exists." }],
    artifact_analysis: analyzeArtifact(h.tables.submissions[0].submission_content),
  });
  let captures = 0, completions = 0;
  h.dependencies["node:crypto"] = { createHash };
  h.dependencies["@/lib/payment/policy"] = { evaluatePaymentPolicy };
  h.dependencies["@/lib/payment/workflow-state"] = { hasUnresolvedDispute, verificationStates };
  h.dependencies["@/lib/payment/complete-project"] = { completeProjectIfPaid: async () => { completions++; return true; } };
  h.dependencies["@/lib/paypal/orders"] = {
    captureAuthorizedPayPalPayment: async () => {
      assert.ok(h.tables.activity_events.some(event => event.event_type === "PAYMENT_CAPTURE_STARTED"));
      captures++;
      // Model a webhook arriving before the capture response is saved.
      Object.assign(h.milestone, { status: "PAID", paypal_capture_id: "capture" });
      return { id: "capture", status: "COMPLETED" };
    },
  };
  return { ...h, release: h.loadRoute("release"), captures: () => captures, completions: () => completions };
}

test("webhook winning the capture race returns success without another capture", async () => {
  const h = releaseHarness();
  const response = await h.release();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reconciledByWebhook, true);
  assert.equal(h.captures(), 1);
  assert.equal(h.completions(), 1);
  assert.equal((await h.release()).status, 200);
  assert.equal(h.captures(), 1);
});

test("AI_REVIEW dispute blocks release before PayPal is contacted", async () => {
  const h = releaseHarness();
  h.tables.disputes.push({ milestone_id: "milestone", status: "AI_REVIEW" });
  assert.equal((await h.release()).status, 409);
  assert.equal(h.captures(), 0);
});

test("capture is never requested when the durable intent cannot be recorded", async () => {
  const h = releaseHarness(); h.failActivity();
  assert.equal((await h.release()).status, 500);
  assert.equal(h.captures(), 0);
  assert.ok(h.milestone.payment_release_locked_at);
});
