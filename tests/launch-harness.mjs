import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=[...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
export function appHarness(){
const mkEl = () => ({ innerHTML:'', textContent:'', style:{}, value:'', checked:false, dataset:{},
  classList:{ add(){}, remove(){}, contains(){return false}, toggle(){return false} },
  setAttribute(){}, removeAttribute(){}, getAttribute(){return null}, appendChild(){}, addEventListener(){},
  querySelectorAll(){return []}, querySelector(){return null}, scrollIntoView(){}, focus(){} });
const store = {};
const doc = { getElementById:(id)=>store[id]||(store[id]=mkEl()), querySelectorAll:()=>[], querySelector:()=>null,
  createElement:()=>mkEl(), addEventListener(){}, body:mkEl(), documentElement:mkEl(), head:mkEl(), title:'', readyState:'complete' };
const ls = {_d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}};
const win = { addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  location:{hash:'',search:'',pathname:'/',href:'http://localhost/'}, history:{replaceState(){},pushState(){}},
  localStorage:ls, sessionStorage:ls, scrollTo(){}, navigator:{userAgent:'node',clipboard:{writeText:async()=>{}}},
  print(){}, open(){return null}, requestAnimationFrame:(f)=>setTimeout(f,0) };
const timers = [];
const ctx = { document:doc, window:win, localStorage:ls, sessionStorage:ls, navigator:win.navigator, location:win.location,
  history:win.history, console, setTimeout:(fn,ms)=>{ timers.push({fn,ms}); return timers.length; }, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
  fetch:async()=>({ok:false,json:async()=>({})}), alert(){}, confirm:()=>true, prompt:()=>null,
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams, __out:{}, __fail:{} };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(main, ctx, { filename: 'index.html' });
return {ctx, store, ls, timers, run: code => vm.runInContext(code,ctx)};

}
