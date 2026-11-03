const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(){
 const nodes=new Map(),listeners={};
 function node(id){const classes=new Set(),attrs={},events={};return{id,events,style:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle(v){if(classes.has(v)){classes.delete(v);return false}classes.add(v);return true}},setAttribute(k,v){attrs[k]=String(v)},getAttribute:k=>attrs[k],querySelector(){return{focus(){}}},querySelectorAll(){return[]},addEventListener(k,fn){events[k]=fn},focus(){}}}
 for(const id of ['sidebarOverlay','sidebarMenu','sidebarToggleButton','languageToggle','languageMenu'])nodes.set(id,node(id));
 nodes.get('sidebarOverlay').classList.add('hidden');nodes.get('sidebarMenu').classList.add('translate-x-full');
 const document={body:{style:{}},getElementById:id=>nodes.get(id),addEventListener(k,fn){(listeners[k]||=[]).push(fn)},querySelectorAll(){return[]}};
 const window={};const jobs=[];
 const context=vm.createContext({window,document,console,clearTimeout(){},setTimeout(fn){jobs.push(fn);return jobs.length},requestAnimationFrame(fn){fn()}});
 vm.runInContext(fs.readFileSync(path.join(root,'script.js'),'utf8'),context);
 return{nodes,context,window,jobs,listeners};
}
test('hamburger opens and closes the sidebar; early clicks wait for the component',()=>{
 const h=setup();vm.runInContext('openSidebar()',h.context);
 assert.equal(h.nodes.get('sidebarOverlay').getAttribute('aria-hidden'),'false');
 assert.equal(h.nodes.get('sidebarToggleButton').getAttribute('aria-expanded'),'true');
 vm.runInContext('closeSidebar()',h.context);h.jobs.forEach(fn=>fn());
 assert.equal(h.nodes.get('sidebarOverlay').getAttribute('aria-hidden'),'true');
 assert(h.nodes.get('sidebarOverlay').classList.contains('hidden'));
 h.nodes.delete('sidebarMenu');vm.runInContext('openSidebar()',h.context);assert(h.window.sidebarOpenPending);
});
test('touch click toggles language dropdown and outside click closes it',()=>{
 const h=setup(),button=h.nodes.get('languageToggle'),menu=h.nodes.get('languageMenu');
 button.events.click();assert(menu.classList.contains('is-open'));assert.equal(button.getAttribute('aria-expanded'),'true');
 for(const fn of h.listeners.click)fn({target:{closest(){return null}}});
 assert.equal(menu.classList.contains('is-open'),false);assert.equal(button.getAttribute('aria-expanded'),'false');
});
test('sidebar internal destinations resolve to files and application links remain official',()=>{
 const html=fs.readFileSync(path.join(root,'components/sidebar.html'),'utf8');
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.equal(links.length,8);
 for(const url of links){if(url.startsWith('/'))assert(fs.existsSync(path.join(root,url)));else assert.equal(url,'https://www.duitjom.com/');}
});
