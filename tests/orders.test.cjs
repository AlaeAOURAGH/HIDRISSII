const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const store = require('../lib/order-store');
const intake = require('../api/order-new');
const ordersApi = require('../api/orders');
const products = require('../data/catalogue.json');
const fs = require('node:fs'), vm = require('node:vm');
function storefront(fetch) {
  const popup = {document:{body:{}},closed:false,location:{replace(url){this.url=url;}},close(){this.closed=true;}};
  const storage=new Map();
  const context = { localStorage:{setItem:(key,value)=>storage.set(key,value),getItem:key=>storage.get(key)},DCLogic:class{setState(value){Object.assign(this.state,value);}},fetch,Date,crypto:{randomUUID},AbortSignal,URLSearchParams,setTimeout,window:{open:()=>popup,location:{assign(url){this.url=url;}}} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../scripts/app-logic.js'),'utf8').replace('class Component extends','globalThis.Component = class Component extends'),context);
  const c = new context.Component();
  c.T={fr:{cities:['Rabat'],waCta:'Commander via WhatsApp',photos:n=>n+' photos'},ar:{cities:['الرباط'],waCta:'طلب',photos:n=>n+' صور'}};
  c.PRODUCTS=products.map(p=>({...p,inStock:p.in_stock,priceNum:p.price,price:String(p.price),speed:{fr:p.speed},range:{fr:p.range},images:p.images.map(src=>({display:src,thumb:src})),shortDesc:p.short_desc}));
  c.state.form={name:'Client test',phone:'0600000000',qty:'2',city:'Rabat'};c.state.selectedProduct=c.PRODUCTS.find(p=>p.inStock).name;c.state.loaded=true;
  return {c,popup,storage};
}

test('favourites persist product IDs and filter without opening a product',()=>{
  const {c,storage}=storefront();const id=c.PRODUCTS[0].id;let stopped=false;
  const event={preventDefault(){},stopPropagation(){stopped=true;},currentTarget:{dataset:{id}}};
  c.renderVals().toggleFavorite(event);assert.ok(stopped);assert.deepEqual(JSON.parse(storage.get('hidrissi-favorites')),[id]);
  c.state.favoritesOnly=true;assert.equal(c.renderVals().filteredProducts.length,1);assert.equal(c.renderVals().filteredProducts[0].id,id);
  c.renderVals().toggleFavorite(event);assert.equal(c.renderVals().filteredProducts.length,0);
});

test('specification filters use advertised upper ranges and combined motor power',()=>{
  const {c}=storefront();c.state.minSpeed=55;c.state.minRange=65;c.state.minPower=3000;
  const matches=c.renderVals().filteredProducts;assert.ok(matches.some(p=>p.name==='WATHIUM RS-2'));assert.ok(matches.every(p=>p.name!=='ODYS'));
  c.renderVals().resetFilters();assert.equal(c.renderVals().filteredProducts.length,c.PRODUCTS.length);
});

test('photo navigation wraps and ignores small touch movements',()=>{
  const {c}=storefront();const total=c.PRODUCTS[0].images.length;
  c.renderVals().previousImage();assert.equal(c.state.activeImage,total-1);
  c.renderVals().nextImage();assert.equal(c.state.activeImage,0);
  c.renderVals().swipeStart({changedTouches:[{clientX:200}]});
  c.renderVals().swipeEnd({changedTouches:[{clientX:180}]});assert.equal(c.state.activeImage,0);
  c.renderVals().swipeEnd({changedTouches:[{clientX:80}]});assert.equal(c.state.activeImage,1%total);
});
function res() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n;return this; }, json(body) { this.body=body;return this; } }; }
const request = (body, extra={}) => ({ method:'POST', body, headers:{}, ...extra });
const input = () => ({ name:'Client test',phone:'0600000000',qty:'2',product:products.find(p=>p.in_stock).name,price:1,city:'Rabat',address:'Adresse test',note:'=untrusted',lang:'fr',orderId:Date.now()+'-'+randomUUID() });
test('private storage preserves original order and stores status separately', async () => {
  const files = new Map(), writes=[];
  const client = {
    async get(path, options) { assert.equal(options.access,'private'); assert.equal(options.useCache,false); const data=files.get(path); return data ? {statusCode:200,stream:new Blob([JSON.stringify(data)]).stream()} : null; },
    async put(path, data, options) { assert.equal(options.access,'private');assert.equal(options.addRandomSuffix,false);writes.push({path,options});files.set(path,JSON.parse(data)); },
    async list() {return {blobs:[...files.keys()].filter(p=>p.startsWith('orders/')).sort().map(pathname=>({pathname})),hasMore:false};}
  };
  const s=store.createStore(client), id=Date.now()+'-'+randomUUID();
  await s.save({id,name:'Original',createdAt:new Date().toISOString(),status:'new'});
  await s.save({id,name:'Changed'});
  assert.equal(writes.length,1);assert.equal(writes[0].options.allowOverwrite,false);
  await s.update(id,'delivered','editor');
  assert.equal(writes[1].options.allowOverwrite,true);
  const page=await s.page();assert.equal(page.orders[0].name,'Original');assert.equal(page.orders[0].status,'delivered');
  await assert.rejects(s.update(id,'unknown','editor'));
  assert.equal(await s.update(Date.now()+'-'+randomUUID(),'confirmed','editor'),null);
});
test('reverse timestamp keys show newest orders first and reject traversal', () => {
  const uuid=randomUUID(), a=store.orderPath('1700000000000-'+uuid),b=store.orderPath('1800000000000-'+uuid);
  assert.ok(b<a);assert.throws(()=>store.orderPath('../secret'));
});
test('public capture uses catalog price, server time and numeric totals', async () => {
  const saved=store.save, env=process.env.BLOB_READ_WRITE_TOKEN; let captured;
  process.env.BLOB_READ_WRITE_TOKEN='test';store.save=async o=>{captured=o;return o;};
  try {const body=input(),response=res();await intake(request(body),response);assert.equal(response.code,201);const product=products.find(p=>p.name===body.product);assert.equal(captured.unitPrice,product.price);assert.equal(captured.total,product.price*2);assert.equal(captured.phone,'0600000000');assert.equal(captured.note,'=untrusted');assert.equal(captured.status,'new');assert.ok(captured.createdAt);}
  finally {store.save=saved;if(env===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=env;}
});
test('missing storage never reports a persisted order',async()=>{const env=process.env.BLOB_READ_WRITE_TOKEN;delete process.env.BLOB_READ_WRITE_TOKEN;try{const r=res();await intake(request(input()),r);assert.equal(r.code,503);assert.equal(r.body.ok,false);}finally{if(env!==undefined)process.env.BLOB_READ_WRITE_TOKEN=env;}});
test('storage failure is returned without logging or exposing customer details',async()=>{const save=store.save,env=process.env.BLOB_READ_WRITE_TOKEN;process.env.BLOB_READ_WRITE_TOKEN='test';store.save=async()=>{throw Error('backend failure');};try{const r=res();await intake(request(input(),{headers:{'x-forwarded-for':randomUUID()}}),r);assert.equal(r.code,502);assert.deepEqual(r.body,{ok:false,error:'store_failed'});}finally{store.save=save;if(env===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=env;}});
test('invalid quantity, unknown product, phone and foreign origin rejected',async()=>{
  for(const fields of [{qty:0},{qty:4},{qty:1.5},{product:'Unknown'},{phone:'abc'}]){const r=res();await intake(request({...input(),...fields},{headers:{'x-forwarded-for':randomUUID()}}),r);assert.equal(r.code,400);}
  const r=res();await intake(request(input(),{headers:{origin:'https://evil.example'}}),r);assert.equal(r.code,403);
});
test('honeypot does not store customer data',async()=>{const save=store.save;store.save=()=>assert.fail('must not store bot');try{const r=res();await intake(request({...input(),hp:'spam'}),r);assert.equal(r.body.ok,true);}finally{store.save=save;}});
test('orders API requires a token and never caches private responses',async()=>{const r=res();await ordersApi({method:'GET',headers:{},url:'/api/orders'},r);assert.equal(r.code,401);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.body.orders,undefined);});
test('a GitHub reader cannot read or update orders',async()=>{const previous=global.fetch;global.fetch=async()=>({ok:true,json:async()=>({permissions:{push:false}})});try{for(const method of ['GET','PATCH']){const r=res();await ordersApi({method,headers:{authorization:'Bearer test_token'},url:'/api/orders'},r);assert.equal(r.code,403);assert.equal(r.body.orders,undefined);}}finally{global.fetch=previous;}});
test('authorized editor receives a bounded page and can update allowed statuses',async()=>{
  const fetch=global.fetch,page=store.page,update=store.update,env=process.env.BLOB_READ_WRITE_TOKEN;
  global.fetch=async()=>({ok:true,json:async()=>({permissions:{push:true}})});process.env.BLOB_READ_WRITE_TOKEN='test';
  store.page=async cursor=>({orders:[{id:'test',status:'new'}],cursor:cursor||null});store.update=async(id,status)=>({status,updatedAt:new Date().toISOString()});
  try {const r=res();await ordersApi({method:'GET',headers:{authorization:'Bearer test_token'},url:'/api/orders'},r);assert.equal(r.code,200);assert.equal(r.body.orders.length,1);
    const patch=res();await ordersApi({method:'PATCH',headers:{authorization:'Bearer test_token'},body:{id:Date.now()+'-'+randomUUID(),status:'confirmed'}},patch);assert.equal(patch.code,200);assert.equal(patch.body.status,'confirmed');
    const invalid=res();await ordersApi({method:'PATCH',headers:{authorization:'Bearer test_token'},body:{id:Date.now()+'-'+randomUUID(),status:'bogus'}},invalid);assert.equal(invalid.code,400);
  } finally {global.fetch=fetch;store.page=page;store.update=update;if(env===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=env;}
});
test('storefront waits for storage before WhatsApp and suppresses double submission',async()=>{
  let finish,calls=0;const {c,popup}=storefront(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const first=c.renderVals().submitOrder();assert.equal(c.state.submitting,true);assert.equal(popup.location.url,undefined);
  await c.renderVals().submitOrder();assert.equal(calls,1);
  finish({ok:true,json:async()=>({ok:true})});await first;
  assert.ok(popup.location.url.startsWith('https://wa.me/'));assert.equal(c.state.submitting,false);
});
test('storefront preserves customer fields and request ID after storage failure',async()=>{
  const ids=[];const {c,popup}=storefront(async(url,options)=>{ids.push(JSON.parse(options.body).orderId);return {ok:false,json:async()=>({ok:false})};});
  await c.renderVals().submitOrder();assert.equal(popup.closed,true);assert.equal(popup.location.url,undefined);assert.equal(c.state.form.name,'Client test');assert.ok(c.state.orderError.includes('enregistrée'));assert.equal(c.state.submitting,false);
  await c.renderVals().submitOrder();assert.equal(ids[0],ids[1]);
});
