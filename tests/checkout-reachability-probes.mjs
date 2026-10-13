// ══════════════════════════════════════════════════════════════════════════
// CHECKOUT REACHABILITY + BILLING RECOVERY PROBES (2026-08-19)
// ══════════════════════════════════════════════════════════════════════════
// Locks in the fixes for three defects found in the 2026-08-19 sell-readiness
// audit, all of which sat on the path between a coach and paying:
//
//   1. `.upgrade-overlay` centred an over-tall child inside a scroll container.
//      A flex container's centred child that exceeds the container puts its top
//      edge ABOVE the content box, where scrollTop cannot reach (scrollTop
//      cannot go negative). On a 667px iPhone the paywall's top ~223px —
//      including the Monthly plan button and the close X — was permanently
//      unreachable in Chrome, Safari and Firefox. The same backdrop class backs
//      eight dialogs, so all eight had it.
//   2. Escape was bound to nothing on those dialogs, so with the X off-screen
//      the only exit from checkout was a force-quit.
//   3. `stripe-webhook` demoted a `past_due` subscription to the free tier, and
//      the "Manage Subscription" button was gated on `isPro` — so one failed
//      card charge locked a mid-season coach out of their roster AND hid the
//      billing portal that would have fixed the card.
//
// SCOPE, honestly stated: 1 and 3 are asserted against the shipped source, which
// is where each bug lived — a regression must edit these exact declarations to
// reappear. These probes do NOT lay out a page; only a real browser at 375x553
// proves the modal is reachable. Case 4 runs actual code.
//
// Run: node tests/checkout-reachability-probes.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const webhook = fs.readFileSync(
  path.join(here, '..', 'supabase', 'functions', 'stripe-webhook', 'index.ts'),
  'utf8'
);

let n = 0;
const pass = (msg) => { n++; console.log(`  PASS ${n}: ${msg}`); };

const rule = (selector) => {
  // Matches the last declaration block for an exact selector at line start.
  const re = new RegExp(`^\\${selector}\\{([^}]*)\\}`, 'm');
  const m = html.match(re);
  assert.ok(m, `stylesheet rule for ${selector} not found — did the selector get renamed?`);
  return m[1];
};

// ── 1. The overlay must not re-create the flex-centering overflow trap ──────
{
  const overlay = rule('.upgrade-overlay');
  assert.ok(
    /align-items:\s*flex-start/.test(overlay),
    '.upgrade-overlay must use align-items:flex-start. align-items:center on a ' +
    'scrollable flex container makes an over-tall modal\'s top unreachable.'
  );
  assert.ok(
    !/align-items:\s*center/.test(overlay),
    '.upgrade-overlay must NOT use align-items:center — that is the exact bug.'
  );
  pass('.upgrade-overlay aligns to flex-start, not center');
}

// ── 2. The modal must be able to scroll its own overflow, and stay centred ──
{
  const modal = rule('.upgrade-modal');
  assert.ok(/max-height:/.test(modal), '.upgrade-modal needs a max-height or a tall modal overflows the viewport');
  assert.ok(/overflow-y:\s*auto/.test(modal), '.upgrade-modal needs overflow-y:auto so its own content scrolls');
  assert.ok(
    /margin:\s*auto 0/.test(modal),
    '.upgrade-modal needs margin:auto 0 to stay optically centred once the ' +
    'overlay aligns to flex-start (short modals must not jump to the top).'
  );
  pass('.upgrade-modal scrolls its own overflow and stays centred');
}

// ── 3. The close control must be reachable and finger-sized ─────────────────
{
  const close = rule('.upgrade-close');
  assert.ok(
    /position:\s*sticky/.test(close),
    '.upgrade-close must be sticky so it stays visible while the modal body scrolls'
  );
  const minW = close.match(/min-width:\s*([\d.]+)rem/);
  const minH = close.match(/min-height:\s*([\d.]+)rem/);
  assert.ok(minW && minH, '.upgrade-close needs an explicit min-width and min-height');
  // 2.75rem = 44px, the documented minimum touch target on iOS.
  assert.ok(parseFloat(minW[1]) >= 2.75, `.upgrade-close min-width ${minW[1]}rem is under the 2.75rem (44px) touch target`);
  assert.ok(parseFloat(minH[1]) >= 2.75, `.upgrade-close min-height ${minH[1]}rem is under the 2.75rem (44px) touch target`);
  pass('.upgrade-close is sticky and meets the 44px touch target');
}

// ── 4. Escape closes the topmost dialog, by running the real function ───────
{
  const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .sort((a, b) => b.length - a.length)[0];

  const src = main.match(/function closeTopmostOverlay\(\)\{[\s\S]*?\n\}/);
  assert.ok(src, 'closeTopmostOverlay() is gone — Escape no longer closes any dialog');

  // Two stacked overlays; Escape must close only the TOP one, and must do it by
  // invoking that dialog's own close button so its cleanup runs.
  const clicked = [];
  const mkOverlay = (name) => ({
    querySelector: (sel) => (sel === '.upgrade-close' ? { click: () => clicked.push(name) } : null),
    remove: () => clicked.push(`${name}:removed`),
  });
  const overlays = [mkOverlay('first'), mkOverlay('second')];
  const ctx = { document: { querySelectorAll: () => overlays } };
  vm.createContext(ctx);
  new vm.Script(`${src[0]}; __r = closeTopmostOverlay();`).runInContext(ctx);

  assert.equal(ctx.__r, true, 'closeTopmostOverlay() must report that it closed something');
  assert.deepEqual(clicked, ['second'], 'Escape must close the TOP dialog only, via its own close button');

  // No dialogs open: Escape must fall through so it still closes the mobile nav.
  const empty = { document: { querySelectorAll: () => [] } };
  vm.createContext(empty);
  new vm.Script(`${src[0]}; __r = closeTopmostOverlay();`).runInContext(empty);
  assert.equal(empty.__r, false, 'with no dialog open, Escape must fall through to the mobile nav');
  pass('Escape closes the topmost dialog via its own close handler, and falls through when none is open');
}

// ── 5. Escape is actually wired to that function at load ────────────────────
{
  assert.ok(
    /if\(closeTopmostOverlay\(\)\) return;/.test(html),
    'the load-time keydown handler no longer calls closeTopmostOverlay() — Escape is dead again'
  );
  pass('the document keydown handler routes Escape to closeTopmostOverlay()');
}

// ── 6. A past_due subscription keeps Pro ────────────────────────────────────
{
  const m = webhook.match(/const isPaying = ([^;]+);/);
  assert.ok(m, "stripe-webhook no longer computes isPaying — the tier mapping moved");
  const expr = m[1];
  assert.ok(
    /'past_due'/.test(expr),
    "stripe-webhook must treat 'past_due' as still paying. Stripe sets it on the " +
    'FIRST failed charge and then retries for days; demoting there locks a coach ' +
    "out of their roster over an expired card. Only 'unpaid' (dunning exhausted) " +
    'and subscription.deleted should cost access.'
  );
  assert.ok(!/'unpaid'/.test(expr), "'unpaid' is Stripe's terminal state and must NOT keep Pro");
  pass("stripe-webhook keeps Pro through past_due and revokes on unpaid");
}

// ── 7. A billing failure never hides the billing portal ─────────────────────
{
  assert.ok(
    /needsBillingRepair/.test(html),
    'the Manage Subscription button is gated on isPro alone again — a coach whose ' +
    'card failed cannot reach the portal that would update it'
  );
  const m = html.match(/const needsBillingRepair = (\[[^\]]*\])\.includes/);
  assert.ok(m, 'needsBillingRepair no longer tests a status list');
  for (const status of ['past_due', 'unpaid', 'canceled']) {
    assert.ok(m[1].includes(`'${status}'`), `${status} must still open the billing portal`);
  }
  pass('past_due / unpaid / canceled all still reach the billing portal');
}

console.log(`\nOK — ${n} checkout-reachability probes passed`);
