// Run: node --test tests/welcome-popup.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'js/welcome-popup.js'), 'utf8');
function setup({saved=false, blocked=false}={}) {
  let now=0, id=0; const timers=new Map(), storage=new Map(saved?[['duitjom:welcome:launch-v1:hidden','1']]:[]);
  function node() {
    const attrs={}, listeners={};
    return {dataset:{},style:{},tagName:'DIV',inert:false,hidden:false,complete:false,disabled:false,checked:false,
      setAttribute(k,v){attrs[k]=String(v)},getAttribute:k=>attrs[k],focus(){document.activeElement=this},
      addEventListener(k,fn){(listeners[k]||=[]).push(fn)},
      dispatch(k,e={}){for(const fn of listeners[k]||[]) fn(e)},
      classList:{add(){},remove(){}}};
  }
  const overlay=node(), popup=node(), close=node(), checkbox=node(), countdown=node(), track=node(), carousel=node(), prev=node(), next=node();
  overlay.setAttribute('aria-hidden','true');
  const slides=[node(),node()],dots=[node(),node()];
  for(const slide of slides){const img=node(),fallback=node();slide.querySelector=s=>s==='img'?img:fallback;}
  overlay.querySelector=()=>popup;
  popup.querySelector=s=>({'.welcome-track':track,'.welcome-carousel':carousel,'.welcome-prev':prev,'.welcome-next':next})[s];
  popup.querySelectorAll=s=>s==='[data-welcome-slide]'?slides:s==='[data-welcome-dot]'?dots:[close,prev,next,...dots,checkbox].filter(n=>!n.disabled);
  const document=node();document.readyState='complete';document.body=node();document.body.children=[node(),overlay];document.activeElement=node();document.hidden=false;
  const nodes={welcomePopup:overlay,welcomePopupCloseX:close,welcomeDontShow:checkbox,welcomeCountdown:countdown};
  document.getElementById=id=>nodes[id];
  const window={localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k)},setItem(k,v){if(blocked)throw Error();storage.set(k,v)}},setInterval(fn,ms){timers.set(++id,{fn,ms});return id},clearInterval(id){timers.delete(id)}};
  vm.runInNewContext(code,{document,window,Date:{now:()=>now}});
  return {overlay,popup,close,checkbox,countdown,document,slides,dots,carousel,next,prev,storage,timers,
    advance(ms){now+=ms;for(const t of [...timers.values()])t.fn()},
    key(key){document.dispatch('keydown',{key,preventDefault(){},stopImmediatePropagation(){}})}};
}
test('close remains locked for five seconds, never automatically dismisses, and restores background',()=>{
  const h=setup();assert(h.close.disabled);assert.equal(h.countdown.textContent,'5 s');
  h.close.dispatch('click');h.key('Escape');assert.equal(h.overlay.getAttribute('aria-hidden'),'false');
  h.advance(4999);assert(h.close.disabled);h.advance(1);assert.equal(h.close.disabled,false);
  h.advance(60000);assert.equal(h.overlay.getAttribute('aria-hidden'),'false');
  h.close.dispatch('click');assert.equal(h.overlay.getAttribute('aria-hidden'),'true');assert.equal(h.timers.size,0);assert.equal(h.document.body.children[0].inert,false);
});
test('auto slideshow uses 1500 ms; dots, arrows and swipes manually select slides',()=>{
  const h=setup();assert([...h.timers.values()].some(t=>t.ms===1500));
  h.advance(1500);assert.equal(h.overlay.dataset.slide,'1');
  h.dots[0].dispatch('click');assert.equal(h.overlay.dataset.slide,'0');
  h.next.dispatch('click');assert.equal(h.overlay.dataset.slide,'1');
  h.carousel.dispatch('pointerdown',{clientX:250,clientY:50});h.carousel.dispatch('pointerup',{clientX:100,clientY:60});assert.equal(h.overlay.dataset.slide,'0');
  h.key('ArrowLeft');assert.equal(h.overlay.dataset.slide,'1');
});
test('opt-out is saved only on dismissal and blocked storage still permits dismissal',()=>{
  const h=setup();h.checkbox.checked=true;h.close.dispatch('click');assert.equal(h.storage.size,0);
  h.advance(5000);h.close.dispatch('click');assert.equal(h.storage.get('duitjom:welcome:launch-v1:hidden'),'1');
  const saved=setup({saved:true});assert.equal(saved.overlay.getAttribute('aria-hidden'),'true');assert.equal(saved.timers.size,0);
  const blocked=setup({blocked:true});blocked.checkbox.checked=true;blocked.advance(5000);blocked.close.dispatch('click');assert.equal(blocked.overlay.getAttribute('aria-hidden'),'true');
});
test('return from a suspended app unlocks using elapsed time without closing',()=>{
  const h=setup();h.document.hidden=true;h.advance(50000);h.document.hidden=false;h.document.dispatch('visibilitychange');
  assert.equal(h.close.disabled,false);assert.equal(h.overlay.getAttribute('aria-hidden'),'false');
});
test('both requested artwork paths exist and the main navigation script parses',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const file of ['images/IMG_0633.jpeg','images/EEE45CF7-97D7-4767-ACF3-930B174CD5A7.png']){assert(html.includes(file));assert(fs.existsSync(path.join(root,file)));}
  new vm.Script(fs.readFileSync(path.join(root,'script.js'),'utf8'));
});
