import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const code=stripTypeScriptTypes(source);
function fixture(){
 const state={coach:{id:'coach',email:'synthetic@example.invalid',stripe_customer_id:'cus_owned'},subs:[],sessions:[],created:0,customers:0,locked:null,profileError:false,saveError:false,loseResponse:false};
 const iter=a=>({async *[Symbol.asyncIterator](){yield* a;}});
 const stripe={subscriptions:{list:()=>iter([...state.subs])},customers:{create:async(_data,opts)=>{assert.ok(opts.idempotencyKey);state.customers++;return {id:'cus_created'};}},checkout:{sessions:{
  list:()=>iter(state.sessions.filter(x=>x.status==='open')),
  expire:async id=>{state.sessions.find(x=>x.id===id).status='expired';},
  create:async(data,opts)=>{assert.ok(opts.idempotencyKey);const id='cs_'+(++state.created),session={...data,id,url:'https://checkout.stripe.com/'+id,status:'open'};state.sessions.push(session);if(state.loseResponse){state.loseResponse=false;throw new Error('lost response');}return session;}
 }}};
 const admin={rpc:async(_name,args)=>{if(state.locked)return {data:false};state.locked=args.lock_token;return {data:true};},from:table=>{
  let payload=null,del=false,token=null;
  const b={select(){return b;},eq(k,v){if(k==='token')token=v;return b;},update(p){payload=p;return b;},delete(){del=true;return b;},
   maybeSingle:async()=>({data:state.coach?{...state.coach}:null,error:state.profileError?{}:null}),single:async()=>({data:state.coach?{...state.coach}:null}),
   then(resolve,reject){try{if(table==='checkout_locks'&&del&&token===state.locked)state.locked=null;if(payload&&!state.saveError)Object.assign(state.coach,payload);return Promise.resolve({error:state.saveError?{}:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}}
  };return b;
 }};
 function Stripe(){return stripe;}Stripe.createFetchHttpClient=()=>({});
 let handler;
 const ctx={Stripe,createClient:(_url,_key,opts)=>opts?{auth:{getUser:async()=>({data:{user:{id:'coach',email:'synthetic@example.invalid'}}})}}:admin,
  Deno:{env:{get:k=>({STRIPE_PRICE_ANNUAL:'price_annual',STRIPE_PRICE_MONTHLY:'price_monthly',STRIPE_FOUNDING_COUPON:'coupon_founder'}[k]||'synthetic')},serve:fn=>handler=fn},
  crypto:{randomUUID:()=>crypto.randomUUID()},Response,console:{error(){},warn(){}},corsHeaders:{},handleCorsPreflight:()=>null};
 vm.runInNewContext(code,ctx);
 const call=async(plan='annual',auth=true)=>{const response=await handler(new Request('https://local.invalid/checkout',{method:'POST',headers:auth?{Authorization:'Bearer synthetic'}:{},body:JSON.stringify({plan})}));return {status:response.status,body:await response.json()};};
 return {state,call};
}
{
 const {state,call}=fixture();assert.equal((await call('annual',false)).status,401);assert.equal(state.created,0);
 state.coach=null;assert.equal((await call()).body.error,'profile_not_ready');assert.equal(state.customers,0);
}
{
 const {state,call}=fixture();const results=await Promise.all([call('annual'),call('monthly')]);
 assert.equal(state.created,1);assert.equal(results.filter(x=>x.status===409).length,1);assert.equal(state.locked,null);
 const again=await call('annual');assert.equal(again.status,200);assert.equal(state.created,1);
 const changed=await call('monthly');assert.equal(changed.status,200);assert.equal(state.created,2);assert.equal(state.sessions[0].status,'expired');
 state.subs=[{status:'past_due'}];assert.equal((await call()).body.error,'already_subscribed');assert.equal(state.created,2);
}
{
 const {state,call}=fixture();state.loseResponse=true;
 assert.equal((await call()).status,500);assert.equal(state.created,1);
 assert.equal((await call()).status,200);assert.equal(state.created,1); // recover lost response by reusing the open session
}
{
 const {state,call}=fixture();state.coach.stripe_customer_id=null;state.saveError=true;
 assert.equal((await call()).status,500);assert.equal(state.created,0);assert.equal(state.locked,null);
}
console.log('PASS checkout server: authentication, missing profile, concurrent plans, reuse, plan replacement, existing subscription, lost response, failed customer save');
