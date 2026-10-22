import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { inspectRecoveryOrder, validateCompletedCapture, usdCents } from "../lib/payment/reconciliation.ts";

const expectation = () => ({ orderId: "ORDER", authorizationId: "AUTH", captureId: null, amount: "500.00", currency: "USD" });
const orderFixture = () => ({ id: "ORDER", intent: "AUTHORIZE", purchaseUnits: [{ amount: { currencyCode: "USD", value: "500.00" }, payee: { merchantId: "MERCHANT" }, payments: { authorizations: [{ id: "AUTH", amount: { currencyCode: "USD", value: "500.00" } }], captures: [{ id: "CAPTURE" }] } }] });
const captureFixture = () => ({ id: "CAPTURE", status: "COMPLETED", amount: { currencyCode: "USD", value: "500.00" }, payee: { merchantId: "MERCHANT" }, supplementaryData: { relatedIds: { orderId: "ORDER", authorizationId: "AUTH" } } });

test("money comparisons do not round unsupported fractions", () => {
  assert.equal(usdCents("0.29"), BigInt(29));
  assert.equal(usdCents("500"), BigInt(50000));
  for (const invalid of ["0", "-2.00", "1.001", "NaN", "1e3"]) assert.equal(usdCents(invalid), null);
});
test("matching full payment evidence is accepted", () => {
  assert.equal(inspectRecoveryOrder(expectation(), orderFixture()).captureId, "CAPTURE");
  assert.doesNotThrow(() => validateCompletedCapture(expectation(), "AUTH", "MERCHANT", "CAPTURE", captureFixture()));
});
for (const [name, mutate] of [
  ["wrong order", (o) => { o.id = "OTHER"; }],
  ["wrong amount", (o) => { o.purchaseUnits[0].amount.value = "5.00"; }],
  ["wrong currency", (o) => { o.purchaseUnits[0].amount.currencyCode = "EUR"; }],
  ["wrong authorization", (o) => { o.purchaseUnits[0].payments.authorizations[0].id = "OTHER"; }],
  ["multiple captures", (o) => { o.purchaseUnits[0].payments.captures.push({ id: "SECOND" }); }],
  ["refund", (o) => { o.purchaseUnits[0].payments.refunds = [{ id: "REFUND" }]; }],
]) test(`blocks order evidence with ${name}`, () => { const order = orderFixture(); mutate(order); assert.throws(() => inspectRecoveryOrder(expectation(), order)); });
for (const [name, mutate] of [
  ["pending capture", (c) => { c.status = "PENDING"; }],
  ["refunded capture", (c) => { c.status = "REFUNDED"; }],
  ["partial amount", (c) => { c.amount.value = "100.00"; }],
  ["wrong merchant", (c) => { c.payee.merchantId = "OTHER"; }],
  ["missing identifiers", (c) => { delete c.supplementaryData; }],
  ["wrong authorization", (c) => { c.supplementaryData.relatedIds.authorizationId = "OTHER"; }],
]) test(`blocks ${name}`, () => { const capture = captureFixture(); mutate(capture); assert.throws(() => validateCompletedCapture(expectation(), "AUTH", "MERCHANT", "CAPTURE", capture)); });

function routeHarness({ authorized = true, signedIn = true, capture = true, captureStatus = "COMPLETED", expiresAt = "2099-01-01T00:00:00Z" } = {}) {
  const milestone = { id: "milestone", project_id: "project", amount: "500.00", status: "APPROVED", paypal_order_id: "ORDER", paypal_authorization_id: "AUTH", paypal_capture_id: null, payment_release_locked_at: "original-lock" };
  const tables = { milestones: [milestone], projects: authorized ? [{ id: "project", currency: "USD", created_by: "owner" }] : [], activity_events: [] };
  const calls = [];
  function from(table) {
    const filters = []; let values, action = "select";
    const q = { select: () => q, order: () => q, limit: () => q,
      eq(key, value) { filters.push(row => row[key] === value); return q; },
      is(key, value) { filters.push(row => (row[key] ?? null) === value); return q; },
      update(input) { action = "update"; values = input; return q; },
      insert(input) { action = "insert"; values = input; return q; },
      maybeSingle: () => exec(true), then: (ok, fail) => exec(false).then(ok, fail) };
    async function exec(single) {
      if (action === "insert") { tables[table].push(values); return { error: null }; }
      const rows = tables[table].filter(row => filters.every(f => f(row)));
      if (action === "update") rows.forEach(row => Object.assign(row, values));
      return { data: single ? rows[0] ? { ...rows[0] } : null : rows.map(row => ({ ...row })), error: null };
    }
    return q;
  }
  const db = { from, auth: { getUser: async () => ({ data: { user: signedIn ? { id: "owner" } : null } }) } };
  const deps = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/supabase/server": { createClient: async () => db }, "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/payment/reconciliation": { inspectRecoveryOrder, validateCompletedCapture, usdCents },
    "@/lib/payment/complete-project": { completeProjectIfPaid: async () => true },
    "@/lib/paypal/orders": {
      getPayPalOrder: async () => { calls.push("GET order"); const order = orderFixture(); if (!capture) order.purchaseUnits[0].payments.captures = []; return order; },
      getPayPalCapture: async () => { calls.push("GET capture"); return { ...captureFixture(), status: captureStatus }; },
      getPayPalAuthorization: async () => { calls.push("GET authorization"); return { id: "AUTH", status: "CREATED", expirationTime: expiresAt, amount: { currencyCode: "USD", value: "500.00" } }; },
      captureAuthorizedPayPalPayment: async () => { throw new Error("Reconciliation must never capture"); },
    },
  };
  const exports = {};
  const source = readFileSync(new URL("../app/api/milestone/[milestoneId]/reconcile/route.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (!deps[name]) throw new Error(name); return deps[name]; }, console: { error() {} }, Response });
  return { milestone, calls, run: () => exports.POST(new Request("http://localhost/reconcile", { method: "POST" }), { params: Promise.resolve({ milestoneId: "milestone" }) }) };
}
test("recovery updates an existing completed payment and never clears a lock", async () => {
  const h = routeHarness(); assert.equal((await h.run()).status, 200);
  assert.equal(h.milestone.status, "PAID"); assert.equal(h.milestone.paypal_capture_id, "CAPTURE");
  assert.equal(h.milestone.payment_release_locked_at, "original-lock");
  assert.deepEqual(h.calls, ["GET order", "GET capture"]);
});
test("an uncertain payment stays locked without a capture call", async () => {
  const h = routeHarness({ capture: false }); const response = await h.run();
  assert.equal(response.status, 200); assert.equal((await response.json()).reconciled, false);
  assert.equal(h.milestone.status, "APPROVED"); assert.equal(h.milestone.payment_release_locked_at, "original-lock");
  assert.deepEqual(h.calls, ["GET order", "GET authorization"]);
});
test("pending capture cannot mark a milestone as paid", async () => {
  const h = routeHarness({ captureStatus: "PENDING" }); assert.equal((await h.run()).status, 409);
  assert.equal(h.milestone.status, "APPROVED"); assert.equal(h.milestone.paypal_capture_id, null);
});
test("another user's payment cannot be inspected", async () => {
  const h = routeHarness({ authorized: false }); assert.equal((await h.run()).status, 403); assert.equal(h.calls.length, 0);
});
test("signed-out requests do not reach PayPal", async () => {
  const h = routeHarness({ signedIn: false }); assert.equal((await h.run()).status, 401); assert.equal(h.calls.length, 0);
});
test("an interrupted authorization can be restored without creating a payment", async () => {
  const h = routeHarness({ capture: false });
  Object.assign(h.milestone, { status: "PENDING", paypal_authorization_id: null, payment_release_locked_at: null });
  assert.equal((await h.run()).status, 200);
  assert.equal(h.milestone.status, "FUNDED"); assert.equal(h.milestone.paypal_authorization_id, "AUTH");
  assert.deepEqual(h.calls, ["GET order", "GET authorization"]);
});
test("expired authorizations are never restored or unlocked", async () => {
  const h = routeHarness({ capture: false, expiresAt: "2000-01-01T00:00:00Z" });
  const response = await h.run(); assert.equal((await response.json()).state, "REVIEW_REQUIRED");
  assert.equal(h.milestone.status, "APPROVED"); assert.equal(h.milestone.payment_release_locked_at, "original-lock");
});
