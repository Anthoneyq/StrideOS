// Decision-linked coach message behavioral and policy probes.
// Run: node tests/coach-messages-probes.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260807142000_coach_messages.sql'),'utf8');
let passed=0;
const ok=(value,message)=>{assert.ok(value,message);passed++;};
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);passed++;};

function extractBlock(source,startIdx){
  let depth=0;
  for(let index=startIdx;index<source.length;index++){
    if(source[index]==='{') depth++;
    else if(source[index]==='}'){
      depth--;
      if(depth===0) return source.slice(startIdx,index+1);
    }
  }
  throw new Error('unbalanced function block');
}

function extractFn(name){
  const at=html.indexOf(`function ${name}(`);
  ok(at>=0,`${name} must exist`);
  const signatureEnd=html.indexOf(')',at);
  const body=html.indexOf('{',signatureEnd);
  return html.slice(at,body)+extractBlock(html,body);
}

const engine=new Function([
  extractFn('localIsoDate'),
  extractFn('normalizeCoachMessage'),
  extractFn('mergeCoachMessages'),
  'return {normalizeCoachMessage,mergeCoachMessages};'
].join('\n'))();

const draft=engine.normalizeCoachMessage({
  id:'m1',client_ref:'client-1',athlete_id:'a1',coach_id:'c1',subject:'  Change  ',body:'  Keep this easy.  ',status:'draft'
});
eq(draft.status,'draft','draft status changed');
eq(draft.publishedAt,null,'draft fabricated a publication time');
eq(draft.subject,'Change','subject was not normalized');
eq(draft.body,'Keep this easy.','body was not normalized');
eq(draft.cloudState,'synced','remote snake-case row should be recognized as synced');

const published=engine.normalizeCoachMessage({
  id:'m2',athleteId:'a1',subject:'Workout',body:'Run by feel.',status:'published',publishedAt:'2026-08-07T12:00:00Z',readAt:null,cloudState:'synced',contextType:'workout',contextDate:'2026-08-08'
});
eq(published.status,'published','published status changed');
eq(published.publishedAt,'2026-08-07T12:00:00Z','publication evidence changed');
eq(published.readAt,null,'unopened message was marked read');
eq(published.contextType,'workout','workout context was lost');
eq(published.contextDate,'2026-08-08','context date was lost');

const invalid=engine.normalizeCoachMessage({subject:'x',body:'y',status:'delivered',readAt:'2026-08-07T12:00:00Z'});
eq(invalid.status,'draft','unsupported delivery status must degrade to draft');
eq(invalid.publishedAt,null,'unsupported delivery state fabricated publication');

const merged=engine.mergeCoachMessages(
  [{id:'local',clientRef:'same',subject:'Offline edit',body:'new',status:'published',updatedAt:'2026-08-07T13:00:00Z',cloudState:'device_only'}],
  [{id:'remote',client_ref:'same',coach_id:'c1',subject:'Old synced copy',body:'old',status:'published',published_at:'2026-08-07T11:00:00Z',updated_at:'2026-08-07T12:00:00Z'}]
);
eq(merged.length,1,'local and remote versions were duplicated');
eq(merged[0].subject,'Offline edit','newer device-only edit was hidden by stale cloud data');
eq(merged[0].cloudState,'device_only','offline edit falsely remained synced');

ok(/Publishing makes this available inside the athlete’s STRIDE portal\. It does not mean email, SMS, push notification, or guaranteed delivery\./.test(html),'composer lacks explicit delivery boundary');
ok(/Published means available in the athlete portal—not email, SMS, push, or guaranteed delivery\./.test(html),'coach message center lacks delivery boundary');
ok(/Saved on this device only — not available to the athlete/.test(html),'cloud failure does not prevent a false publish claim');
ok(/message\.status==='published'&&message\.cloudState==='synced'/.test(html),'athlete inbox can expose device-only or draft messages');
ok(/markCoachMessageRead/.test(html),'athlete cannot explicitly acknowledge a message');
ok(/team-calendar-entry-action[\s\S]{0,300}openCoachMessageComposer[\s\S]{0,200}encodeURIComponent\(contextRef\)/.test(html),'calendar entries do not link to coach messages');
ok(/coach_messages/.test(html),'message center never reads or writes its cloud table');

ok(/create table if not exists public\.coach_messages/.test(migration),'coach_messages table missing');
ok(/status in \('draft','published'\)/.test(migration),'database accepts invented delivery states');
ok(/status = 'published'\s+and exists[\s\S]*a\.athlete_user_id = auth\.uid\(\)/.test(migration),'athlete read policy is not limited to own published messages');
ok(/Coaches delete own drafts/.test(migration),'published messages can be hard-deleted through the coach policy');
ok(/guard_coach_message_read_receipt/.test(migration)&&/new\.read_at := null/.test(migration),'coach edits do not invalidate the old read receipt');
ok(/if tg_op = 'INSERT' then\s+new\.read_at := null/.test(migration),'a coach INSERT can arrive pre-read');
ok(/before insert or update on public\.coach_messages/.test(migration),'the read-receipt guard does not run on INSERT');
ok(/and read_at is null/.test(migration),'the insert policy accepts a forged read_at');
ok(/\(new\.athlete_id,new\.subject/.test(migration)&&/\(old\.athlete_id,old\.subject/.test(migration),'reassigning a message to another athlete preserves the old receipt');
ok(/only the linked athlete can mark a published message read/.test(migration),'read receipts are not athlete-controlled');
ok(/security definer[\s\S]*mark_coach_message_read/.test(migration)||/mark_coach_message_read[\s\S]*security definer/.test(migration),'read receipt RPC is not security definer');
ok(/revoke execute on function public\.mark_coach_message_read\(uuid\) from public/.test(migration),'read receipt RPC remains public');
ok(/delete from public\.coach_messages where coach_id = uid/.test(migration),'account deletion omits coach messages');
ok(/delete from public\.training_plan_templates where coach_id = uid/.test(migration),'account deletion omits online coaching templates');
ok(/'coach_messages'[\s\S]*from public\.coach_messages cm where cm\.coach_id = auth\.uid\(\)/.test(migration),'account export omits coach messages');
ok(/'athlete_checkins'[\s\S]*'training_plan_templates'[\s\S]*'race_plans'/.test(migration),'account export omits Online Coach OS records');
ok(/coach messages, plans &amp; predictions/.test(html),'privacy UI does not disclose the expanded export');
ok(/if\(onlineCoachState\.status==='idle'\|\|onlineCoachState\.ownerId!==sbUser\.id\) loadOnlineCoachState\(false\)/.test(html),'athlete inbox never loads remote coach messages');
ok(/this is not proof that your coach has not published a message/.test(html),'athlete cloud failure becomes a false empty inbox');

// A read receipt is persisted only AFTER mark_coach_message_read succeeds:
// the RPC call must appear before the local write, and the failure path must
// return before any local readAt mutation.
const markReadSource=extractFn('markCoachMessageRead');
const rpcAt=markReadSource.indexOf("rpc('mark_coach_message_read'");
const localWriteAt=markReadSource.indexOf('DB.coachMessages.push(updated)');
ok(rpcAt>=0&&localWriteAt>=0&&rpcAt<localWriteAt,'read receipt is persisted locally before the RPC succeeds');
ok(!/new Date\(\)\.toISOString\(\)/.test(markReadSource),'a locally fabricated timestamp can stand in for the server receipt');
ok(/cloudState!=='synced'\)\{\s*toast\('Read receipts need cloud sync/.test(markReadSource),'device-only messages can fake a cloud read receipt');

// Executable mocked RPC scenarios: the receipt must be exactly the server's,
// and BOTH failure shapes (error, malformed success) must leave the message
// unread with the distinct failure toast.
async function runMarkRead(rpcResult){
  const message={id:'m9',clientRef:'ref-9',athleteId:'a1',coachId:'c1',subject:'S',body:'B',status:'published',publishedAt:'2026-08-09T10:00:00Z',readAt:null,updatedAt:'2026-08-09T10:00:00Z',cloudState:'synced'};
  const ctx={
    DB:{coachMessages:[{...message}]},
    saves:0,toasts:[],renders:0,rpcCalls:[],
  };
  const harness=new Function('DB','saveDB','toast','renderOnlineCoach','onlineCoachState','onlineCoachRows','sbClient','decodeURIComponent',[
    extractFn('localIsoDate'),
    extractFn('normalizeCoachMessage'),
    extractFn('markCoachMessageRead').replace(/^function/,'async function'),
    'return markCoachMessageRead;'
  ].join('\n'))(
    ctx.DB,
    ()=>{ctx.saves++;},
    (text)=>{ctx.toasts.push(String(text));},
    ()=>{ctx.renders++;},
    {messages:[{...message}]},
    ()=>({messages:[{...message}]}),
    {rpc:async(name,args)=>{ctx.rpcCalls.push({name,args});return rpcResult;}},
    decodeURIComponent
  );
  await harness('m9');
  ctx.stored=ctx.DB.coachMessages.map(row=>row.readAt??row.read_at??null);
  return ctx;
}

const successCtx=await runMarkRead({data:{read_at:'2026-08-09T11:22:33Z'},error:null});
eq(successCtx.rpcCalls[0].name,'mark_coach_message_read','success path skipped the RPC');
ok(successCtx.stored.some(readAt=>readAt==='2026-08-09T11:22:33Z'),'successful RPC did not persist the SERVER read_at verbatim');
ok(!successCtx.toasts.some(text=>/Could not record/.test(text)),'successful RPC surfaced a failure toast');

const errorCtx=await runMarkRead({data:null,error:new Error('boom')});
ok(errorCtx.stored.every(readAt=>readAt==null),'failed RPC still recorded a local read receipt');
ok(errorCtx.toasts.some(text=>/Could not record the read receipt/.test(text)),'failed RPC lacks the distinct failure state');

const malformedCtx=await runMarkRead({data:{id:'m9'},error:null});
ok(malformedCtx.stored.every(readAt=>readAt==null),'malformed RPC success minted a synthetic read receipt');
ok(malformedCtx.toasts.some(text=>/Could not record the read receipt/.test(text)),'malformed RPC success lacks the failure state');

console.log(`coach message probes ok — ${passed} assertions`);
