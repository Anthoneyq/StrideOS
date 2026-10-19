// StrideOS local end-to-end journey test — LOCAL Supabase stack only, never production.
//
// Covers: anonymous landing + pricing, signup -> 30-day trial, saving athletes,
// reload + second-device sync, failed-connection outbox recovery, self-upgrade and
// cross-account denials, trial expiry -> Free limits, failed checkout (no false Pro),
// data export, account deletion.
//
// Setup (see Release 2026-10-19/QA notes in the vault):
//   1. Copy supabase/ to a scratch dir, give config.toml a unique project_id and ports
//      (api 54731, db 54732), set enable_confirmations=false and smtp enabled=false,
//      then: supabase start -x studio,storage-api,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
//   2. supabase status -o json > $SB_STATUS
//   3. node scripts/build-static.mjs; copy dist/ to a scratch dir, point its
//      stride-config.js at http://127.0.0.1:54731 with the local anon key, serve it on $APP_URL.
//   4. PLAYWRIGHT_FROM=<dir with node_modules/playwright> CHROMIUM_PATH=<bundled chromium> \
//      SB_STATUS=... APP_URL=... node tests/e2e/local-journey.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const require = createRequire((process.env.PLAYWRIGHT_FROM || process.cwd()) + '/package.json');
const { chromium } = require('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:8917/';
const API = 'http://127.0.0.1:54731';
const OUT = process.env.OUT || 'tests/tmp/e2e-out';
fs.mkdirSync(OUT, { recursive: true });
const status = JSON.parse(fs.readFileSync(process.env.SB_STATUS, 'utf8'));
const ANON = status.ANON_KEY;
const sql = (q) => execFileSync('psql', [(process.env.LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54732/postgres'), '-At', '-c', q], { encoding: 'utf8' }).trim();

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const stamp = Date.now();
const emailA = `coach-a-${stamp}@example.test`;
const emailB = `coach-b-${stamp}@example.test`;
const PW = 'test-pass-123';

async function newCtx(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  await ctx.route(/facebook|fbq|google-analytics|googletagmanager/, r => r.abort());
  ctx.on('page', p => wire(p));
  return ctx;
}
const consoleErrors = [];
function wire(p) {
  p.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(`console: ${m.text().slice(0, 200)}`); });
  p.on('dialog', d => d.accept());
}
async function lastToast(page) { return page.evaluate(() => { const t = document.querySelector('.toast, #toast'); return t ? t.textContent : ''; }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function signUp(page, email) {
  await page.evaluate(() => showAuthModal('signup'));
  await sleep(400);
  await page.fill('#authEmail', email);
  await page.fill('#authPassword', PW);
  const consent = await page.$('#authLegalConsent');
  if (consent) await consent.check();
  await page.click('#authPrimaryBtn');
  await page.waitForFunction(() => window.sbUser || (typeof sbUser !== 'undefined' && sbUser), null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => typeof sbUser !== 'undefined' && sbUser && sbUser.id, null, { timeout: 15000 }).catch(() => {});
  await sleep(2500);
}
async function signIn(page, email) {
  await page.evaluate(() => showAuthModal('signin'));
  await sleep(400);
  await page.fill('#authEmail', email);
  await page.fill('#authPassword', PW);
  await page.click('#authPrimaryBtn');
  await sleep(3000);
}
async function addAthlete(page, a) {
  await page.evaluate(() => startNewAthlete());
  await sleep(500);
  await page.fill('#fName', a.name);
  await page.selectOption('#fPrimary', a.primary);
  await page.selectOption('#fRDist', a.dist);
  await page.fill('#fRTime', a.time);
  if (a.date) await page.fill('#fRDate', a.date);
  if (a.tage) await page.fill('#fTAge', String(a.tage));
  await page.evaluate(() => saveAthlete());
  await sleep(1500);
}
const names = page => page.evaluate(() => (DB.athletes || []).map(a => a.name).sort());

// ---------- A. anonymous landing ----------
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/01-landing-desktop.png` });
  await page.screenshot({ path: `${OUT}/01b-landing-desktop-full.png`, fullPage: true });
  const hasPricing = await page.evaluate(() => /\$19\.99/.test(document.body.innerText) && /\$199/.test(document.body.innerText));
  check('anon landing shows Pro monthly + annual prices', hasPricing);
  await ctx.close();
  const m = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  await mp.goto(APP, { waitUntil: 'networkidle' });
  await mp.screenshot({ path: `${OUT}/02-landing-mobile.png` });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile landing has no horizontal overflow', overflow <= 1, `overflow ${overflow}px`);
  await m.close();
}

// ---------- B/C. sign up coach A, trial, add athletes ----------
const ctxA = await newCtx();
const pageA = await ctxA.newPage();
await pageA.goto(APP, { waitUntil: 'networkidle' });
await signUp(pageA, emailA);
const userA = await pageA.evaluate(() => sbUser && sbUser.id);
check('coach A signup creates a session', !!userA);
const tierA = sql(`select subscription_tier||'|'||coalesce(round(extract(epoch from trial_ends_at-now())/86400)::text,'null') from public.coaches where id='${userA}'`);
check('new coach gets a 30-day trial row', /^trial\|(29|30)$/.test(tierA), tierA);
check('trial coach has Pro access in the app', await pageA.evaluate(() => hasProAccess()));
await pageA.screenshot({ path: `${OUT}/03-signed-in-trial.png` });

const roster = [
  { name: 'Avery Lane', primary: '5K', dist: '5K', time: '17:45', date: '2026-09-20', tage: 3 },
  { name: 'Blake Ortiz', primary: '5K', dist: '5K', time: '18:30', date: '2026-09-20', tage: 2 },
  { name: 'Casey Moore', primary: '1600m', dist: '1600m', time: '5:05', date: '2026-04-12', tage: 4 },
  { name: 'Devon Price', primary: '3200m', dist: '3200m', time: '10:40', date: '2025-04-30' },
];
for (const a of roster) await addAthlete(pageA, a);
check('four athletes in app state', (await names(pageA)).length === 4, (await names(pageA)).join(', '));
const dbCount = sql(`select count(*) from public.athletes where coach_id='${userA}' and deleted_at is null`);
check('four athletes saved to the database', dbCount === '4', `db=${dbCount}`);

// ---------- D. persistence across reload and second device ----------
await pageA.reload({ waitUntil: 'networkidle' });
await sleep(3000);
check('roster survives reload', (await names(pageA)).length === 4);
const ctxA2 = await newCtx();
const pageA2 = await ctxA2.newPage();
await pageA2.goto(APP, { waitUntil: 'networkidle' });
await signIn(pageA2, emailA);
await sleep(2000);
check('roster loads on a second device (fresh browser)', (await names(pageA2)).length === 4, (await names(pageA2)).join(', '));

// ---------- E. offline edit -> outbox -> recovery ----------
await ctxA.route(`${API}/rest/v1/**`, r => r.abort('internetdisconnected'));
await addAthlete(pageA, { name: 'Emery Offline', primary: '800m', dist: '800m', time: '2:10', date: '2026-05-01' });
const offToast = await lastToast(pageA);
const pending = await pageA.evaluate(() => Object.keys(DB.pendingAthleteSync || {}));
check('offline save keeps athlete locally and flags pending sync', (await names(pageA)).includes('Emery Offline') && pending.length > 0, `toast="${offToast}" keys=${pending.join(',')}`);
await pageA.reload({ waitUntil: 'domcontentloaded' });
await sleep(4000);
const offState = await pageA.evaluate(() => ({ user: !!sbUser, ready: typeof sbCoachReady!=='undefined' && sbCoachReady, n: (DB.athletes||[]).length, pending: Object.keys(DB.pendingAthleteSync||{}).length, keys: Object.keys(localStorage).join(','), fb: (document.querySelector('.auth-feedback')||{}).textContent, banner: (document.getElementById('syncStatus')||{}).textContent }));
await pageA.screenshot({ path: `${OUT}/07-offline-reload.png` });
await sleep(0);
check('pending athlete survives reload while still offline', (await names(pageA)).includes('Emery Offline'), JSON.stringify(offState));
await ctxA.unroute(`${API}/rest/v1/**`);
await pageA.reload({ waitUntil: 'networkidle' });
await sleep(5000);
const dbOffline = sql(`select count(*) from public.athletes where coach_id='${userA}' and display_name='Emery Offline' and deleted_at is null`);
check('pending athlete reaches the database once after reconnect', dbOffline === '1', `rows=${dbOffline}`);
await pageA2.reload({ waitUntil: 'networkidle' });
await sleep(3500);
check('second device sees the recovered athlete', (await names(pageA2)).includes('Emery Offline'));

// ---------- F. account boundaries through the public API ----------
const tokenA = await pageA.evaluate(async () => (await sbClient.auth.getSession()).data.session.access_token);
const rest = async (path, method, token, body, extra = {}) => {
  const r = await fetch(`${API}/rest/v1/${path}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...extra }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const up = await rest(`coaches?id=eq.${userA}`, 'PATCH', tokenA, { subscription_tier: 'pro', subscription_status: 'active' });
const tierAfter = sql(`select subscription_tier from public.coaches where id='${userA}'`);
check('coach cannot self-upgrade to Pro through the API', tierAfter === 'trial', `http ${up.status}, tier=${tierAfter}`);
const ctxB = await newCtx();
const pageB = await ctxB.newPage();
await pageB.goto(APP, { waitUntil: 'networkidle' });
await signUp(pageB, emailB);
const tokenB = await pageB.evaluate(async () => (await sbClient.auth.getSession()).data.session.access_token);
const readB = await rest(`athletes?coach_id=eq.${userA}&select=id,display_name`, 'GET', tokenB);
check('coach B cannot read coach A athletes', Array.isArray(readB.body) && readB.body.length === 0, `http ${readB.status}, rows=${Array.isArray(readB.body) ? readB.body.length : JSON.stringify(readB.body)}`);
const aId = sql(`select id from public.athletes where coach_id='${userA}' and display_name='Avery Lane'`);
const editB = await rest(`athletes?id=eq.${aId}`, 'PATCH', tokenB, { display_name: 'hijacked' });
const nameNow = sql(`select display_name from public.athletes where id='${aId}'`);
check('coach B cannot edit coach A athlete', nameNow === 'Avery Lane', `http ${editB.status}`);
check('coach B sees an empty roster', (await names(pageB)).length === 0);

// ---------- G. trial ends -> free boundary ----------
sql(`update public.coaches set subscription_tier='free', trial_ends_at=now()-interval '1 day' where id='${userA}'`);
await pageA.reload({ waitUntil: 'networkidle' });
await sleep(3500);
check('expired trial loses Pro access', !(await pageA.evaluate(() => hasProAccess())));
const visible = await pageA.evaluate(() => (typeof athleteLimit === 'function') ? athleteLimit() : null);
check('free plan limit is 3 athletes', visible === 3, `limit=${visible}`);
await pageA.evaluate(() => goTo('overview', null));
await sleep(800);
await pageA.screenshot({ path: `${OUT}/04-free-plan-banner.png` });
const bannerTxt = await pageA.evaluate(() => (document.querySelector('.tier-banner') || {}).textContent || '');
check('free banner explains the plan', /Free plan|trial has ended/i.test(bannerTxt), bannerTxt.replace(/\s+/g, ' ').slice(0, 140));
await pageA.evaluate(() => startNewAthlete());
await sleep(800);
const modalOpen = await pageA.evaluate(() => !!document.getElementById('upgradeOverlay'));
check('adding a 6th athlete on Free opens the upgrade modal', modalOpen);
await pageA.screenshot({ path: `${OUT}/05-upgrade-modal.png` });
const stillInDb = sql(`select count(*) from public.athletes where coach_id='${userA}' and deleted_at is null`);
check('downgrade keeps all saved athletes in the database', stillInDb === '5', `db=${stillInDb}`);

// ---------- H. checkout without a backend function: no false activation ----------
await pageA.evaluate(() => startCheckout('monthly'));
await sleep(4000);
const falsePro = await pageA.evaluate(() => hasProAccess());
const tierAfterCheckout = sql(`select subscription_tier from public.coaches where id='${userA}'`);
check('failed checkout does not grant Pro', !falsePro && tierAfterCheckout === 'free', `toast="${await lastToast(pageA)}"`);
await pageA.evaluate(() => closeUpgradeModal && closeUpgradeModal());

// ---------- I. export and deletion (coach B disposable) ----------
const exp = await pageB.evaluate(async () => { const r = await sbClient.rpc('export_coach_data'); return { err: r.error && r.error.message, keys: r.data ? Object.keys(r.data) : [] }; });
check('data export RPC returns a JSON bundle', !exp.err && exp.keys.length > 0, exp.err || exp.keys.join(','));
await addAthlete(pageB, { name: 'Zed Delete', primary: '1600m', dist: '1600m', time: '5:30', date: '2026-05-01' });
const userB = await pageB.evaluate(() => sbUser.id);
await pageB.evaluate(() => showPrivacyModal());
await sleep(500);
await pageB.screenshot({ path: `${OUT}/06-data-privacy.png` });
await pageB.fill('#privDeleteConfirm', 'DELETE');
await pageB.evaluate(() => requestAccountDeletion());
await sleep(4000);
const delState = sql(`select (select deleted_at is not null from public.coaches where id='${userB}')::text || '|' || (select count(*) from public.athletes where coach_id='${userB}' and deleted_at is null)`);
const signedOut = await pageB.evaluate(() => !sbUser);
check('account deletion soft-deletes coach + athletes and signs out', delState === 'true|0' && signedOut, `state=${delState} signedOut=${signedOut}`);

const errs = consoleErrors.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|internetdisconnected|net::ERR|functions\/v1|503|cloud save failed|sync/i.test(e));
check('no unexpected page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, consoleErrors }, null, 2));
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
