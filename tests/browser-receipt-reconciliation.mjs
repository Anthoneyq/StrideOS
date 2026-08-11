#!/usr/bin/env node
// Rendered-browser verification of the read-receipt and reconciliation
// contracts: the REAL page in headless Chrome, real DOM, real toast element,
// real inbox markup — with sbClient stubbed at the network seam so success,
// failure, and malformed-response paths are all exercised without a live
// Supabase project.
//
//   node tests/browser-receipt-reconciliation.mjs
//
// Dependency-free CDP driver (pattern from REAL's layout-qa.mjs).
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname, resolve, sep } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let checks = 0, failures = 0;
function check(label, ok, detail = "") {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${ok ? "" : `  ${detail}`}`);
}

// ── Tiny static server for the repo root ────────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!path.startsWith(ROOT + sep) && path !== ROOT) throw new Error("outside root");
    const file = path === ROOT ? join(ROOT, "index.html") : path;
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ── CDP plumbing ────────────────────────────────────────────────────────────
async function connect(userDataDir) {
  const port = 9333 + Math.floor(process.pid % 300);
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, "about:blank",
  ], { stdio: "ignore" });
  let page;
  for (let attempt = 0; attempt < 60 && !page; attempt += 1) {
    await wait(250);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    } catch {}
  }
  if (!page) { chrome.kill(); throw new Error("could not reach Chrome DevTools"); }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  const send = (method, params) => new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 1e9);
    const onMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id !== id) return;
      socket.removeEventListener("message", onMessage);
      data.error ? rej(new Error(`${method}: ${data.error.message}`)) : res(data.result);
    };
    socket.addEventListener("message", onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  return { chrome, send };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression: `(async () => { ${expression} })()`,
    returnByValue: true, awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "page threw");
  }
  return result.result.value;
}

const userDataDir = await mkdtemp(join(tmpdir(), "stride-cdp-"));
const { chrome, send } = await connect(userDataDir);

try {
  await send("Page.navigate", { url: `${BASE}/index.html` });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await wait(250);
    const ready = await evaluate(send, "return typeof markCoachMessageRead === 'function' && typeof saveWorkout === 'function' && !!document.getElementById('toast')");
    if (ready) break;
    if (attempt === 59) throw new Error("app functions never became available — page boot failed");
  }

  // Shared page fixtures: a synced published message, a stub inbox render
  // target, and no-op renderers so assertions read pure outcomes.
  await evaluate(send, `
    window.__msg = { id:'m1', clientRef:'ref-1', athleteId:'a1', coachId:'c1', subject:'Race notes',
      body:'Read before Saturday.', status:'published', publishedAt:'2026-08-09T10:00:00Z',
      readAt:null, updatedAt:'2026-08-09T10:00:00Z', cloudState:'synced' };
    // App timers/auth callbacks can reset globals between eval blocks, so every
    // scenario re-applies the fixture state immediately before acting.
    window.__fixture = () => {
      DB.coachMessages = [ {...__msg} ];
      onlineCoachState = { status:'ready', ownerId:'u1', checkIns:[], workouts:[], racePlans:[], messages:[{...__msg}], error:'' };
      A = { id:'a1', name:'Test Athlete', supabaseId:'a1' };
      sbUser = { id:'c1' };
      renderOnlineCoach = () => {};
    };
    __fixture();
    const host = document.createElement('div'); host.id = 'inbox-host'; document.body.appendChild(host);
    // Late async app callbacks (auth state, refreshActiveAthlete) can null A
    // between eval blocks — re-pin the athlete at render time, not just at
    // fixture time, so the render reflects the message state under test.
    window.__renderInbox = () => {
      A = { id:'a1', name:'Test Athlete', supabaseId:'a1' };
      host.innerHTML = athleteMessageInboxHTML(DB.coachMessages);
      return host.innerHTML;
    };
    return true;
  `);

  console.log("mark-read: failed RPC");
  const failedState = await evaluate(send, `
    __fixture();
    sbClient = { rpc: async () => ({ data: null, error: new Error('network down') }) };
    await markCoachMessageRead('m1');
    await new Promise(r => setTimeout(r, 50));
    const toastEl = document.getElementById('toast');
    return { toast: toastEl.textContent, shown: toastEl.classList.contains('show'),
             readAt: DB.coachMessages[0].readAt ?? null, inbox: __renderInbox() };
  `);
  check("failure toast is the distinct non-read state", /Could not record the read receipt/.test(failedState.toast) && failedState.shown, JSON.stringify(failedState.toast));
  check("no local read receipt was recorded", failedState.readAt === null, String(failedState.readAt));
  check("inbox still offers the Mark read button, no Read state", /Mark read<\/button>/.test(failedState.inbox) && !/message-state[^>]*>Read</.test(failedState.inbox), failedState.inbox.slice(0, 160));

  console.log("mark-read: malformed RPC success (no read_at)");
  const malformedState = await evaluate(send, `
    __fixture();
    sbClient = { rpc: async () => ({ data: { id: 'm1' }, error: null }) };
    await markCoachMessageRead('m1');
    return { toast: document.getElementById('toast').textContent, readAt: DB.coachMessages[0].readAt ?? null };
  `);
  check("malformed success is treated as failure", /Could not record the read receipt/.test(malformedState.toast), malformedState.toast);
  check("no synthetic receipt was minted", malformedState.readAt === null, String(malformedState.readAt));

  console.log("mark-read: successful RPC");
  const successState = await evaluate(send, `
    __fixture();
    sbClient = { rpc: async (name, args) => { window.__rpc = { name, args }; return { data: { ...__msg, read_at: '2026-08-09T11:22:33Z' }, error: null }; } };
    await markCoachMessageRead('m1');
    return { rpc: window.__rpc, readAt: DB.coachMessages[0].readAt ?? DB.coachMessages[0].read_at ?? null, inbox: __renderInbox() };
  `);
  check("RPC was called with the message id", successState.rpc?.name === "mark_coach_message_read" && successState.rpc?.args?.message_row_id === "m1", JSON.stringify(successState.rpc));
  check("the SERVER read_at was persisted verbatim", successState.readAt === "2026-08-09T11:22:33Z", String(successState.readAt));
  check("inbox row now shows the Read state, button gone", /message-state[^>]*>Read</.test(successState.inbox) && !/Mark read<\/button>/.test(successState.inbox), successState.inbox.slice(0, 160));

  // ── Linked plan editing through the real save path ────────────────────────
  console.log("linked plan: evidence edit is blocked client-side");
  await evaluate(send, `
    window.__plan = { id:'w-plan', athlete_id:'cloud-a1', coach_id:'c1', workout_date:'2026-08-08',
      workout_type:'easy', prescribed_distance_m:8000, prescribed_notes:'Easy 8k',
      total_distance_m:8100, total_duration_sec:2430, avg_pace_sec_per_km:300,
      avg_hr_bpm:null, max_hr_bpm:null, perceived_effort:null,
      completion_workout_id:'w-act', source:'coach_entry' };
    __fixture();
    workoutCache = { athleteId:'a1', items:[ {...__plan} ] };
    sbRole = 'coach'; sbLinkedAthlete = null;
    resolveAthleteCloudId = async () => 'cloud-a1';
    closeWorkoutForm = () => {}; loadWorkouts = async () => {};
    invalidateCoachBriefWorkouts = () => {}; renderWorkouts = () => {};
    const form = document.createElement('div');
    form.innerHTML = ['wfId','wfDate','wfType','wfPrescribedDist','wfPrescribedNotes','wfTotalDist','wfDuration','wfAvgHr','wfMaxHr','wfRpe','wfCoachNotes']
      .map(id => '<input id="' + id + '">').join('');
    document.body.appendChild(form);
    const set = (id, value) => { document.getElementById(id).value = value; };
    set('wfId','w-plan'); set('wfDate','2026-08-08'); set('wfType','easy');
    set('wfPrescribedDist','8000'); set('wfPrescribedNotes','Easy 8k');
    set('wfTotalDist','9999'); set('wfDuration','40:30'); set('wfAvgHr',''); set('wfMaxHr',''); set('wfRpe','');
    window.__updates = [];
    sbClient = { rpc: async () => ({ data:null, error:null }),
      from: () => ({ update: (row) => { __updates.push(row); return { eq: async () => ({ error:null }) }; },
                     insert: async (row) => { __updates.push(row); return { error:null }; } }) };
    await saveWorkout();
    return true;
  `);
  const blockedState = await evaluate(send, `
    return { toast: document.getElementById('toast').textContent, updates: window.__updates.length };
  `);
  check("evidence edit toasts undo-first", /undo the link in Reconcile/i.test(blockedState.toast), blockedState.toast);
  check("no update reached the server", blockedState.updates === 0, String(blockedState.updates));

  console.log("linked plan: prescription edit passes, evidence preserved");
  const allowedState = await evaluate(send, `
    __fixture();
    workoutCache = { athleteId:'a1', items:[ {...__plan} ] };
    sbRole = 'coach';
    document.getElementById('wfTotalDist').value = '8100';
    document.getElementById('wfDuration').value = '40:30';
    document.getElementById('wfPrescribedNotes').value = 'Easy 8k — HR low';
    await saveWorkout();
    return { updates: window.__updates, toast: document.getElementById('toast').textContent };
  `);
  check("prescription edit reached the server", allowedState.updates.length === 1, JSON.stringify(allowedState.updates.length));
  const sent = allowedState.updates[0] ?? {};
  check("completion evidence fields preserved verbatim", sent.total_distance_m === 8100 && sent.total_duration_sec === 2430 && sent.avg_pace_sec_per_km === 300, JSON.stringify({ d: sent.total_distance_m, t: sent.total_duration_sec, p: sent.avg_pace_sec_per_km }));
  check("prescription change was included", sent.prescribed_notes === "Easy 8k — HR low", String(sent.prescribed_notes));

  console.log("reconciliation undo: success and failure via the real handler");
  const undoState = await evaluate(send, `
    window.__rpc = null; window.__refreshed = null;
    refreshAfterActivityReconciliation = async (message) => { window.__refreshed = message; };
    sbClient = { rpc: async (name, args) => { window.__rpc = { name, args }; return { data:null, error:null }; } };
    await undoActivityReconciliation('w-act');
    const okRun = { rpc: window.__rpc, refreshed: window.__refreshed };
    sbClient = { rpc: async () => ({ data:null, error: new Error('undo rejected by server') }) };
    await undoActivityReconciliation('w-act');
    return { okRun, failToast: document.getElementById('toast').textContent };
  `);
  check("undo calls the undo RPC with the activity id", undoState.okRun.rpc?.name === "undo_workout_reconciliation" && undoState.okRun.rpc?.args?.activity_workout_id === "w-act", JSON.stringify(undoState.okRun.rpc));
  check("undo success reports returned-to-review", undoState.okRun.refreshed === "Activity returned to review", String(undoState.okRun.refreshed));
  check("undo failure surfaces the server error", /undo rejected by server/.test(undoState.failToast), undoState.failToast);
} finally {
  chrome.kill();
  server.close();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}

console.log(`\nbrowser receipt/reconciliation: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
