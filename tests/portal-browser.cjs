// Run with Playwright and a Chromium installation; no live emails/payments are sent.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
 const server=http.createServer((req,res)=>{
  let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(file.endsWith('/'))file+='index.html';
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(fs.readFileSync(file));}
  catch {res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let signedIn=false, requests=[], accountExists=false;
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/firebase-config.js')return route.fulfill({contentType:'text/javascript',body:`export const auth={};export const authPersistenceReady=Promise.resolve();export const googleProvider={};export function onAuthStateChanged(a,cb){cb(null)};export async function signOut(){};export async function signInWithPopup(){return {user:{email:'google@example.com',emailVerified:true,displayName:'Google Customer',providerData:[{providerId:'google.com'}]}}}`});
  if(u.hostname==='e-kyc.duitjom.my'){
   const data=route.request().postDataJSON();requests.push({path:u.pathname,data});
   let body={success:true},status=200;
   if(u.pathname==='/api/session') {body=signedIn?{success:true,user:{email:'customer@example.com',fullName:'Test Customer'},expiresAt:Date.now()+86400000}:{success:false,code:'SESSION_REQUIRED'};status=signedIn?200:401;}
   if(u.pathname==='/api/send-otp'||u.pathname==='/api/send-link'){
    if(data.intent==='login'&&!accountExists){body={success:false,code:'ACCOUNT_NOT_FOUND'};status=404;}
    else if(data.intent==='register'&&accountExists){body={success:false,code:'ACCOUNT_EXISTS'};status=409;}
    else body={success:true,authFlowVersion:2,challengeId:'12345678-1234-1234-1234-123456789012'};
   }
   if(u.pathname==='/api/verify-otp'){signedIn=true;accountExists=true;}
   if(u.pathname==='/api/logout')signedIn=false;
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  }
  if(u.origin===base)return route.continue();return route.abort();
 });
 await page.addInitScript(()=>{localStorage.setItem('duitjom_locale','ms');window.copied=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copied.push(text)},configurable:true});});
 await page.clock.install();await page.goto(base,{waitUntil:'networkidle'});
 assert.match(await page.locator('#welcomePopupClose').textContent(),/Tutup 60s/);
 for(const value of ['support@duitjom.my','www.duitjom.com','www.duitjom.my']) await page.locator(`[data-copy="${value}"]`).click();
 assert.deepEqual(await page.evaluate(()=>window.copied),['support@duitjom.my','www.duitjom.com','www.duitjom.my']);
 const mail=await page.locator('#welcomePopupSupport').getAttribute('href');assert(mail.includes('body=Hi%20PM-PerlukanBantuan'));
 await page.clock.fastForward(60000);assert.equal(await page.locator('#welcomePopup').getAttribute('aria-hidden'),'true');
 await page.locator('#sidebarToggleButton').click();assert.equal(await page.locator('#sidebarToggleButton').getAttribute('aria-expanded'),'true');
 await page.evaluate(()=>closeSidebar());await page.clock.fastForward(400);
 const ids=await page.locator('[id]').evaluateAll(els=>els.map(e=>e.id));assert.equal(ids.length,new Set(ids).size,'duplicate IDs');
 await page.locator('[data-auth-intent="login"]').first().click();await page.locator('#emailInput').fill('customer@example.com');await page.evaluate(()=>onLoginTurnstileSuccess('test-token'));
 await page.locator('#emailLoginButton').click();await page.waitForFunction(()=>document.querySelector('#accountSwitchNotice').hidden===false);assert.match(await page.locator('#authMessage').textContent(),/belum didaftarkan/);
 await page.locator('#accountSwitchNotice').click();assert(await page.locator('#registerName').isVisible());assert(!(await page.locator('#googleLoginButton').isVisible()));
 await page.locator('#registerName').fill('Test Customer');await page.locator('#registerIC').fill('000000000000');assert.equal(await page.locator('#registerIC').inputValue(),'000000-00-0000');await page.locator('#registerPhone').fill('0123456789');assert.equal(await page.locator('#registerPhone').inputValue(),'123456789');
 await page.evaluate(()=>onLoginTurnstileSuccess('test-signup'));await page.locator('#emailLoginButton').click();await page.waitForFunction(()=>!document.querySelector('#otpSection').hidden);assert.match(await page.locator('#resendOtpButton').textContent(),/60s/);
 assert.equal(requests.at(-1).data.intent,'register');assert.equal(requests.at(-1).data.profile.phone,'+60123456789');
 await page.clock.fastForward(60000);await page.evaluate(()=>onLoginTurnstileSuccess('resend'));await page.locator('#resendOtpButton').click();await page.waitForFunction(()=>document.querySelector('#authMessage').textContent.includes('baharu'));
 await page.locator('[data-login-otp]').first().fill('123456');await page.waitForFunction(()=>!document.querySelector('#authUserPanel').hidden);assert.equal(await page.locator('#namaInput').inputValue(),'Test Customer');
 await page.locator('#authContinueButton').click();await page.clock.fastForward(8000);assert(await page.locator('#paymentPage').isVisible());
 await page.locator('#namaInput').fill('Test Customer');await page.locator('#icInput').fill('000000000000');await page.locator('#djcustInput').fill('DJ1234');await page.locator('#phoneInput').fill('123456789');await page.locator('#amountInput').fill('50');await page.locator('#termsCheckbox').check();await page.locator('#continueBtn').click();await page.waitForURL('**/components/payment.html?**');
 assert.equal(await page.locator('#namaDisplay').textContent(),'Test Customer');assert(await page.locator('#dropdownBtn').isDisabled());
 await page.locator('#tab-online').click();assert(await page.locator('#dropdownBtn').isDisabled());assert.match(await page.locator('#methodHint').textContent(),/diselenggara/);
 await page.locator('#tab-transfer').click();assert(await page.locator('#transferModal').isVisible());assert.match(await page.evaluate(()=>contactWhatsapp.toString()),/PM-BANKTRANSFER/);await page.locator('#transferModal .secondary-button').click();
 await page.locator('#tab-duitnow').click();await page.locator('#dropdownBtn').click();assert.equal(await page.locator('[data-bank-id]').count(),6);await page.locator('[data-bank-id="duitnow_qr"]').click();await page.locator('#continueBtn').click();assert(await page.locator('#qrPage').isVisible());assert.match(await page.locator('#qrImage').getAttribute('src'),/F534F3AA/);
 await page.locator('.cancel-button').click();assert(await page.locator('#selectionPage').isVisible());
 signedIn=false;await page.goto(base,{waitUntil:'networkidle'});await page.locator('#welcomePopupCloseX').click();
 for(const locale of ['en','ms','zh']){
  await page.evaluate(l=>DJ_I18N.setLocale(l),locale);
  const missing=await page.locator('[data-i18n]').evaluateAll(els=>els.map(e=>e.dataset.i18n).filter(k=>window.DJ_I18N.t(k)===k));assert.deepEqual(missing,[],'missing translation '+locale);
 }
 await page.evaluate(()=>DJ_I18N.setLocale('en'));await page.locator('[data-auth-intent="login"]').first().click();assert.equal(await page.locator('#registerAccountLink').textContent(),'Register');assert.equal(await page.locator('#forgotPasswordLink').textContent(),'Forgot Password');
 await page.locator('#magicToggleButton').click();await page.locator('#emailInput').fill('customer@example.com');await page.evaluate(()=>onLoginTurnstileSuccess('link'));await page.locator('#emailLoginButton').click();await page.waitForFunction(()=>document.querySelector('#authMessage').textContent.includes('login link has been sent'));assert(requests.some(r=>r.path==='/api/send-link'));
 await page.locator('#googleLoginButton').click();await page.waitForFunction(()=>document.querySelector('#userDisplay').textContent.includes('google'));assert.equal(await page.locator('#authContinueButton').isDisabled(),false);
 for(const width of [360,430,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width);}
 assert.deepEqual(errors,[]);console.log('PASS: popup copy/60s, sidebar, login/register, resend, auto OTP, customer form, six banks, transfer/maintenance, QR return, three locales, magic link and Google handlers. External auth/email services mocked.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
