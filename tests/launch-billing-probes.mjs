import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {appHarness} from './launch-harness.mjs';
const h=appHarness(),{run,ctx,ls,store,timers}=h;
run(`sbUser={id:'billing-coach'}; sbRole=null; DB=newDB(); closeUpgradeModal=()=>{}; refreshCurrentScreen=()=>{}; __out.loads=0;
loadSubscription=async()=>{__out.loads++; sbSubscription={known:true,tier:__out.loads>=6?'pro':'trial',hasProAccess:true};};
window.location.search='?upgrade=success&session_id=cs_example';
`);
const poll=run('handlePostCheckoutReturn()');
await setImmediate();
assert.ok(run('checkoutPendingForUser()')); // existing trial must not resolve payment
for(let i=0;i<10;i++){ const t=timers.findIndex(x=>x.ms>=1000); if(t>=0) timers.splice(t,1)[0].fn(); await setImmediate(); }
await poll;
assert.ok(ctx.__out.loads>=6); assert.equal(run('checkoutPendingForUser()'),null);
assert.match(store.toast.textContent,/subscription is active/);
// A prolonged delay stays durable, offers retry, and blocks a new purchase.
run(`__out.loads=0; loadSubscription=async()=>{__out.loads++;sbSubscription={known:true,tier:'free',hasProAccess:false};};`);
const slow=run('handlePostCheckoutReturn()');
await setImmediate();
for(let i=0;i<12;i++){ const t=timers.findIndex(x=>x.ms>=1000); if(t>=0) timers.splice(t,1)[0].fn(); await setImmediate(); }
await slow;
assert.ok(ls.getItem('strideos_pending_upgrade_billing-coach'));
assert.match(store.tierBanner.innerHTML,/Check again/);
let fetchCalls=0;ctx.fetch=async()=>{fetchCalls++;return {ok:true,json:async()=>({url:'https://checkout.stripe.com/test'})};};
await run(`startCheckout('annual')`);assert.equal(fetchCalls,0);
// Refresh recovery: no query string, persisted pending marker still resumes.
run(`checkoutPending=null; window.location.search=''; loadSubscription=async()=>{sbSubscription={known:true,tier:'pro',hasProAccess:true};};`);
await run('handlePostCheckoutReturn()');assert.equal(run('checkoutPendingForUser()'),null);
// An unavailable subscription read does not truncate a paid coach's visible roster.
run(`DB.athletes=Array.from({length:8},(_,i)=>({id:i}));sbSubscription={known:false,tier:null,hasProAccess:false};`);
assert.equal(run('athletesForCurrentTier().length'),8);
run('renderTierBanner()');assert.match(store.tierBanner.innerHTML,/Plan status unavailable/);
// Existing subscription response routes to billing rather than another purchase.
run(`sbClient={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}}; strideTrack=()=>{}; __out.portal=0;openCustomerPortal=async()=>{__out.portal++;};`);
ctx.fetch=async()=>({ok:false,status:409,json:async()=>({error:'already_subscribed'})});
await run(`startCheckout('annual')`);assert.equal(ctx.__out.portal,1);
console.log('PASS billing: delayed activation, trial distinction, persistent recovery, duplicate click prevention, read failures and portal repair');
