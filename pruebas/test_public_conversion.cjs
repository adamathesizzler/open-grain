const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../main.js'),'utf8');
const html=fs.readFileSync(require.resolve('../contact.html'),'utf8');
const C=require('../assets/service-catalog.js');
function block(a,b){return source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));}
function harness(locale='es'){
 const nodes={}, writes=[];let focused=null, pending=null, fail=false;
 class Node{
  constructor(id=''){this.id=id;this.children=[];this.attrs={};this.listeners={};this.value='';this.hidden=false;this.disabled=false;this.required=false;this.firstChild={textContent:'',after(){}};this.isConnected=true;this.validity={};this.willValidate=true;this.classList={toggle(){}};}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}hasAttribute(k){return k in this.attrs;}removeAttribute(k){delete this.attrs[k];}
  append(...xs){this.children.push(...xs);}prepend(...xs){this.children.unshift(...xs);}after(){}remove(){}replaceChildren(...xs){this.children=xs;}focus(){focused=this;}closest(){return this.parentElement||this;}
  querySelector(sel){if(sel==='[type="submit"]')return nodes['submit-btn'];if(sel==='[data-og-label]')return null;return this.children.find(n=>'.'+n.className===sel)||null;}
  querySelectorAll(){return [];}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}setCustomValidity(){}checkValidity(){return true;}
 }
 class Select extends Node{get options(){return this.children;}get value(){return this._value||'';}set value(v){this._value=this.children?.some(x=>x.value===v)?v:'';}replaceChildren(...xs){super.replaceChildren(...xs);this._value='';}}
 class Form extends Node{querySelectorAll(){return fields;} }
 const fields=[];
 for(const name of ['name','email','phone','service','date','budget','message','consent']){
  const n=nodes[name]=['service','budget'].includes(name)?new Select(name):new Node(name);n.name=name;n.type=name==='consent'?'checkbox':name==='email'?'email':'text';n.checked=name==='consent';n.required=new RegExp('<(?:input|select)[^>]*id="'+name+'"[^>]*required').test(html);fields.push(n);
 }
 for(const id of ['contact-form','contact-heading','contact-lede','contact-brief','label-name','label-phone','label-service','label-date','label-budget','label-message','label-consent','service-notice','submit-btn','form-success','service-cards','services-label','services-heading','services-quote-intro','services-quote-link'])nodes[id]??=new Node(id);
 const form=nodes['contact-form']=new Form('contact-form');form.elements={namedItem:name=>nodes[name]};form.portfolioContext=null;
 nodes['service-cards'].tagName='OL';nodes.name.value='Test visitor';nodes.email.value='visitor@example.test';nodes.message.value='A synthetic project brief';
 function Option(label,value){this.text=label;this.value=value;}
 const context=vm.createContext({window:{OGServiceCatalog:C},document:{createElement:()=>new Node(),getElementById:id=>nodes[id]||null},HTMLFormElement:Form,HTMLSelectElement:Select,Option,AbortController,URLSearchParams,Date,console,$:id=>nodes[id]||null,lang:locale,location:{search:''},serviceCatalogReady:true,serviceCatalogState:'ready',contactPrefilled:false,ogContactController:null,attrEscape:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),retryMarkup:()=>'',renderServiceMarquee(){},setTrustedHtml(n,s){n.textContent=s;},supabaseClient:{from(table){assert.equal(table,'enquiries');return {async insert(row){writes.push({...row});if(pending)await pending;if(fail)return {error:new Error('synthetic failure')};return {error:null};}};}}});
 vm.runInContext(fs.readFileSync(require.resolve('../assets/default-copy.js'),'utf8'),context);
 vm.runInContext(block('const defaults =','// Idioma de la primera visita'),context);
 context.serviceCatalog=C.legacy(context.window.DEFAULT_COPY);context.currentServices=()=>C.active(context.serviceCatalog,context.lang);
 vm.runInContext(block('function renderServices()','// The ribbon:'),context);
 vm.runInContext(block('const SERVICE_VALUE','// El texto de consentimiento'),context);
 vm.runInContext(block('function renderServiceCard()','function renderSocialLabels()'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../assets/ux/og-contact.js'),'utf8'),context);
 // Run the production controller installation and production send closure unchanged.
 vm.runInContext(block("const form = $('contact-form');",'// Real published projects replace'),context);
 const sync=()=>vm.runInContext("for(const l of ['es','en']){const entries=window.OGServiceCatalog.active(serviceCatalog,l);copy[l].serviceList=entries.map(x=>x.label);copy[l].serviceBlurbs=entries.map(x=>x.description);}",context);
 sync();
 return {context,nodes,writes,sync,focused:()=>focused,setFail:v=>fail=v,setPending:v=>pending=v,submit:()=>form.listeners.submit[0]({preventDefault(){}}),override:(key,value)=>{context.overrideKey=key;context.overrideValue=value;vm.runInContext('copy[lang][overrideKey]=overrideValue',context);}};
}
for(const lang of ['es','en'])test('actual service link → contact render → controller → insert pipeline '+lang,async()=>{
 const h=harness(lang);h.context.serviceCatalog.items.reverse();h.context.serviceCatalog.items[0].labels[lang]='Custom service';h.sync();h.context.renderServices();
 const url=new URL(h.nodes['service-cards'].innerHTML.match(/class="svc-quote-link" href="([^"]+)"/)[1],'https://example.test');h.context.location.search=url.search;h.context.contactPrefilled=false;h.context.renderContact();
 assert.equal(h.nodes.service.value,h.context.serviceCatalog.items[0].id);await h.submit();assert.equal(h.writes.length,1);assert.equal(h.writes[0].service,'Custom service');assert.equal(h.writes[0].consent_accepted,true);assert.equal(h.nodes['contact-form'].hidden,true);
});
test('manual service choice and brief survive locale rerender after prefill',()=>{const h=harness();h.context.location.search='?service=0';h.context.contactPrefilled=false;h.context.renderContact();h.nodes.service.value=C.legacyId(2);h.context.lang='en';h.context.renderContact();assert.equal(h.nodes.service.value,C.legacyId(2));assert.equal(h.nodes.message.value,'A synthetic project brief');});
test('blank required service is inline invalid, focused, and never sent',async()=>{const h=harness();await h.submit();assert.equal(h.writes.length,0);assert.equal(h.nodes.service.getAttribute('aria-invalid'),'true');assert.equal(h.focused(),h.nodes.service);});
test('pending duplicate submit makes one insert and completed submit cannot repeat',async()=>{const h=harness();h.nodes.service.value=C.legacyId(0);let resolve;h.setPending(new Promise(r=>resolve=r));const first=h.submit();await h.submit();assert.equal(h.writes.length,1);assert.equal(h.nodes['submit-btn'].disabled,true);resolve();await first;await h.submit();assert.equal(h.writes.length,1);});
test('failed confirmation retains inputs and does not claim success',async()=>{const h=harness();h.nodes.service.value=C.legacyId(0);h.setFail(true);await h.submit();assert.equal(h.nodes['contact-form'].hidden,false);assert.equal(h.nodes.message.value,'A synthetic project brief');assert.equal(h.nodes['submit-btn'].disabled,false);assert.match(h.focused().textContent,/confirmar/);});
test('explicit portfolio context IDs survive the real send closure',async()=>{const h=harness();h.nodes.service.value=C.legacyId(0);h.context.location.search='?portfolio_photo=photo&portfolio_group=group';h.nodes['contact-form'].portfolioContext={photo_id:'photo',group_id:'group'};await h.submit();assert.equal(h.writes[0].portfolio_project_id,'photo');assert.equal(h.writes[0].portfolio_group_id,'group');});
test('unresolved explicit portfolio context refuses insertion',async()=>{const h=harness();h.nodes.service.value=C.legacyId(0);h.context.location.search='?portfolio_photo=missing';await h.submit();assert.equal(h.writes.length,0);assert.equal(h.nodes['contact-form'].hidden,false);});
test('editable conversion text is rendered safely and catalog error never offers stale service links',()=>{const h=harness();h.override('quoteAction','<Quote "custom">');h.override('quoteIntro','Owner introduction');h.override('quoteBrief','Owner guidance');h.context.renderServices();h.context.renderContact();assert.match(h.nodes['service-cards'].innerHTML,/&lt;Quote &quot;custom/);assert.equal(h.nodes['services-quote-intro'].textContent,'Owner introduction');assert.equal(h.nodes['contact-brief'].textContent,'Owner guidance');h.context.serviceCatalogReady=false;h.context.serviceCatalogState='error';h.context.renderServices();assert(!h.nodes['service-cards'].innerHTML.includes('svc-quote-link'));});
test('new editable fields are exposed to Studio and public homepage remains pure grid',()=>{const h=harness();for(const key of ['quoteAction','quoteIntro','quoteBrief'])assert(h.context.window.CONTENT_FIELD_ORDER.includes(key));const home=fs.readFileSync(require.resolve('../index.html'),'utf8');assert(!home.includes('services-quote-link'));assert(!source.includes('setInterval(rotatePortfolioCovers'));});

test('selected-service explanation is neutral and helper/reference span both form columns',()=>{const h=harness();const Node=h.nodes['contact-heading'].constructor;for(const id of ['service-card','service-card-chip','service-card-label','service-card-img','service-card-index','service-card-title','service-card-desc','service-card-price','service-card-note'])h.nodes[id]=new Node(id);h.nodes.service.value=C.legacyId(0);h.context.renderContact();assert.match(h.nodes['contact-lede'].textContent,/^Servicio: Fotografía\. Cuéntanos/);const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.contact-brief\{grid-column:1 \/ -1/);assert.match(css,/\.project-form > \.portfolio-context\{grid-column:1 \/ -1/);});

test('About uses existing bilingual copy and real onward routes without resetting forms',()=>{
 const h=harness();const Node=h.nodes['contact-heading'].constructor;
 for(const id of ['studio-heading','studio-body','studio-tag','studio-label','studio-work-link','studio-services-link','studio-links'])h.nodes[id]=new Node(id);
 vm.runInContext(block('function renderStudio()','// Stable catalogue IDs'),h.context);
 h.context.renderStudio();assert.match(h.nodes['studio-body'].textContent,/estudio independiente de fotografía y vídeo/);assert.equal(h.nodes['studio-work-link'].textContent,'Ver proyectos ↗');assert.equal(h.nodes['studio-services-link'].textContent,'Ver servicios ↗');
 h.override('aboutBody','Texto propio del estudio');h.context.renderStudio();assert.equal(h.nodes['studio-body'].textContent,'Texto propio del estudio');
 h.context.lang='en';h.context.renderStudio();assert.match(h.nodes['studio-body'].textContent,/independent photography and film studio/);assert.equal(h.nodes['studio-links'].getAttribute('aria-label'),'Explore the studio');assert.equal(h.nodes.message.value,'A synthetic project brief');
 const about=fs.readFileSync(require.resolve('../about.html'),'utf8');assert.match(about,/id="studio-work-link" href="\/work"/);assert.match(about,/id="studio-services-link" href="\/services"/);
});
test('condensed ES fallbacks match editable defaults and never call privacy consent optional',()=>{
 const h=harness(),copy=h.context.window.DEFAULT_COPY.es;
 for(const [file,keys] of [['about.html',['aboutBody']],['services.html',['introBody','quoteIntro']],['contact.html',['quoteBrief']]]){const body=fs.readFileSync(require.resolve('../'+file),'utf8');for(const key of keys)assert(body.includes(copy[key]));}
 assert.equal(copy.quoteBrief,'Cuéntanos tu idea. Teléfono, fecha y presupuesto son opcionales.');assert.equal(h.context.window.DEFAULT_COPY.en.quoteBrief,'Tell us your idea. Phone, date and budget are optional.');
 assert(!copy.aboutBody.includes('años'));assert(!copy.aboutBody.includes('Mansu'));
});
function contrast(a,b){const luminance=hex=>{const v=hex.match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('contact hint tokens exceed AA against observed dark card and focused field backgrounds',()=>{
 const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.site-shell\.dark-mode \.contact-brief\{color:#c3c0bb;/);assert(contrast('c3c0bb','464747')>=4.5);assert(contrast('c3c0bb','191a19')>=4.5);assert(contrast('f3efe8','595a5a')>=4.5);assert(contrast('6d6b64','f2eee6')>=4.5);
});
test('native form controls follow theme and narrow submit/input rules stay scoped outside home',()=>{
 const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/#contact-form input,#contact-form select,#contact-form textarea\{color-scheme:light/);assert.match(css,/\.site-shell\.dark-mode #contact-form textarea\{color-scheme:dark/);assert.match(css,/#contact-form input:not\(\[type="checkbox"\]\),#contact-form select,#contact-form textarea\{width:100%;font-size:16px/);assert.match(css,/#contact-form \.submit-btn\{width:100%;max-width:100%;min-width:0;justify-content:space-between;gap:12px/);
});

test('validation summary changes language with fields without moving focus or losing draft',async()=>{
 const h=harness();await h.submit();const summary=h.nodes['contact-form'].children.find(n=>n.id==='og-contact-summary');assert.match(summary.textContent,/Revisa/);assert.equal(h.focused(),h.nodes.service);
 h.context.lang='en';h.context.renderContact();assert.equal(summary.textContent,'Check the highlighted fields before sending.');assert.equal(h.focused(),h.nodes.service);assert.equal(h.nodes.message.value,'A synthetic project brief');assert.equal(h.writes.length,0);
});
test('failed-send summary changes language without retrying, erasing context or moving focus',async()=>{
 const h=harness();h.nodes.service.value=C.legacyId(0);h.context.location.search='?portfolio_photo=photo&portfolio_group=group';h.nodes['contact-form'].portfolioContext={photo_id:'photo',group_id:'group'};h.setFail(true);await h.submit();const summary=h.focused();assert.match(summary.textContent,/confirmar/);
 h.context.lang='en';h.context.renderContact();assert.match(summary.textContent,/could not confirm delivery/);assert.equal(h.focused(),summary);assert.equal(h.writes.length,1);assert.equal(h.nodes.message.value,'A synthetic project brief');assert.equal(h.nodes['contact-form'].portfolioContext.photo_id,'photo');assert.equal(h.nodes.service.value,C.legacyId(0));
});

test('dark contact keyboard focus has a visible high-contrast scoped outline',()=>{
 const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.site-shell\.dark-mode #contact-form textarea:focus\{outline:2px solid #ffac9a;outline-offset:2px;border-color:#ffac9a/);assert(contrast('ffac9a','464747')>=3);assert(contrast('ffac9a','595a5a')>=3);
});
