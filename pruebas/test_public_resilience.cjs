const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../main.js'), 'utf8');
const helper = source.slice(source.indexOf('const PUBLIC_READ_TIMEOUT_MS'), source.indexOf('function retryMarkup'));
function harness(extra = {}) {
  const timers = new Map(); let id = 0;
  const c = vm.createContext({AbortController, setTimeout(fn, ms) { timers.set(++id, {fn,ms}); return id; }, clearTimeout(key) {timers.delete(key);}, ...extra});
  vm.runInContext(helper, c);
  return {c, timers, expire() {assert.equal(timers.size,1); const timer=[...timers.values()][0];assert.equal(timer.ms,12000);timer.fn();}};
}
const flush = () => new Promise(r=>setImmediate(r));
test('bounded timeout aborts and reports error once; a late success cannot apply', async () => {
  const h=harness();let resolve,signal,applied=0,failed=0;
  const p=h.c.loadPublicResource('portfolio',s=>{signal=s;return new Promise(r=>resolve=r)},()=>applied++,()=>failed++);
  await flush();h.expire();await p;
  assert(signal.aborted);assert.equal(failed,1);assert.equal(applied,0);assert.equal(h.timers.size,0);
  resolve({data:[{title:'late'}]});await flush();assert.equal(applied,0);assert.equal(failed,1);
});
test('repeated clicks share one request and successful response clears timer',async()=>{
 const h=harness();let finish,calls=0,applied=0;
 const request=()=>{calls++;return new Promise(r=>finish=r)};
 const p=h.c.loadPublicResource('portfolio',request,()=>applied++,assert.fail);
 assert.equal(h.c.loadPublicResource('portfolio',request,()=>applied++,assert.fail),p);
 await flush();assert.equal(calls,1);finish({data:[]});await p;assert.equal(applied,1);assert.equal(h.timers.size,0);
});
test('timeout then retry accepts only the new response even when old response arrives first',async()=>{
 const h=harness();let old,newer;const applied=[];
 const p=h.c.loadPublicResource('portfolio',()=>new Promise(r=>old=r),r=>applied.push(r),()=>{});
 await flush();h.expire();await p;
 const retry=h.c.loadPublicResource('portfolio',()=>new Promise(r=>newer=r),r=>applied.push(r),assert.fail);
 await flush();old('stale');await flush();assert.deepEqual(applied,[]);newer('current');await retry;assert.deepEqual(applied,['current']);
});
test('rejected and synchronous failures both free resource for a manual retry',async()=>{
 for(const request of [()=>{throw Error('no backend')},()=>Promise.reject(Error('offline'))]){
  const h=harness();let failures=0,applied=0;
  await h.c.loadPublicResource('catalog',request,assert.fail,()=>failures++);
  await h.c.loadPublicResource('catalog',()=>({data:[]}),()=>applied++,assert.fail);
  assert.equal(failures,1);assert.equal(applied,1);assert.equal(h.timers.size,0);
 }
});
test('response validation failure is an error, not a successful empty response',async()=>{
 const h=harness();let failed=0;
 await h.c.loadPublicResource('catalog',()=>({error:{message:'no access'}}),()=>{throw Error('invalid response')},()=>failed++);
 assert.equal(failed,1);assert.equal(h.timers.size,0);
});
function catalogHarness(result) {
 const calls=[];const select={disabled:false};
 const h=harness({studioPreviewActive:false,serviceCatalogReady:false,serviceCatalogState:'loading',
   $:id=>id==='service'?select:null,renderServices(){calls.push('services')},renderContact(){calls.push('contact')},renderSiteCopy(){calls.push('copy')},
   renderAll(){throw Error('must not rebuild gallery')},applyServiceCatalog(){calls.push('apply')},copy:{es:{},en:{}},
   window:{DEFAULT_COPY:{},OGServiceCatalog:{fromRows:()=>({})}},
   supabaseClient:{from(){return{select(){return{abortSignal:()=>result}}}}}});
 vm.runInContext(source.slice(source.indexOf('function publicRows('),source.indexOf('function portfolioNotice(')),h.c);
 vm.runInContext(source.slice(source.indexOf('function loadSiteContent()'),source.indexOf('\nloadSiteContent();')),h.c);
 return {...h,calls,select};
}
test('catalog completion updates copy independently without touching gallery DOM',async()=>{
 const h=catalogHarness({data:[],error:null});await h.c.loadSiteContent();assert(h.calls.includes('copy'));assert.equal(h.select.disabled,false);assert.equal(h.c.serviceCatalogReady,true);
});
test('catalog unavailable fails closed, enables retry state and does not render fallback offers',async()=>{
 const h=catalogHarness({data:null,error:{message:'offline'}});await h.c.loadSiteContent();assert.equal(h.c.serviceCatalogReady,false);assert.equal(h.c.serviceCatalogState,'error');assert.equal(h.select.disabled,true);assert(!h.calls.includes('copy'));
});
test('pending live catalog response never overrides an intervening Studio preview',async()=>{
 let finish;const h=catalogHarness(new Promise(r=>finish=r));const p=h.c.loadSiteContent();await flush();h.c.studioPreviewActive=true;finish({data:[],error:null});await p;assert(!h.calls.includes('apply'));assert(!h.calls.includes('copy'));
});
test('missing Supabase client reaches error state instead of loading forever',async()=>{
 const h=catalogHarness(null);h.c.supabaseClient=null;await h.c.loadSiteContent();assert.equal(h.c.serviceCatalogState,'error');assert.equal(h.timers.size,0);
});
test('copy renderer excludes gallery layout and does not reset scroll',()=>{
 const body=source.slice(source.indexOf('function renderSiteCopy()'),source.indexOf('// El idioma es una elección'));
 assert(!/renderHomeGrid|renderWork|scrollTo/.test(body));
});
test('retry buttons are non-submit, bilingual, and loading placeholder fills flex and columns',()=>{
 const c=vm.createContext({lang:'es',portfolioState:'error'});
 vm.runInContext(source.slice(source.indexOf('function retryMarkup'),source.indexOf('const projects = [')),c);
 assert.match(c.portfolioNotice(),/type="button"/);assert.match(c.portfolioNotice(),/Reintentar/);c.lang='en';assert.match(c.portfolioNotice(),/Try again/);
 c.portfolioState='ready';assert(!c.portfolioNotice().includes('data-public-retry'));
 const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.portfolio-notice\{[^}]*flex:1 0 100%/);assert.match(css,/\.portfolio-notice\{[^}]*column-span:all/);assert.match(css,/\.public-retry\{[^}]*min-height:44px/);
});
function portfolioHarness(response) {
 let home=0,work=0,requests=0;
 const h=harness({portfolioState:'error',projects:[],renderHomeGrid(){home++},renderWork(){work++},
   applyRealProjects(rows){h.c.projects.splice(0,h.c.projects.length,...rows);h.c.portfolioState='ready';home++;work++},
   supabaseClient:{from(table){assert.equal(table,'portfolio_projects');requests++;return{select(){return{eq(key,value){assert.equal(key,'is_published');assert.equal(value,true);return{order(){return{abortSignal:()=>response}}}}}}}}}});
 vm.runInContext(source.slice(source.indexOf('function publicRows('),source.indexOf('function portfolioNotice(')),h.c);
 vm.runInContext(source.slice(source.indexOf('function loadPortfolio()'),source.indexOf('function loadSocial()')),h.c);
 return {...h,counts:()=>({home,work,requests})};
}
test('portfolio successful empty is authoritative and does not revive original photographs',async()=>{
 const h=portfolioHarness({data:[],error:null});await h.c.loadPortfolio();assert.equal(h.c.portfolioState,'ready');assert.equal(h.c.projects.length,0);assert.deepEqual(h.counts(),{home:2,work:2,requests:1});
});
test('portfolio timeout clears stale data, enters retry state, and ignores later records',async()=>{
 let finish;const h=portfolioHarness(new Promise(r=>finish=r));h.c.projects.push({title:'stale'});
 const p=h.c.loadPortfolio();await flush();h.expire();await p;assert.equal(h.c.portfolioState,'error');assert.equal(h.c.projects.length,0);
 finish({data:[{title:'late'}],error:null});await flush();assert.equal(h.c.portfolioState,'error');assert.equal(h.c.projects.length,0);
});
test('duplicate portfolio retry clicks neither clear again nor start extra requests',async()=>{
 let finish;const h=portfolioHarness(new Promise(r=>finish=r));const p=h.c.loadPortfolio();h.c.loadPortfolio();await flush();assert.deepEqual(h.counts(),{home:1,work:1,requests:1});finish({data:[],error:null});await p;
});
test('canonical service descriptions win over legacy raw serviceBlurbs rows',async()=>{
 const h=catalogHarness({data:[{key:'serviceBlurbs',lang:'es',value:'["legacy"]'}],error:null});
 h.c.applyServiceCatalog=()=>{h.c.copy.es.serviceBlurbs=['canonical'];};
 await h.c.loadSiteContent();assert.deepEqual(h.c.copy.es.serviceBlurbs,['canonical']);
});
function retryFocusHarness() {
 let done;const doc={activeElement:null};const attrs={};
 const target={focus(){doc.activeElement=this}};
 const region={getAttribute:k=>attrs[k]??null,setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},focus(){doc.activeElement=this},querySelector:()=>target};
 const button={closest:()=>region};doc.activeElement=button;
 const c=vm.createContext({document:doc});
 vm.runInContext(source.slice(source.indexOf('function retryPublicResource'),source.indexOf("document.addEventListener('click', event => {",source.indexOf('function retryPublicResource'))),c);
 return {doc,attrs,region,button,target,run(){c.retryPublicResource(button,()=>new Promise(r=>done=r))},async done(){done();await flush()}};
}
test('keyboard retry focuses stable region, then replacement control, and cleans tabindex',async()=>{
 const h=retryFocusHarness();h.run();assert.equal(h.doc.activeElement,h.region);assert.equal(h.attrs.tabindex,'-1');await h.done();assert.equal(h.doc.activeElement,h.target);assert.equal(h.attrs.tabindex,undefined);
});
test('retry completion never steals focus after visitor moves to another field',async()=>{
 const h=retryFocusHarness();h.run();const elsewhere={};h.doc.activeElement=elsewhere;await h.done();assert.equal(h.doc.activeElement,elsewhere);assert.equal(h.attrs.tabindex,undefined);
});
test('services loading and retry controls stay inside an ordered-list item',()=>{
 assert(source.includes('cards.tagName === \'OL\' ? `<li class="service-load-notice">${status}</li>` : status'));
});
test('social rerender during manual retry preserves visible loading controls and region',()=>{
 const section={hidden:false};const grid={innerHTML:'pending',querySelector:()=>({disabled:true})};
 const c=vm.createContext({$:id=>id==='social-grid'?grid:section,socialState:'loading'});
 const start=source.indexOf('function renderSocialGrid()');
 // Stop before network data access; this branch must return without needing any records.
 const end=source.indexOf('  // La sección entera',start);
 vm.runInContext(source.slice(start,end)+'}',c);
 for(let i=0;i<3;i++)c.renderSocialGrid();assert.equal(section.hidden,false);assert.equal(grid.innerHTML,'pending');
});
test('retry focus selector matches actual portfolio grid IDs on home and work',()=>{
 assert(source.includes("'#home-grid, #masonry-grid, #service-cards, #contact-form, #social-grid'"));
 for(const [file,id] of [['index.html','home-grid'],['work.html','masonry-grid']])assert(fs.readFileSync(require.resolve('../'+file),'utf8').includes(`id="${id}"`));
});
test('service status is not numbered or styled like a real offering',()=>{
 const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.svc-index \.service-load-notice\{[^}]*counter-increment:none/);assert.match(css,/\.svc-index \.service-load-notice::before\{content:none\}/);
});
test('contact rerender re-enables verified preview catalog even while live read is pending',()=>{
 const field={disabled:true};const c=vm.createContext({$:()=>field,serviceCatalogReady:true});
 const start=source.indexOf("  const service = $('service');",source.indexOf('function renderContact()'));
 vm.runInContext(source.slice(start,source.indexOf('  const chosenService',start)),c);assert.equal(field.disabled,false);
});
