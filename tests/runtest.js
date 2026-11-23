const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://poxitflooring.github.io/poxit-pro/',
 beforeParse(w){w.alert=()=>{};w.confirm=()=>true;w.fetch=()=>Promise.reject('nofetch');w.scrollTo=()=>{};w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window;
setTimeout(async ()=>{try{
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
 const run=(code)=>w.eval(code);
 const total=()=>run('calcAll()');
 const sec=(k)=>run(`JSON.stringify(buildSections().find(s=>s.key==='${k}')||null)`);
 // Legacy checks run with the Site auto-fill switched off, so their expected totals stay exact
 run("window.__freshStateAuto=freshState; freshState=function(){ const s=window.__freshStateAuto(); s.auto={days:false,travel:false,waste:false}; s.client.jobType='Commercial'; return s; }; S.auto={days:false,travel:false,waste:false}; S.client.jobType='Commercial';");
 run("window.__realOpenDoc=openDoc; window.__realRender=renderPdfBlob; renderPdfBlob=function(){ return new Promise(function(){}); };");
 run("showTab('repairs')");
 ok(w.document.getElementById('cancerList')!==null,'cancer card present');
 // one small patch: 300x200 = 0.06m2 -> 108 -> min 450
 run("addCancerPatch(); S.cancerPatches[0].lengthMm=300; S.cancerPatches[0].widthMm=200;");
 let t=total(); ok(Math.abs(t-450)<0.01,'cancer min $450 applied (got '+t+')');
 // rebar add-on 2lm
 run("S.cancerRebarLm=2"); t=total(); ok(Math.abs(t-750)<0.01,'cancer + rebar 2lm = 750 (got '+t+')');
 // bigger patches: 500x400 x2 = 0.4m2 -> 720 + 0.06*1800=108 -> 828 >450
 run("addCancerPatch(); S.cancerPatches[1].lengthMm=500; S.cancerPatches[1].widthMm=400; S.cancerPatches[1].qty=2;");
 t=total(); ok(Math.abs(t-(0.46*1800+300))<0.01,'cancer area pricing 0.46m2 +rebar (got '+t+')');
 const cs=JSON.parse(sec('cancer')); ok(cs.addons.reduce((a,x)=>a+x.price,0).toFixed(2)===cs.subtotal.toFixed(2),'cancer addon lines sum to subtotal');
 // rebar standalone not charged
 run("S.cancerPatches=[]; renderCancer();"); t=total(); ok(t===0,'rebar alone not charged (got '+t+')');
 ok(w.document.getElementById('cancerRebarWarn').style.display==='block','rebar warning shows');
 run("S.cancerRebarLm=0; calcAll();");
 // pressure wash
 run("showTab('pw')"); ok(w.document.querySelectorAll('#sub-pw .radio-pill').length===3,'pw tab renders 3 tiers');
 run("addPwZone(); S.pwZones[0].area=20;"); t=total(); ok(Math.abs(t-250)<0.01,'pw 20m2 standard = 160 -> min 250 (got '+t+')');
 run("S.pwZones[0].area=50"); t=total(); ok(Math.abs(t-400)<0.01,'pw 50m2 standard = 400 (got '+t+')');
 run("setPwTier(0,'Basic')"); t=total(); ok(Math.abs(t-250)<0.01,'pw basic 50m2 = 250 (got '+t+')');
 run("S.pwJob.oil=true;renderPw()"); t=total(); ok(Math.abs(t-750)<0.01,'oil bumps to heavy 750 (got '+t+')');
 ok(w.document.querySelector('#sub-pw .radio-pill.selected').textContent==='Heavy','Heavy pill shown selected when oil');
 run("S.pwJob.aqua=true"); t=total(); ok(Math.abs(t-1250)<0.01,'aquaseal +$10/m2 = 1250 (got '+t+')');
 const ps=JSON.parse(sec('pw')); ok(ps.addons.reduce((a,x)=>a+x.price,0).toFixed(2)===ps.subtotal.toFixed(2),'pw lines sum to subtotal');
 run("S.pwZones=[];S.pwJob={tier:'Standard',oil:false,aqua:false};renderPw();");
 ok(total()===0,'pw aqua alone with no area = 0');
 // waste
 run("showTab('addons')"); ok(!!w.document.getElementById('badge-waste'),'waste card present');
 run("S.waste.enabled=true; S.waste.m2=160; S.waste.tier='Heavy'; renderAddons();"); t=total();
 ok(Math.abs(t-(160*1.57+150))<0.01,'waste heavy 160m2 + 1 run (got '+t+')');
 ok(sec('waste')&&sec('wasteRun'),'waste and run are separate lines');
 run("S.waste.runs=2"); t=total(); ok(Math.abs(t-(251.2+300))<0.01,'2 runs (got '+t+')');
 run("S.waste.runFee=false"); t=total(); ok(Math.abs(t-251.2)<0.01,'run fee off (got '+t+')');
 run("S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=40; S.services.gs=true; addZone('gs'); S.gsZones[0].area=25; useGrindArea();");
 ok(run('S.waste.m2')===65,'use job grind area = 65');
 // measure send-to pw
 run("measureShapes=[{type:'rect',v1:5,v2:4,v3:0}]; showTab('measure');");
 const opts=[...w.document.querySelectorAll('#measureDest option')].map(o=>o.value);
 ok(opts.includes('NEW:pw')&&opts.includes('waste.m2'),'measure dest includes pw + waste');
 w.document.getElementById('measureDest').value='NEW:pw'; run('sendMeasureTo()');
 ok(run('S.pwZones.length')===1 && run('S.pwZones[0].area')===20,'measure sent 20m2 to new pw area');
 // save/restore round trip
 const state=run('JSON.stringify({state:S,measureShapes:measureShapes})');
 const before=total(); run('confirmReset()'); ok(total()===0,'reset clears');
 run('restoreQuote('+state+')'); ok(Math.abs(total()-before)<0.01,'restore round-trip total matches '+before);
 // legacy quote without new keys
 run("restoreQuote({state:{client:{first:'Old'},services:{},epoxyZones:[],tintedZones:[],sealZones:[],gsZones:[],aquaZones:[],grindZones:[],polishedZones:[],careZones:[],shineZones:[],custom:{items:[]}}})");
 ok(total()===0 && Array.isArray(run('S.pwZones')),'legacy quote loads cleanly');
 // PDF generation path
 run("addCancerPatch(); S.cancerPatches[0].lengthMm=1000;S.cancerPatches[0].widthMm=500; calcAll();");
 let opened=''; w.open=()=>({document:{write:h=>opened+=h,close(){}}}); w.URL.createObjectURL=()=>'blob:x';
 try{ run('generatePDF()'); ok(true,'generatePDF runs'); }catch(e){ ok(false,'generatePDF threw '+e.message); }

 // ===== new pricing checks =====
 run("confirmReset(); S.epoxyZones=[{name:'A',sys:'Flake Internal',flake:'Standard',conc:'Hard',coat:'None',area:100,addons:JSON.parse(JSON.stringify(S.epoxyZones[0]?S.epoxyZones[0].addons:{}))}];");
 run("addZone('epoxy'); S.epoxyZones=[S.epoxyZones[S.epoxyZones.length-1]]; S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 ok(Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))===9000,'flake internal $90/m2 = 9000 (got '+Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))+')');
 run("S.epoxyZones[0].sys='Quartz Internal'; calcAll();");
 ok(Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))===9000,'quartz $90/m2 = 9000 (got '+Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))+')');
 run("S.epoxyZones[0].sys='Solid Colour — Full System'; calcAll();");
 ok(Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))===8500,'solid colour full = 8500 (got '+Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))+')');
 run("S.epoxyZones[0].sys='Solid Colour — No Topcoat'; calcAll();");
 ok(Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))===6500,'solid colour no topcoat = 6500 (got '+Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))+')');
 run("S.epoxyZones[0].flake='Natural Stone'; calcAll();");
 ok(Math.round(run('epoxyZoneTotal(S.epoxyZones[0])'))===6500,'solid colour ignores flake upcharge');
 // small job minimum
 run("S.epoxyZones[0].sys='Flake Internal'; S.epoxyZones[0].flake='Standard'; S.epoxyZones[0].area=10; calcAll();");
 ok(Math.round(total())===1800,'10m2 flake tops up to 1800 (got '+Math.round(total())+')');
 ok(run("buildSections().some(function(x){return x.key==='coatingMin';})"),'small job min is its own line');
 run("S.epoxyZones[0].area=25; calcAll();");
 ok(Math.round(total())===2250,'25m2 no min = 2250 (got '+Math.round(total())+')');
 run("S.epoxyZones[0].area=19; S.coatingMinOn=false; calcAll();");
 ok(Math.round(total())===1710,'min toggled off = 1710 (got '+Math.round(total())+')');
 run("S.coatingMinOn=true; confirmReset(); S.cracks=[{lm:2,qty:1}]; calcAll();");
 ok(!run("buildSections().some(function(x){return x.key==='coatingMin';})"),'repairs alone never trigger coating min');
 run("confirmReset(); S.pwZones=[{name:'P',area:10}]; S.pwJob={tier:'Standard',oil:false,aqua:false}; calcAll();");
 ok(!run("buildSections().some(function(x){return x.key==='coatingMin';})"),'pressure wash alone never triggers coating min');

 // ===== suburb travel dropdown =====
 run("confirmReset();");
 ok(run("document.getElementById('suburbSel')!==null"),'suburb dropdown present');
 ok(run("document.getElementById('suburbSel').options.length")>60,'suburb list populated (got '+run("document.getElementById('suburbSel').options.length")+')');
 ok(run("suburbBillableKm('Southport')")===0,'Southport inside free zone = 0km');
 ok(run("suburbBillableKm('Coolangatta')")===15.4,'Coolangatta billable 15.4km (got '+run("suburbBillableKm('Coolangatta')")+')');
 ok(run("suburbBillableKm('Nowhere Ville')")===0,'unknown suburb = 0km');
 run("document.getElementById('suburbSel').value='Coolangatta'; onSuburbChange();");
 ok(Math.abs(run('S.custom.travelKm')-15.4)<0.001,'selecting Coolangatta sets travelKm (got '+run('S.custom.travelKm')+')');
 ok(Math.abs(total()-53.9)<0.01,'Coolangatta travel fee, return trip = $53.90 (got '+total()+')');
 ok(run("buildSections().some(function(x){return x.key==='travel' && x.desc.indexOf('Coolangatta')===0;})"),'travel line names the suburb');
 run("document.getElementById('suburbSel').value='Southport'; onSuburbChange();");
 ok(total()===0,'Southport charges no travel (got '+total()+')');
 ok(run("document.getElementById('suburbNote').textContent").indexOf('free zone')>-1,'note explains free zone');
 run("document.getElementById('suburbSel').value='Palm Beach'; onSuburbChange(); S.client.address='12 Test St';");
 ok(run("S.client.suburb")==='Palm Beach','suburb saved on client record');

 // ===== save new / update =====
 run("confirmReset();");
 ok(run("document.getElementById('btnSaveNew')!==null"),'Save New button present');
 ok(run("document.getElementById('btnUpdate').style.display")==='none','Update hidden on a fresh quote');
 run("localStorage.setItem('poxit_quote_num','100'); S.client.first='Bob'; S.client.last='Jones';");
 w.fetch = () => Promise.reject(new Error('offline'));
 w.alert = () => {};
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 const ref1 = run('S.client.ref'), key1 = run('S.saveKey');
 ok(/^PXT-\d{4}-101$/.test(ref1),'Save New mints next number (got '+ref1+')');
 ok(!!key1,'save key assigned');
 ok(run("document.getElementById('btnUpdate').style.display")!=='none','Update appears after first save');
 // update must NOT burn a number or change key
 await run("if(!S.client.location)S.client.location='External'; saveQuote('update')");
 ok(run('S.client.ref')===ref1,'Update keeps same quote ref (got '+run('S.client.ref')+')');
 ok(run('S.saveKey')===key1,'Update keeps same save key');
 ok(run("localStorage.getItem('poxit_quote_num')")==='101','Update does not burn a quote number (got '+run("localStorage.getItem('poxit_quote_num')")+')');
 ok(run("JSON.parse(localStorage.getItem('poxit_saves')).length")===1,'Update overwrites row, no duplicate (got '+run("JSON.parse(localStorage.getItem('poxit_saves')).length")+')');
 // second quote for same client
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(run('S.client.ref')!==ref1,'Save New for same client mints a different ref (got '+run('S.client.ref')+')');
 ok(run("localStorage.getItem('poxit_quote_num')")==='102','second Save New increments to 102');
 ok(run("JSON.parse(localStorage.getItem('poxit_saves')).length")===2,'two separate saved quotes');
 ok(run("S.client.first")==='Bob','client details retained across Save New');
 // reset clears the update target
 run("confirmReset();");
 ok(!run('S.saveKey'),'reset clears save key');
 ok(run("document.getElementById('btnUpdate').style.display")==='none','Update hidden again after reset');

 // ===== split clear: job vs client =====
 run("confirmReset(false);");
 run("S.client.first='Bob'; S.client.last='Jones'; S.client.phone='0400'; S.client.email='b@x.com'; S.client.address='12 Test St'; S.client.suburb='Coolangatta';");
 run("S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 ok(total()>0,'job priced before clear (got '+total()+')');
 run("confirmReset(); S.auto.travel=true; calcAll();");
 ok(run("S.epoxyZones.length")===0 && Math.abs(total()-53.9)<0.01,'Clear Job wipes job entries, only retained-suburb return travel remains (got '+total()+')');
 ok(run("S.epoxyZones.length")===0,'Clear Job removes zones');
 ok(run("S.client.first")==='Bob','Clear Job keeps client first name');
 ok(run("S.client.phone")==='0400','Clear Job keeps phone');
 ok(run("S.client.address")==='12 Test St','Clear Job keeps street address');
 ok(run("S.client.suburb")==='Coolangatta','Clear Job keeps suburb');
 ok(run("S.custom.travelKm")===15.4,'Clear Job re-applies suburb travel km (got '+run("S.custom.travelKm")+')');
 ok(run("S.client.ref")==='','Clear Job clears quote ref');
 ok(!run("S.saveKey"),'Clear Job clears save key');
 // clear the client only, job stays
 run("S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 const jobTot = total();
 run("clearClient();");
 ok(Math.abs(jobTot-total()-53.9)<0.01,'Clear Client only removes the travel fee from total (got '+(jobTot-total())+')');
 ok(run("S.client.first")==='','Clear Client wipes name');
 ok(run("S.client.email")==='','Clear Client wipes email');
 ok(run("S.client.suburb")==='','Clear Client wipes suburb');
 ok(run("S.custom.travelKm")===0,'Clear Client drops travel km (got '+run("S.custom.travelKm")+')');
 ok(total()===9000 && run("S.epoxyZones.length")===1,'Clear Client leaves job entries priced (got '+total()+')');
 ok(run("document.querySelector('[onclick=\"clearClient()\"]')!==null"),'Clear Client button present in client card');

 // ===== travel: return trip x days =====
 run("confirmReset(false); document.getElementById('suburbSel').value='Coolangatta'; onSuburbChange();");
 ok(run("S.custom.travelDays")===1,'travel days defaults to 1 (got '+run("S.custom.travelDays")+')');
 ok(Math.abs(total()-53.9)<0.01,'1 day Coolangatta = return 30.8km = $53.90 (got '+total()+')');
 run("S.custom.travelDays=2;");
 ok(Math.abs(total()-107.8)<0.01,'2 days = $107.80 (got '+total()+')');
 run("S.custom.travelDays=3;");
 ok(Math.abs(total()-161.7)<0.01,'3 days = $161.70 (got '+total()+')');
 ok(run("buildSections().find(x=>x.key==='travel').desc").indexOf('return trip x 3 days')>-1,'travel line states return trip and days');
 ok(run("buildSections().find(x=>x.key==='travel').desc").indexOf('92.4km')>-1,'travel line shows total km driven');
 run("S.custom.travelDays=0;");
 ok(Math.abs(total()-53.9)<0.01,'0 days floors to 1 (got '+total()+')');
 run("S.custom.travelDays=1; document.getElementById('suburbSel').value='Southport'; onSuburbChange();");
 ok(total()===0,'free zone suburb still charges nothing regardless of days (got '+total()+')');
 ok(run("document.getElementById('travelDays')!==null"),'days on site field present');

 // ===== duplicate detection + richer save labels =====
 run("confirmReset(false); localStorage.clear(); localStorage.setItem('poxit_quote_num','200');");
 w.fetch = () => Promise.reject(new Error('offline'));
 let confirms = [], confirmAnswer = false;
 w.confirm = (m) => { if (/Reset|Clear/i.test(m)) return true; confirms.push(m); return confirmAnswer; };
 w.alert = () => {};
 run("S.client.first='Bob'; S.client.last='Jones'; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 const firstRef = run('S.client.ref');
 ok(confirms.length===0,'first save of a client raises no duplicate prompt');
 // same client, same total -> should prompt
 run("confirmReset(false); S.client.first='Bob'; S.client.last='Jones'; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 confirms = []; confirmAnswer = false;
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(confirms.length===1,'same client + same total prompts duplicate (got '+confirms.length+')');
 ok(confirms[0].indexOf('Bob Jones')>-1,'prompt names the client');
 ok(run('S.client.ref')!==firstRef,'declining the prompt still saves as new quote');
 ok(run("localStorage.getItem('poxit_quote_num')")==='202','declining burns a number as expected');
 // same client, different total -> silent
 run("confirmReset(false); S.client.first='Bob'; S.client.last='Jones'; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=55; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 confirms = [];
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(confirms.length===0,'different total is a genuine variant, no prompt (got '+confirms.length+')');
 // accepting the prompt loads the existing quote instead of saving
 run("confirmReset(false); S.client.first='Bob'; S.client.last='Jones'; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 confirms = []; confirmAnswer = true;
 const numBefore = run("localStorage.getItem('poxit_quote_num')");
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(run("localStorage.getItem('poxit_quote_num')")===numBefore,'accepting the prompt burns no quote number');
 ok(!!run('S.saveKey'),'accepting the prompt loads the existing quote as update target');
 ok(run("document.getElementById('btnUpdate').style.display")!=='none','Update button live after loading the duplicate');
 // unnamed quotes never trigger it
 run("confirmReset(false); S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].area=100; S.epoxyZones[0].sys='Flake Internal'; calcAll();");
 confirms = []; confirmAnswer = false;
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(confirms.length===0,'unnamed quote never prompts');
 // update never prompts
 confirms = [];
 await run("if(!S.client.location)S.client.location='External'; saveQuote('update')");
 ok(confirms.length===0,'Update never raises a duplicate prompt');
 // service label
 run("confirmReset(false); S.services.epoxy=true; S.services.gs=true;");
 const lbl = run("quoteServiceLabel({state:S})");
 ok(lbl.indexOf('Epoxy Flooring')>-1 && lbl.indexOf('Grind & Seal')>-1,'save label lists services (got '+lbl+')');
 ok(lbl.indexOf('&amp;')===-1,'save label unescapes ampersand');
 ok(run("quoteServiceLabel({state:{services:{}}})")==='','no services gives empty label');
 ok(run("quoteServiceLabel('not json')")==='','bad payload does not throw');
 ok(run("stampNow()").indexOf(':')>-1,'save stamp includes a time');
 // ===== line marking =====
 run("confirmReset(false);");
 ok(run("document.getElementById('sub-lm')!==null"),'line marking tab present');
 ok(run("SUB_NAV.indexOf('lm')===SUB_NAV.indexOf('pw')+1"),'line marking sits after pressure wash in the Services panels');
 ok(run("S.lmJob.material")==='Epoxy','defaults to epoxy');
 run("showTab('lm')");
 ok(run("document.getElementById('lmContainer').innerHTML.length")>100,'line marking tab renders');
 run("addLmLine('safety'); S.lmLines[0].qty=100;");
 ok(Math.abs(total()-1500)<0.01,'100lm epoxy safety line = $1500 (got '+total()+')');
 run("S.lmJob.material='Paint';");
 ok(Math.abs(total()-900)<0.01,'100lm paint safety line = $900 (got '+total()+')');
 run("S.lmJob.remark=true;");
 ok(Math.abs(total()-675)<0.01,'re-mark takes 25% off lines (got '+total()+')');
 run("addLmLine('stencil'); S.lmLines[1].qty=2;");
 ok(Math.abs(total()-915)<0.01,'stencils not discounted on re-mark: 675+240 (got '+total()+')');
 run("addLmLine('removal'); S.lmLines[2].qty=10;");
 ok(Math.abs(total()-1055)<0.01,'line removal $14/lm not discounted (got '+total()+')');
 // minimum
 run("confirmReset(false); addLmLine('stencil'); S.lmLines[0].qty=1;");
 ok(Math.abs(total()-450)<0.01,'small job tops up to $450 minimum (got '+total()+')');
 ok(run("buildSections().find(x=>x.key==='lm').addons.some(a=>a.label.indexOf('Minimum')>-1)"),'minimum shows as its own line');
 run("S.lmLines[0].qty=0;");
 ok(total()===0,'no qty means no charge and no minimum');
 // hatching + bays
 run("confirmReset(false); addLmLine('hatch'); S.lmLines[0].qty=10; addLmLine('accessible'); S.lmLines[1].qty=1;");
 ok(Math.abs(total()-850)<0.01,'epoxy 10m2 hatching + accessible bay = 450+400 (got '+total()+')');
 ok(run("buildSections().find(x=>x.key==='lm').desc").indexOf('new set-out')>-1,'quote line says new set-out');
 // does not trip coating minimum
 ok(!run("buildSections().some(x=>x.category && x.category.indexOf('Small Job Minimum')>-1)"),'line marking does not trigger $1800 coating minimum');
 // label + save round trip
 ok(run("quoteServiceLabel({state:S})").indexOf('Line Marking')>-1,'saved quote label shows Line Marking');
 run("var snap=JSON.stringify({state:S,measureShapes:[]}); confirmReset(false); restoreQuote(JSON.parse(snap));");
 ok(run("S.lmLines.length")===2 && Math.abs(total()-850)<0.01,'line marking survives save and restore (got '+total()+')');
 run("var old=JSON.parse(snap); delete old.state.lmLines; delete old.state.lmJob; confirmReset(false); restoreQuote(old);");
 ok(run("Array.isArray(S.lmLines) && S.lmJob.material==='Epoxy'"),'old quotes without line marking still load');
 run("confirmReset(false);");
 // ===== skim coat =====
 run("confirmReset(false);");
 ok(run("document.getElementById('badge-skim')!==null"),'skim coat card present on repairs');
 run("S.skim.area=20;");
 ok(Math.abs(total()-400)<0.01,'skim coat 20m2 @ $20 = $400 (got '+total()+')');
 run("S.skim.area=150;");
 ok(Math.abs(total()-3000)<0.01,'skim coat 150m2 = $3000 (got '+total()+')');
 run("S.skim.area=5;");
 ok(Math.abs(total()-400)<0.01,'small skim tops up to $400 minimum (got '+total()+')');
 ok(run("buildSections().find(x=>x.key==='skim').addons.some(a=>a.label.indexOf('Minimum')>-1)"),'skim minimum shows as its own line');
 run("S.skim.area=20;");
 ok(run("buildSections().find(x=>x.key==='skim').addons[0].label").indexOf('20m²')>-1,'skim line shows area');
 ok(!run("buildSections().some(x=>x.category && x.category.indexOf('Small Job Minimum')>-1)"),'skim coat does not trigger coating minimum');
 ok(run("document.getElementById('measureDest')? document.getElementById('measureDest').innerHTML.indexOf('skim.area')>-1 : true"),'skim coat available as measure send-to');
 ok(run("quoteServiceLabel({state:S})").indexOf('Skim Coat')>-1,'saved label shows Skim Coat');
 run("var o2=JSON.parse(JSON.stringify({state:S})); delete o2.state.skim; confirmReset(false); restoreQuote(o2);");
 ok(run("S.skim && S.skim.area===0"),'old quotes without skim coat still load');
 run("confirmReset(false);");
 // ===== pressure clean plan =====
 run("confirmReset(false); showTab('pw');");
 ok(run("document.getElementById('pwPlanContainer')!==null && document.getElementById('pwPlanOn')!==null"),'plan card + toggle on pressure wash tab');
 ok(run("S.pwPlan.freq==='Six Monthly' && S.pwPlan.tier==='Standard' && !S.pwPlan.enabled"),'plan defaults: six monthly, Standard, off');
 run("S.pwPlan.enabled=true; S.pwPlan.area=200; S.pwPlan.freq='Quarterly'; calcAll();");
 var pc=run("JSON.stringify(pwPlanCalc())"); pc=JSON.parse(pc);
 ok(Math.abs(pc.perVisit-1280)<0.01,'quarterly 200m2 Standard per visit $1280 (got '+pc.perVisit+')');
 ok(Math.abs(pc.annual-5120)<0.01,'quarterly annual $5120');
 ok(Math.abs(pc.monthly-426.67)<0.01,'quarterly monthly $426.67 (got '+pc.monthly+')');
 ok(Math.abs(total())<0.01,'plan never adds to the quote total (got '+total()+')');
 run("S.pwPlan.freq='Six Monthly'; calcAll();"); pc=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(pc.perVisit-1360)<0.01 && Math.abs(pc.annual-2720)<0.01,'six monthly 15% off: $1360/visit, $2720/yr');
 run("S.pwPlan.freq='Annual'; calcAll();"); pc=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(pc.perVisit-1440)<0.01 && Math.abs(pc.monthly-120)<0.01,'annual 10% off: $1440/visit, $120/mth');
 run("S.pwPlan.tier='Basic'; S.pwPlan.freq='Quarterly'; calcAll();"); pc=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(pc.perVisit-800)<0.01,'Basic quarterly 200m2 = $800/visit');
 run("S.pwPlan.tier='Standard'; S.pwPlan.area=20; calcAll();"); pc=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(pc.perVisit-250)<0.01 && pc.minApplied,'small plan floors at $250 a visit');
 ok(Math.abs(pc.monthly-83.33)<0.01,'20m2 quarterly at the floor = $83.33/mth (got '+pc.monthly+')');
 ok(run("document.getElementById('badge-pwPlan').textContent").indexOf('83.33')>=0,'plan badge shows monthly');
 ok(run("document.getElementById('summaryPlan').innerHTML").indexOf('Pressure Clean Plan')>=0,'summary shows plan figures for Dom');
 run("S.pwPlan.area=200; S.pwPlan.showQuote=false; calcAll();");
 var d0=run("pwPlanDocHTML(S.pwPlan.showQuote)");
 ok(d0.indexOf('469.33')>=0 && d0.indexOf('5,350.40')>=0,'quote shows monthly and yearly upfront inc GST');
 ok(d0.indexOf('Annual (Ex GST)')<0 && d0.indexOf('Per Visit')<0,'breakdown hidden on quote by default');
 ok(d0.indexOf('additional charge may apply')>=0,'dirty floor add-on term printed');
 ok(!/[\u2014\u2013]/.test(d0) && d0.indexOf(' - ')<0,'no dashes in client plan copy');
 run("S.pwPlan.showQuote=true;");
 var d1=run("pwPlanDocHTML(S.pwPlan.showQuote)");
 ok(d1.indexOf('5,120')>=0 && d1.indexOf('1,280')>=0,'breakdown toggle shows annual + per visit');
 run("window.__doc=''; openDoc=function(h){window.__doc=h;}; generatePDF();");
 ok(run("window.__doc").indexOf('Pressure Clean Plan')>=0,'plan box lands on quote PDF');
 run("S.pwPlan.showInvoice=false; makeInvoice('deposit');"); await run("window.__invoiceDone");
 var inv=run("window.__doc");
 ok(inv.indexOf('Pressure Clean Plan')>=0 && inv.indexOf('Annual (Ex GST)')<0,'invoice shows plan, breakdown off independently');
 run("S.pwPlan.showInvoice=true; makeInvoice('deposit');"); await run("window.__invoiceDone");
 ok(run("window.__doc").indexOf('Annual (Ex GST)')>=0,'invoice breakdown toggle works');
 run("S.pwPlan.enabled=false; calcAll(); generatePDF();");
 ok(run("window.__doc").indexOf('Pressure Clean Plan')<0,'plan off = nothing on quote');
 run("S.pwPlan.enabled=true; populateMeasureDest();");
 ok(run("document.getElementById('measureDest').innerHTML").indexOf('pwPlan.area')>=0,'measure can send to plan area');
 ok(run("quoteServiceLabel({state:S})").indexOf('Pressure Clean Plan')>=0,'saved label lists the plan');
 run("var o3=JSON.parse(JSON.stringify({state:S})); var keep=JSON.stringify(o3); confirmReset(false); restoreQuote(JSON.parse(keep));");
 ok(run("S.pwPlan.enabled && S.pwPlan.area===200 && S.pwPlan.showInvoice"),'plan survives save/restore');
 run("var o4=JSON.parse(JSON.stringify({state:S})); delete o4.state.pwPlan; confirmReset(false); restoreQuote(o4);");
 ok(run("S.pwPlan && S.pwPlan.enabled===false"),'old quotes load with plan off');
 run("S.pwZones=[{name:'Drive',area:85}]; S.pwPlan.enabled=true; renderPwPlan(); pwPlanUseWashArea();");
 ok(run("S.pwPlan.area")===85,'use wash area copies the wash m2');
 run("confirmReset(false);");
 // ===== plan v2: monthly tier, sign up bonus, upfront, minimums =====
 run("confirmReset(false); showTab('pw'); S.pwPlan.enabled=true; S.pwPlan.area=200; S.pwPlan.freq='Monthly'; renderPwPlan(); calcAll();");
 var q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(run("Object.keys(PRICE.pwPlan).join(',')")==='Monthly,Quarterly,Six Monthly,Annual','four frequencies, Monthly first');
 ok(Math.abs(q.perVisit-1200)<0.01 && Math.abs(q.monthly-1200)<0.01,'Monthly 25% off: 200m2 $1200/visit, $1200/mth');
 ok(Math.abs(q.rewardVisit-800)<0.01 && Math.abs(q.credit-400)<0.01,'Monthly bonus visit 50% off = $800, credit $400');
 ok(q.minMonths===12 && q.minVisits===12,'Monthly min 12 months / 12 visits');
 run("S.pwPlan.freq='Quarterly'; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(q.rewardVisit-960)<0.01 && Math.abs(q.credit-320)<0.01,'Quarterly bonus visit 40% off = $960, credit $320');
 ok(Math.abs(q.upfront-4864)<0.01 && Math.abs(q.upfrontInc-5350.40)<0.01,'yearly upfront 5% off: $4864 ex, $5350.40 inc');
 ok(q.minMonths===12 && q.minVisits===4 && Math.abs(q.termValue-4800)<0.01,'Quarterly min 4 visits, term value $4800 after credit');
 run("S.pwPlan.freq='Six Monthly'; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(q.credit-240)<0.01 && q.minVisits===2,'Six Monthly bonus 30% off, credit $240, min 2 visits');
 run("S.pwPlan.freq='Annual'; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(q.minMonths===24 && q.minVisits===2,'Annual needs 24 months / 2 visits');
 ok(Math.abs(q.credit-160)<0.01,'Annual bonus 20% off, credit $160');
 run("S.pwPlan.freq='Monthly'; S.pwPlan.area=60; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(Math.abs(q.perVisit-360)<0.01 && Math.abs(q.rewardVisit-250)<0.01 && Math.abs(q.credit-110)<0.01,'bonus visit never below $250 (60m2 monthly credit capped at $110)');
 run("S.pwPlan.area=20; S.pwPlan.freq='Quarterly'; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(q.credit===0,'at the $250 floor there is no bonus credit');
 ok(run("pwPlanDocHTML(false)").indexOf('Sign Up Bonus')<0,'no bonus line printed when credit is zero');
 run("S.pwPlan.area=200; calcAll();");
 var dq=run("pwPlanDocHTML(false)");
 ok(dq.indexOf('Sign Up Bonus')>=0 && dq.indexOf('352.00')>=0,'bonus line on quote, $352 inc GST');
 ok(dq.indexOf('Minimum Commitment')>=0 && dq.indexOf('12 months (4 visits)')>=0,'minimum commitment printed');
 ok(dq.indexOf('Pay Yearly Upfront')>=0,'yearly upfront option printed');
 ok(!/[\u2014\u2013]/.test(dq),'no dashes in plan copy v2');
 run("S.pwPlan.reward=false; calcAll();"); q=JSON.parse(run("JSON.stringify(pwPlanCalc())"));
 ok(q.credit===0 && run("pwPlanDocHTML(false)").indexOf('Sign Up Bonus')<0,'bonus toggle off removes credit + line');
 ok(Math.abs(total())<0.01,'plan v2 still never touches quote total');
 run("var o5=JSON.parse(JSON.stringify({state:S})); delete o5.state.pwPlan.reward; o5.state.pwPlan.freq='Weekly'; confirmReset(false); restoreQuote(o5);");
 ok(run("S.pwPlan.reward===true && S.pwPlan.freq==='Six Monthly'"),'older plan quotes get bonus on + bad freq fixed');
 run("confirmReset(false);");
 // ===== plan payment picker =====
 run("confirmReset(false); showTab('pw'); S.pwPlan.enabled=true; S.pwPlan.area=200; S.pwPlan.freq='Quarterly'; renderPwPlan(); calcAll();");
 ok(run("S.pwPlan.pay")==='Client Chooses','payment defaults to client chooses');
 var pb=run("pwPlanDocHTML(false)");
 ok(pb.indexOf('469.33')>=0 && pb.indexOf('5,350.40')>=0,'client chooses shows both prices');
 run("setPwPlanPay(0,'Monthly');"); var pm=run("pwPlanDocHTML(false)");
 ok(pm.indexOf('469.33')>=0 && pm.indexOf('5,350.40')<0,'Monthly shows monthly only');
 run("setPwPlanPay(0,'Yearly Upfront');"); var py=run("pwPlanDocHTML(false)");
 ok(py.indexOf('5,350.40')>=0 && py.indexOf('469.33')<0,'Yearly shows yearly only');
 ok(!/[\u2014\u2013]/.test(pm+py),'no dashes in payment copy');
 run("window.__doc=''; openDoc=function(h){window.__doc=h;}; makeInvoice('deposit');"); await run("window.__invoiceDone");
 ok(run("window.__doc").indexOf('5,350.40')>=0 && run("window.__doc").indexOf('469.33')<0,'invoice follows chosen payment');
 run("var o6=JSON.parse(JSON.stringify({state:S})); delete o6.state.pwPlan.pay; confirmReset(false); restoreQuote(o6);");
 ok(run("S.pwPlan.pay")==='Client Chooses','older quotes default to client chooses');
 run("confirmReset(false);");
 // ===== document file names =====
 run("confirmReset(false); S.client.first='Mario'; S.client.last='Fairlie'; S.client.area='Garage'; S.client.ref='PXT-2026-014'; S.services={epoxy:true}; calcAll();");
 run("window.__doc=''; openDoc=function(h){window.__doc=h;}; generatePDF();");
 ok(run("window.__doc").indexOf('<title>Mario Fairlie - Garage - Epoxy Quote - PXT-2026-014</title>')>=0,'quote file name: name, area, job, ref');
 run("window.__doc=''; makeInvoice('deposit');"); await run("window.__invoiceDone");
 ok(/<title>Mario Fairlie - Garage - Epoxy Deposit Invoice - INV-\d{4}-\d{3}<\/title>/.test(run("window.__doc")),'invoice file name ends in invoice number (opens as deposit)');
 run("S.client.area=''; S.epoxyZones=[{name:'Patio'}];");
 ok(run("docFileName('Quote','PXT-1')")==='Mario Fairlie - Patio - Epoxy Quote - PXT-1','blank area falls back to zone name');
 run("S.epoxyZones=[]; S.client.ref='';");
 ok(run("docFileName('Quote','')")==='Mario Fairlie - Epoxy Quote','missing parts are skipped cleanly');
 run("S.services={epoxy:true,gs:true,seal:true};");
 ok(run("docFileName('Quote','X')")==='Mario Fairlie - Epoxy Quote - X','multi service defaults to first service only');
 run("S.lmLines=[{type:'safety',qty:10}]; setDocService('Line Marking');");
 ok(run("docFileName('Quote','X')")==='Mario Fairlie - Line Marking Quote - X','picked service used in name');
 run("setDocService('Grind & Seal');");
 ok(run("docFileName('Quote','X')")==='Mario Fairlie - Grind and Seal Quote - X','picked service shortened');
 run("showTab('summary'); calcAll();");
 ok(run("document.querySelectorAll('#summaryDocName select option').length")===4,'summary dropdown lists all services');
 ok(run("document.querySelector('#summaryDocName select').value")==='Grind & Seal','dropdown shows current pick');
 ok(run("document.getElementById('summaryDocName').textContent").indexOf('Grind and Seal Quote')>=0,'summary previews PDF name');
 run("S.services={epoxy:true}; S.lmLines=[]; calcAll();");
 ok(run("docFileName('Quote','X')")==='Mario Fairlie - Epoxy Quote - X','pick no longer on quote falls back to first');
 ok(run("document.querySelectorAll('#summaryDocName select').length")===0,'no dropdown with a single service');
 run("var o8=JSON.parse(JSON.stringify({state:S})); delete o8.state.docService; confirmReset(false); restoreQuote(o8);");
 ok(run("S.docService")==='','older quotes load with no pick');
 run("S.client.area='Garage';");
 run("S.client.area='Garage/Shed';");
 ok(run("docFileName('Quote','X')").indexOf('/')<0,'illegal filename characters stripped');
 run("var o7=JSON.parse(JSON.stringify({state:S})); delete o7.state.client.area; confirmReset(false); restoreQuote(o7);");
 ok(run("S.client.area")==='','older quotes load with blank area');
 run("confirmReset(false);");
 // ===== document view: one view on every device, Export, real text PDFs =====
 var __src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
 run("closeDocOverlay(); openDoc=window.__realOpenDoc; window.__oo=window.open; window.__opened=0; window.open=function(){ window.__opened++; return null; };");
 run("window.__renders=[]; window.__renderGate=null; window.__renderFail=false; renderPdfBlob=function(h){ window.__renders.push(h); if(window.__renderFail) return Promise.reject(new Error('Could not load the PDF maker')); var b=new Blob(['%PDF-1.4 text '+window.__renders.length],{type:'application/pdf'}); var g=window.__renderGate; return g ? g.then(function(){return b;}) : Promise.resolve(b); };");
 run("docCtx=null; openDoc('<html><head><title>Mario Fairlie - Garage - Epoxy Quote - PXT-2026-014</title></head><body>DOC<scr'+'ipt>window.onload = function(){ window.print(); };</scr'+'ipt></body></html>');");
 ok(run("window.__opened")===0 && !!run("document.getElementById('docOverlay')"),'documents open in the in-app view, never a new tab');
 ok(run("document.getElementById('docOverlayFrame').srcdoc").indexOf('DOC')>=0 && run("document.getElementById('docOverlayFrame').srcdoc").indexOf('window.print()')<0,'view holds the document and does not auto print');
 ok(__src.indexOf('createObjectURL(blob)')<0 && run("String(openDoc)").indexOf('window.open')<0,'no blob tabs anywhere');
 await run("window.__docPdfReady");
 ok(run("document.getElementById('docExportBtn').textContent")==='⬆ Export' && run("document.getElementById('docExportBtn').disabled")===false,'Export is ready once the PDF is made');
 ok(run("window.__docPdf.name")==='Mario Fairlie - Garage - Epoxy Quote - PXT-2026-014.pdf' && run("window.__docPdf.type")==='application/pdf','PDF named from the document');
 ok(run("String(window.__realRender)").indexOf("replace('window.onload = function(){ window.print(); };', '')")>=0,'PDF made from the document without the auto print');
 ok(run("document.getElementById('docOverlay').textContent").indexOf('Print')>=0,'browser view keeps a Print button');
 ok(__src.indexOf('html2pdf')<0,'old image-based PDF maker is gone');
 // home screen app: buttons below the status bar, no Print (iPhone blocks it there)
 run("closeDocOverlay(); window.navigator.__defineGetter__('standalone',function(){return true;}); openDoc('<html><head><title>T</title></head><body>D</body></html>');");
 ok(run("isHomeScreenApp()")===true && run("document.querySelector('#docOverlay > div').getAttribute('style')").indexOf('50px')>=0,'home screen app: buttons pushed below the status bar');
 ok(run("document.getElementById('docOverlay').textContent").indexOf('Print')<0 && run("document.getElementById('docOverlay').textContent").indexOf('Close')>=0,'home screen app: Export and Close, no dead Print button');
 run("closeDocOverlay(); window.navigator.__defineGetter__('standalone',function(){return false;});");
 // Export on an unsaved quote: share sheet with the file only, no Drive
 run("window.__shared=null; navigator.canShare=function(d){return !!(d.files&&d.files.length);}; navigator.share=function(d){window.__shared=d; return Promise.resolve();}; window.__posts9=[]; window.__fo9=window.fetch; window.fetch=function(u,o){ window.__posts9.push(o&&o.body?JSON.parse(o.body):String(u)); return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',updated:false}));}}); };");
 run("confirmReset(false); docCtx=null; openDoc('<html><head><title>Ann Lee - Epoxy Quote</title></head><body>D</body></html>');"); await run("window.__docPdfReady");
 await run("exportDoc()");
 ok(run("Object.keys(window.__shared).join(',')")==='files' && run("window.__shared.files.length")===1 && run("window.__shared.files[0].name")==='Ann Lee - Epoxy Quote.pdf','share sheet gets the PDF only, no title (so Drive saves no stray .txt)');
 ok(run("window.__posts9.length")===0 && run("document.getElementById('driveNote').textContent").indexOf('save the quote first')>=0,'unsaved quote: shared, not saved to Drive, and says why');
 ok(run("document.getElementById('docExportBtn').textContent")==='⬆ Export','Export button is ready again afterwards');
 run("navigator.share=function(){var e=new Error('x'); e.name='AbortError'; return Promise.reject(e);};");
 await run("exportDoc()");
 ok(run("document.getElementById('driveNote').textContent").indexOf('Share failed')<0,'closing the share sheet is not an error');
 // no share sheet (computer): downloads instead
 run("navigator.canShare=undefined; window.__dl=null; window.URL.createObjectURL=window.URL.createObjectURL||function(){return 'blob:x';}; window.__ac=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ window.__dl=this.download; };");
 await run("exportDoc()");
 ok(run("window.__dl")==='Ann Lee - Epoxy Quote.pdf','no share sheet: the PDF downloads instead');
 run("HTMLAnchorElement.prototype.click=window.__ac;");
 // PDF fails: says so, offers a retry
 run("window.__renderFail=true; openDoc('<html><head><title>X</title></head><body>D</body></html>');"); await run("window.__docPdfReady");
 ok(run("document.getElementById('docExportBtn').textContent").indexOf('Retry')>=0 && run("document.getElementById('driveNote').textContent").indexOf('PDF failed')>=0,'PDF failure shows a message and a retry');
 run("window.__renderFail=false;"); await run("document.getElementById('docExportBtn').onclick()");
 ok(run("document.getElementById('docExportBtn').textContent")==='⬆ Export','retry makes the PDF');
 // a slow, older PDF never replaces a newer one
 run("var rel; window.__renderGate=new Promise(function(r){rel=r;}); openDoc('<html><head><title>Old</title></head><body>1</body></html>'); window.__renderGate=null; openDoc('<html><head><title>New</title></head><body>2</body></html>');");
 await run("window.__docPdfReady"); run("rel();"); await new Promise(function(r){setTimeout(r,20);});
 ok(run("window.__docPdf.name")==='New.pdf','an older PDF finishing late is ignored');
 run("closeDocOverlay();");
 ok(run("window.__docPdf")===null,'closing clears the PDF');
 // capture prep: brand fonts, capitals, whole-pixel sizes, characters the fonts carry
 var pd=new JSDOM('<html><head><style>.h{font-family:Montserrat,sans-serif;font-weight:700;text-transform:uppercase;font-size:11.5px}.b{font-family:"Open Sans",sans-serif;font-weight:600}.i{font-family:"Open Sans";font-style:italic;font-weight:700}.x{font-family:Montserrat;font-weight:800}</style></head><body><div class="h">payment schedule</div><p class="b">\u{1F527} Epoxy ↳ Non-slip ✓ 42m² · $1,200.00 — done</p><span class="i">note</span><b class="x">TOTAL</b><div class="terms-select">x</div></body></html>',{pretendToBeVisual:true});
 w.pdfPrepareDoc(pd.window); var pdd=pd.window.document;
 var hEl=pdd.querySelector('.h'), bEl=pdd.querySelector('.b'), iEl=pdd.querySelector('.i'), xEl=pdd.querySelector('.x');
 ok(hEl.textContent==='PAYMENT SCHEDULE' && hEl.style.getPropertyValue('text-transform')==='none','uppercase written into the text');
 ok(hEl.style.getPropertyValue('font-family')==='PxMont' && hEl.style.getPropertyValue('font-weight')==='700' && hEl.style.getPropertyValue('font-size')==='12px','Montserrat mapped to the embedded copy, size snapped to a whole pixel');
 ok(bEl.style.getPropertyValue('font-family')==='PxOpen' && bEl.style.getPropertyValue('font-weight')==='600','Open Sans mapped to the embedded copy at its weight');
 ok(iEl.style.getPropertyValue('font-family')==='PxOpen' && iEl.style.getPropertyValue('font-weight')==='400','italic text uses the embedded italic');
 ok(xEl.style.getPropertyValue('font-weight')==='800','extra bold kept');
 ok(bEl.textContent.indexOf('Epoxy › Non-slip')>=0 && !/[\u{1F527}✓]/u.test(bEl.textContent) && bEl.textContent.indexOf('42m² · $1,200.00 — done')>=0,'emoji dropped, arrow swapped, $ ² · — kept');
 var pst=[].map.call(pdd.querySelectorAll('style'),function(s){return s.textContent;}).join('');
 ok(pst.indexOf("url('https://poxitflooring.github.io/poxit-pro/fonts/PxMont-700.ttf')")>=0 && /\.terms-select\{display:none!important;\}/.test(pst) && pst.indexOf('font-kerning:none')>=0,'fonts load from the site, payment buttons hidden, kerning off');
 ok(fs.existsSync('/home/claude/poxit-pro/fonts/PxMont-700.ttf') && fs.existsSync('/home/claude/poxit-pro/fonts/OFL.txt') && run("PDF_FACES.length")===8 && run("PDF_FACES").every(function(f){return fs.existsSync('/home/claude/poxit-pro/fonts/'+f[3]+'.ttf');}),'every font file the PDF uses is in the repo, with its licence');
 run("window.fetch=window.__fo9; window.open=window.__oo;");
 // ===== company details on documents =====
 run("closeDocOverlay(); window.__bsb=COMPANY.bankBSB; window.__acct=COMPANY.bankAccount; COMPANY.bankBSB=''; COMPANY.bankAccount=''; confirmReset(false); S.client.first='Mario'; S.client.last='Fairlie'; S.client.area='Garage'; S.client.ref='PXT-2026-014'; S.services={epoxy:true}; calcAll(); window.__alc=0; window.__alo2=window.alert; window.alert=function(m){ if(/BSB/.test(String(m))) window.__alc++; }; window.__doc=''; openDoc=function(h){window.__doc=h;};");
 run("generatePDF();"); var qd=run("window.__doc");
 run("makeInvoice('deposit');"); await run("window.__invoiceDone"); var idoc=run("window.__doc");
 var idLine='Poxit Flooring Pty Ltd&nbsp;&nbsp;|&nbsp;&nbsp;ABN 23 702 727 535&nbsp;&nbsp;|&nbsp;&nbsp;ACN 702 727 535';
 ok(qd.indexOf('<div class="doc-company">'+idLine+'</div>')>=0,'quote header shows company, ABN and ACN');
 ok(idoc.indexOf('<div class="doc-company">'+idLine+'</div>')>=0,'invoice header shows company, ABN and ACN');
 ok((qd+idoc).indexOf('11 743 009 073')<0 && (qd+idoc).indexOf('11743009073')<0,'old ABN gone from quote and invoice');
 ok((qd+idoc).indexOf('17789072')<0,'old personal account number gone');
 ok(idoc.indexOf('Account Name: <strong>Poxit Flooring Pty Ltd</strong>')>=0,'invoice bank box uses company account name');
 ok(qd.indexOf('1/12 Dorretti Circuit, Upper Coomera QLD 4209')>=0 && qd.indexOf('www.poxitflooring.com.au')>=0,'footer shows registered office and web');
 ok(idoc.indexOf('Poxit Flooring Pty Ltd ABN 23 702 727 535')>=0,'invoice disclaimer carries the company ABN');
 ok(idoc.indexOf('GST')>=0 && qd.indexOf('GST')>=0,'GST still shown on totals');
 ok(!/CEO|Sole Trader/i.test(qd+idoc),'no CEO or Sole Trader wording');
 ok(run("window.__alc")===1,'warns before an invoice goes out without bank details');
 ok(run("window.__alc")===1 && idoc.indexOf('[FILL IN]')>=0,'unset bank details show [FILL IN]');
 run("COMPANY.bankBSB='000 000'; COMPANY.bankAccount='12345678'; window.__alc=0; makeInvoice('deposit');"); await run("window.__invoiceDone");
 ok(run("window.__alc")===0 && run("window.__doc").indexOf('BSB: <strong>000 000</strong>')>=0 && run("window.__doc").indexOf('Account: <strong>12345678</strong>')>=0,'filled bank details print with no warning');
 run("COMPANY.bankBSB=window.__bsb; COMPANY.bankAccount=window.__acct; window.alert=window.__alo2; confirmReset(false);");
 run("window.__alc=0; window.__alo5=window.alert; window.alert=function(m){ if(/BSB/.test(String(m))) window.__alc++; }; window.__doc=''; openDoc=function(h){window.__doc=h;}; makeInvoice('deposit');"); await run("window.__invoiceDone");
 ok(run("window.__doc").indexOf('Account Name: <strong>Poxit Flooring Pty Ltd</strong><br>BSB: <strong>067 873</strong>&nbsp;&nbsp;&nbsp;Account: <strong>26553862</strong>')>=0,'live invoice prints the company BSB and account');
 ok(run("window.__alc")===0 && run("window.__doc").indexOf('[FILL IN]')<0,'live invoice has no FILL IN and no warning');
 run("window.alert=window.__alo5; confirmReset(false);");
 ok((html.match(/11 743 009 073/g)||[]).length===1 && html.indexOf('11743009073')<0 && (html.match(/17789072/g)||[]).length===1,'sole trader ABN and account appear only once, in the SOLE_TRADER block');
 // ===== quote date stamps on every save and update =====
 run("confirmReset(false); S.client.first='Date'; S.client.last='Test'; S.client.date='01/01/2020'; S.client.valid='31/01/2020'; window.__alo3=window.alert; window.alert=function(){}; window.confirm=function(){return false;};");
 var dTod=run("new Date().toLocaleDateString('en-AU')"); var dVal=run("(function(){var v=new Date(); v.setDate(v.getDate()+30); return v.toLocaleDateString('en-AU');})()");
 await run("if(!S.client.location)S.client.location='External'; saveQuote('new')");
 ok(run("S.client.date")===dTod,'new save sets quote date to today');
 ok(run("S.client.valid")===dVal,'new save rolls valid until to 30 days out');
 ok(run("document.querySelector('[data-bind=\"client.date\"]').value")===dTod,'date box shows the new date after saving');
 var refKept=run("S.client.ref");
 run("S.client.date='02/02/2021'; S.client.valid='04/03/2021';");
 await run("if(!S.client.location)S.client.location='External'; saveQuote('update')");
 ok(run("S.client.date")===dTod && run("S.client.valid")===dVal,'update re-stamps date and valid until');
 ok(run("S.client.ref")===refKept,'update keeps the same quote number');
 run("window.__doc=''; openDoc=function(h){window.__doc=h;}; generatePDF();");
 ok(run("window.__doc").indexOf(dTod)>=0,'quote PDF prints the saved date');
 run("window.alert=window.__alo3; confirmReset(false);");
 // ===== invoice names follow the payment stage =====
 run("closeDocOverlay(); confirmReset(false); S.client.first='Mario'; S.client.last='Fairlie'; S.client.area='Garage'; S.services={epoxy:true}; calcAll(); window.__alo4=window.alert; window.alert=function(){}; window.__doc=''; openDoc=function(h){window.__doc=h;}; makeInvoice('deposit');"); await run("window.__invoiceDone");
 var invHtml=run("window.__doc"); var invRef=(invHtml.match(/INV-\d{4}-\d{3}/)||[''])[0];
 ok(invHtml.indexOf('<title>Mario Fairlie - Garage - Epoxy Deposit Invoice - '+invRef+'</title>')>=0,'invoice opens named as the deposit invoice');
 // each payment stage is its own invoice, named by stage
 var stages=[['final','Final Invoice'],['full','Full Payment Invoice'],['paid','Paid Invoice'],['progress','Progress Invoice 1']];
 for (var si=0; si<stages.length; si++) {
   await run("makeInvoice('"+stages[si][0]+"', 100)");
   var sref=(run("window.__doc").match(/INV-\d{4}-\d{3}/)||[''])[0];
   ok(run("window.__doc").indexOf('<title>Mario Fairlie - Garage - Epoxy '+stages[si][1]+' - '+sref+'</title>')>=0, stages[si][0]+' invoice is named '+stages[si][1]);
 }
 run("closeDocOverlay(); window.alert=window.__alo4; confirmReset(false);");
 // ===== Location: Internal / External / Both =====
 run("closeDocOverlay(); window.confirm=function(){return true;}; confirmReset(false); window.__alo6=window.alert; window.__al6=[]; window.alert=function(m){window.__al6.push(m);}; window.confirm=function(){return false;}; window.__fu=[]; window.__fo=window.fetch; window.fetch=function(u){ window.__fu.push(String(u)); return Promise.reject(new Error('offline')); };");
 ok(run("S.client.location")==='','new quote starts with no location');
 ok(run("[].map.call(document.querySelectorAll('#locationSel option'),function(o){return o.value;}).join(',')")===',Internal,External,Both','Location dropdown offers Internal, External, Both');
 ok(!!run("document.querySelector('#tab-client #locationSel')"),'Location sits on the Client Details card');
 run("S.client.first='Loc'; S.client.last='Test'; S.services={epoxy:true}; calcAll(); window.__qn=localStorage.getItem('poxit_quote_num');");
 await run("saveQuote('new')");
 ok(run("window.__al6.length")===1 && run("window.__al6[0]").indexOf('Location')>=0,'Save New is blocked without a location');
 ok(run("S.saveKey")==='' && run("localStorage.getItem('poxit_quote_num')")===run("window.__qn"),'blocked save burns no quote number');
 ok(run("document.getElementById('locationSel').style.borderColor").indexOf('red')>=0,'location box is highlighted when missing');
 // pick through the dropdown like a real tap
 run("var ls=document.getElementById('locationSel'); ls.value='External'; ls.dispatchEvent(new Event('change',{bubbles:true}));");
 ok(run("S.client.location")==='External','choosing External sets it on the quote');
 ok(run("document.getElementById('locationSel').style.borderColor")==='','highlight clears once picked');
 run("window.__al6=[];");
 await run("saveQuote('new')");
 ok(run("S.saveKey")!=='' && run("window.__al6.join('|')").indexOf('Pick a Location')<0,'saves once a location is picked');
 var saveUrl=run("window.__fu.filter(function(u){return u.indexOf('action=save')>=0;}).pop()||''");
 ok(/[?&]location=External(&|$)/.test(saveUrl),'location sent to the sheet as its own value');
 ok(decodeURIComponent(saveUrl).indexOf('"location":"External"')>=0,'location saved inside the quote data');
 var lrow=run("JSON.parse(localStorage.getItem('poxit_saves')).pop()");
 ok(lrow.location==='External','offline save row carries the location');
 // update is also guarded
 run("S.client.location=''; window.__al6=[]; window.__fu=[];");
 await run("saveQuote('update')");
 ok(run("window.__al6.length")===1 && run("window.__fu.length")===0,'Update is blocked without a location and sends nothing');
 run("S.client.location='Both';");
 await run("saveQuote('update')");
 ok(/[?&]location=Both(&|$)/.test(run("window.__fu.filter(function(u){return u.indexOf('action=save')>=0;}).pop()||''")),'Update saves the changed location');
 // round trip, old quotes, junk values
 run("var o9=JSON.parse(JSON.stringify({state:S})); confirmReset(false); restoreQuote(o9);");
 ok(run("S.client.location")==='Both' && run("document.getElementById('locationSel').value")==='Both','location loads back into the quote and the dropdown');
 run("var o10=JSON.parse(JSON.stringify({state:S})); delete o10.state.client.location; confirmReset(false); restoreQuote(o10);");
 ok(run("S.client.location")==='','older quotes load with no location');
 run("var o11=JSON.parse(JSON.stringify({state:S})); o11.state.client.location='Outside'; confirmReset(false); restoreQuote(o11);");
 ok(run("S.client.location")==='','unknown location values are cleared');
 // saved list labels
 ok(run("quoteLocation(JSON.stringify({state:{client:{location:'External'}}}))")==='External','reads location from a saved quote');
 ok(run("quoteLocation('not json')")==='' && run("quoteLocation(null)")==='','bad saved data does not break the list');
 ok(run("locationBadge('Internal')")==='🏠 Internal' && run("locationBadge('External')")==='🌦 External' && run("locationBadge('Both')")==='🏠🌦 Both' && run("locationBadge('')")==='📍 Location not set','badge text for each location');
 // the list itself (offline fallback path shows local saves)
 await run("openSaveLoad()");
 var listTxt=run("document.getElementById('savedList').textContent");
 ok(listTxt.indexOf('Epoxy Flooring · 🌦 External')>=0 || listTxt.indexOf('· 🌦 External')>=0 || listTxt.indexOf('· 🏠🌦 Both')>=0,'saved list shows location next to the services');
 run("closeSaveLoad();");
 // clear job keeps it, clear client wipes it
 run("S.client.location='External'; window.confirm=function(){return true;}; confirmReset(true);");
 ok(run("S.client.location")==='External','Clear Job keeps the location with the site');
 run("clearClient();");
 ok(run("S.client.location")==='' && run("document.getElementById('locationSel').value")==='','Clear Client wipes the location');
 run("window.confirm=function(){return true;}; window.fetch=window.__fo; window.alert=window.__alo6; confirmReset(false);");
 // ===== Entity, sheet snapshot, Drive saving, shared invoice numbers =====
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 run("closeDocOverlay(); window.confirm=function(){return true;}; confirmReset(false); window.__alo7=window.alert; window.alert=function(){}; window.__fo7=window.fetch;");
 // fake Apps Script: GET save -> saved; POST -> per action
 run(`window.__posts=[]; window.__srv={nextNum:41, mode:'ok'}; window.fetch=function(u,o){
   var txt=function(s){return Promise.resolve({text:function(){return Promise.resolve(s);}, json:function(){return Promise.resolve(JSON.parse(s));}});};
   if(!o||!o.method||o.method==='GET'){ if(String(u).indexOf('action=save')>=0) return txt(JSON.stringify({status:'saved'})); return Promise.reject(new Error('offline')); }
   var b=JSON.parse(o.body); window.__posts.push(b);
   if(window.__srv.mode==='down') return Promise.reject(new TypeError('Failed to fetch'));
   if(window.__srv.mode==='old') return txt('<html>Script function not found: doPost</html>');
   if(b.action==='nextInvoice'){ window.__srv.nextNum=Math.max(window.__srv.nextNum,b.localLast)+1; return txt(JSON.stringify({status:'ok',number:window.__srv.nextNum,ref:'INV-2026-0'+window.__srv.nextNum})); }
   return txt(JSON.stringify({status:'ok',fileId:'f1',link:'https://drive/f1'}));
 };`);
 // entity basics
 ok(run("[].map.call(document.querySelectorAll('#entitySel option'),function(o){return o.value;}).join(',')")==='Company,Sole Trader','Entity dropdown offers Company and Sole Trader');
 ok(run("S.client.entity")==='Company','new quotes default to the company');
 ok(run("entityForKey('PXT-1790584732999')")==='Sole Trader' && run("entityForKey('PXT-1792031977714')")==='Company' && run("entityForKey('')")==='Company','quotes first saved before 15 Oct are sole trader, after are company');
 run("var oe=JSON.parse(JSON.stringify({state:S})); oe.state.saveKey='PXT-1790584732999'; delete oe.state.client.entity; confirmReset(false); restoreQuote(oe);");
 ok(run("S.client.entity")==='Sole Trader' && run("document.getElementById('entitySel').value")==='Sole Trader','older quote opens on the sole trader details');
 run("var oe2=JSON.parse(JSON.stringify({state:S})); oe2.state.saveKey='PXT-1790584732999'; oe2.state.client.entity='Company'; confirmReset(false); restoreQuote(oe2);");
 ok(run("S.client.entity")==='Company','an entity picked by hand is kept on reload');
 // documents follow the entity
 run("S.client.first='Ent'; S.client.last='Test'; S.services={epoxy:true}; S.epoxyZones=[{name:'Garage',sys:'Flake Internal',flake:'Standard',conc:'Hard',coat:'Single Paint',area:40,addons:{}}]; calcAll(); window.__doc=''; openDoc=function(h){window.__doc=h;}; window.__qs=null;");
 run("S.client.entity='Sole Trader';");
 run("generatePDF();"); var stq=run("window.__doc");
 await run("window.__invoiceDone=null; makeInvoice('deposit')"); var sti=run("window.__doc");
 ok(stq.indexOf('Poxit Flooring&nbsp;&nbsp;|&nbsp;&nbsp;ABN 11 743 009 073</div>')>=0 && stq.indexOf('ACN')<0,'sole trader quote header: old ABN, no ACN');
 ok(sti.indexOf('Account: <strong>17789072</strong>')>=0 && sti.indexOf('26553862')<0 && sti.indexOf('Account Name: <strong>Poxit Flooring</strong>')>=0,'sole trader invoice uses the old account');
 ok(sti.indexOf('Gold Coast, QLD')>=0 && sti.indexOf('Dorretti')<0,'sole trader footer has no company address');
 run("S.client.entity='Company'; generatePDF();"); var coq=run("window.__doc");
 ok(coq.indexOf('ACN 702 727 535')>=0 && coq.indexOf('11 743 009 073')<0,'company quote shows ACN and no old ABN');
 // snapshot
 var snap=run("JSON.stringify(quoteSnapshot())"); snap=JSON.parse(snap);
 var tot=run("calcAll()");
 ok(Math.abs(snap.exGst-tot)<0.01 && Math.abs(snap.incGst-tot*1.1)<0.01 && Math.abs(snap.gst-tot*0.1)<0.01,'snapshot totals match the quote');
 ok(snap.lines.length>=1 && snap.lines[0].category==='Epoxy Floor System' && /^[A-Za-z]/.test(snap.lines[0].category) && snap.lines[0].zoneName==='Garage' && Math.abs(snap.lines[0].amount-run("effSub(buildSections()[0])"))<0.01,'snapshot lines carry clean names and amounts');
 ok(snap.client.name==='Ent Test','snapshot carries the client');
 run("S.custom.items=[{desc:'Extra skirting &amp; trims',price:250}];");
 snap=JSON.parse(run("JSON.stringify(quoteSnapshot())"));
 ok(snap.lines.some(function(l){return l.category==='Extra skirting & trims' && l.amount===250;}),'custom items included, with & decoded');
 run("S.custom.items=[];");
 // save sends quote meta
 run("S.client.location='External'; window.__posts=[];");
 await run("saveQuote('new')"); await sleep(50);
 var qm=run("JSON.stringify(window.__posts.filter(function(p){return p.action==='quoteMeta';}))"); qm=JSON.parse(qm);
 ok(qm.length===1 && qm[0].key===run("S.saveKey") && qm[0].entity==='Company' && qm[0].location==='External' && Math.abs(qm[0].snapshot.incGst-run("calcAll()")*1.1)<0.01,'saving sends key, entity, location and totals to the sheet');
 // Export a saved quote: one tap saves it to Drive with link data, totals and the file name
 run("openDoc=window.__realOpenDoc; window.__renders=[]; renderPdfBlob=function(h){ window.__renders.push(h); return Promise.resolve(new Blob(['%PDF-1.4 text'],{type:'application/pdf'})); }; navigator.canShare=function(d){return !!(d.files&&d.files.length);}; navigator.share=function(d){window.__shared=d; return Promise.resolve();}; window.__posts=[];");
 run("generatePDF();"); await run("window.__docPdfReady"); await run("exportDoc()");
 var sp=JSON.parse(run("JSON.stringify(window.__posts.filter(function(p){return p.action==='savePdf';}))"));
 var qtot=run("calcAll()");
 ok(sp.length===1 && sp[0].kind==='Quote' && sp[0].key===run("S.saveKey") && sp[0].ref===run("S.client.ref") && sp[0].client==='Ent Test','Export sends the quote to Drive with key, ref and client');
 ok(sp[0].fileName===run("driveQuoteName()") && /^PXT-\d{4}-\d{3} - Ent Test( - .+)?\.pdf$/.test(sp[0].fileName),'Drive file named "PXT-ref - Client - Address.pdf" (got '+sp[0].fileName+')');
 ok(Math.abs(sp[0].exGst-qtot)<0.01 && Math.abs(sp[0].incGst-qtot*1.1)<0.01 && sp[0].snapshot && sp[0].location==='External','Export sends ex GST and inc GST totals for the sheet');
 ok(Buffer.from(sp[0].base64,'base64').toString().indexOf('%PDF-1.4')===0,'PDF bytes sent intact');
 ok(run("window.__shared.files[0].name")===run("docPdfName()") && /^Ent Test - .*Quote - PXT-\d{4}-\d{3}\.pdf$/.test(run("docPdfName()")),'share sheet keeps the client-friendly name "Client - Job - Quote - PXT-…"');
 ok(run("document.getElementById('driveNote').textContent").indexOf('Saved to Drive')>=0,'says it saved to Drive');
 // invoices: shared number, Export saves the stage on screen
 run("window.__posts=[]; localStorage.setItem('poxit_inv_num','7'); closeDocOverlay();");
 await run("makeInvoice('deposit')"); await run("window.__docPdfReady");
 var invDoc=run("docCtx.html");
 var srvN=run("window.__srv.nextNum"); var srvRef='INV-2026-0'+srvN;
 ok(srvN>41 && invDoc.indexOf('TAX INVOICE · '+srvRef)>=0,'invoice number comes from the sheet counter');
 ok(run("localStorage.getItem('poxit_inv_num')")===String(srvN),'device counter moved up to the shared number');
 var nx=JSON.parse(run("JSON.stringify(window.__posts.filter(function(p){return p.action==='nextInvoice';}))"));
 ok(nx.length===1 && nx[0].localLast===7,'device sends its last number so the sheet never goes backwards');
 ok(run("window.__posts.filter(function(p){return p.action==='savePdf';}).length")===0,'opening an invoice saves nothing to Drive until Export');
 await run("exportDoc()");
 var inc=qtot*1.1;
 var isv=JSON.parse(run("JSON.stringify(window.__posts.filter(function(p){return p.action==='savePdf';}))"));
 ok(isv.length===1 && isv[0].kind==='Invoice' && isv[0].invNo===srvRef && isv[0].invType==='Deposit' && Math.abs(isv[0].amountDue-inc/2)<0.01 && Math.abs(isv[0].jobTotal-inc)<0.01 && /Deposit Invoice - INV-/.test(isv[0].fileName),'Export saves the invoice as the Deposit stage, named by stage and number');
 run("window.__posts=[]; closeDocOverlay();");
 await run("makeInvoice('final')"); await run("window.__docPdfReady");
 await run("exportDoc()");
 var st=JSON.parse(run("JSON.stringify(window.__posts.filter(function(p){return p.action==='savePdf';}))"));
 ok(st.length===1 && st[0].invType==='Final' && Math.abs(st[0].amountDue-inc)<0.01 && /Final Invoice - INV-/.test(st[0].fileName),'Final invoice exports as Final for the full balance (no payments recorded)');
 // Drive replies: updated version, offline, script not updated
 run("window.__srv.mode='ok'; window.__fo8=window.fetch; window.fetch=function(u,o){ if(o&&o.method==='POST'){ var b=JSON.parse(o.body); if(b.action==='savePdf') return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',updated:true}));}}); } return window.__fo8(u,o); };");
 await run("exportDoc()");
 ok(run("document.getElementById('driveNote').textContent").indexOf('Updated in Drive')>=0,'says "Updated in Drive" when the existing file got a new version');
 run("window.fetch=window.__fo8; window.__srv.mode='down';");
 await run("exportDoc()");
 ok(run("document.getElementById('driveNote').textContent").indexOf('Not saved to Drive')>=0 && run("window.__shared.files.length")===1,'offline: still shares the PDF, says Drive was missed');
 run("window.__srv.mode='old';");
 await run("exportDoc()");
 ok(run("document.getElementById('driveNote').textContent").indexOf('not switched on yet')>=0,'before the script is updated: says Drive saving is not switched on yet');
 run("window.__srv.mode='down'; closeDocOverlay(); localStorage.setItem('poxit_inv_num','50');");
 await run("makeInvoice('deposit')");
 ok(run("docCtx.html").indexOf('· INV-2026-051')>=0 && run("localStorage.getItem('poxit_inv_num')")==='51','offline: invoice falls back to the device counter');
 run("closeDocOverlay(); window.__srv.mode='ok'; window.fetch=window.__fo7; window.alert=window.__alo7; renderPdfBlob=function(){ return new Promise(function(){}); }; confirmReset(false);");
 // ===== PDF maker: self-hosted, and never started on the frame's blank page =====
 var src2=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
 ok(!/cdnjs|jsdelivr|unpkg/.test(src2.replace(/fonts\.googleapis[^'"]*/g,'')),'no PDF library is loaded from a CDN');
 ok(JSON.stringify(run("PDF_LIBS"))==='["vendor/html2canvas-1.4.1.min.js","vendor/jspdf-2.5.1.umd.min.js"]','PDF libraries come from the site itself, pinned versions');
 ok(run("PDF_LIBS").every(function(p){ return fs.existsSync('/home/claude/poxit-pro/'+p) && fs.statSync('/home/claude/poxit-pro/'+p).size>100000; }) && fs.existsSync('/home/claude/poxit-pro/vendor/LICENSES.txt'),'library files are in the repo, with licences');
 ok(fs.readFileSync('/home/claude/poxit-pro/vendor/jspdf-2.5.1.umd.min.js','utf8').indexOf('Version 2.5.1')>=0 && fs.readFileSync('/home/claude/poxit-pro/vendor/html2canvas-1.4.1.min.js','utf8').indexOf('html2canvas 1.4.1')>=0,'repo files are the versions the tool asks for');
 // the document goes into the frame before it joins the page, and a blank-page load is ignored
 run("window.__pb=pdfBlobFrom; window.__pbCalls=0; pdfBlobFrom=function(){ window.__pbCalls++; return new Promise(function(){}); }; window.__srcAtInsert=null; window.__mo=new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if(n.tagName==='IFRAME' && n.getAttribute('aria-hidden')==='true') window.__srcAtInsert=n.getAttribute('srcdoc'); }); }); }); window.__mo.observe(document.body,{childList:true}); window.__realRender('<html><body><p>Hi</p></body></html>');");
 await new Promise(function(r){setTimeout(r,30);});
 ok(run("window.__srcAtInsert")!==null && run("window.__srcAtInsert").indexOf('<p>Hi</p>')>=0,'document is in the frame before the frame joins the page');
 run("var hf=[].slice.call(document.querySelectorAll('iframe[aria-hidden=true]')).pop(); hf.dispatchEvent(new Event('load'));");
 ok(run("window.__pbCalls")===0,'a load from the blank starting page does not start the PDF maker');
 run("window.__mo.disconnect(); pdfBlobFrom=window.__pb; [].slice.call(document.querySelectorAll('iframe[aria-hidden=true]')).forEach(function(f){f.remove();});");
 // a library that never answers gives a clear message instead of hanging
 ok(run("PDF_LOAD_TIMEOUT_MS")===30000 && run("String(loadScriptInto)").indexOf('took too long')>=0,'stuck library load times out with a message');
 // ===== Spalling: Epoxy Mortar vs Cementitious, options =====
 const NOTE="Cementitious repairs: Poxit Flooring's workmanship warranty does not cover the repaired areas, or any coating failure caused by them. Statutory warranties under Queensland law still apply.";
 run("closeDocOverlay(); window.confirm=function(){return true;}; confirmReset(false); openDoc=function(h){window.__doc=h;}; window.alert=function(){};");
 ok(JSON.stringify(run("PRICE.spallCem"))==='{"small":25,"med":40,"large":65}' && run("Math.round(PRICE.spall.large*0.7/5)*5")===65,'cementitious rates: Small $25, Medium $40, Large $65 (70% of epoxy $90, nearest $5)');
 var cards=run("[].map.call(document.querySelectorAll('#sub-repairs .card-title'),function(x){return x.firstChild.textContent.trim();}).join('|')");
 ok(cards.indexOf('Spalling Repair (Epoxy Mortar)|Spalling Repair (Cementitious)')>=0,'Repairs tab: Epoxy Mortar card renamed, Cementitious card beside it');
 ok(run("CEM_WARRANTY_NOTE")===NOTE,'warranty note is word for word');
 // epoxy only: unchanged pricing, no note
 run("S.client.first='Spall'; S.client.last='Test'; S.spalling={small:2,med:1,large:1,area:0}; calcAll();");
 ok(run("calcAll()")===2*35+55+90 && run("JSON.stringify(buildSections().map(function(s){return s.category;}))").indexOf('Spalling Repair (Epoxy Mortar)')>=0,'epoxy mortar priced as before, named on the quote');
 run("generatePDF();"); var d0=run("window.__doc");
 ok(d0.indexOf('workmanship warranty does not cover')<0 && d0.indexOf('Spalling Repair Options')<0,'epoxy only: no cementitious note, no options box');
 // cementitious only
 run("S.spalling={small:0,med:0,large:0,area:0}; S.spallingCem={small:3,med:2,large:1}; calcAll();");
 ok(run("calcAll()")===3*25+2*40+65,'cementitious priced: 3 small + 2 medium + 1 large = $220');
 ok(run("document.getElementById('badge-spallCem').textContent")==='$220','Cementitious card shows its own total');
 run("generatePDF();"); var d1=run("window.__doc");
 ok(d1.indexOf('Spalling Repair (Cementitious)')>=0 && d1.indexOf('<strong>Cementitious repairs:</strong> Poxit Flooring\'s workmanship warranty does not cover the repaired areas, or any coating failure caused by them. Statutory warranties under Queensland law still apply.')>=0,'cementitious on the quote adds the warranty note to the terms');
 ok(d1.indexOf('Payment Terms')<d1.indexOf('Cementitious repairs:'),'note sits in the Payment Terms section');
 await run("makeInvoice('deposit')"); var i1=run("window.__doc");
 ok(i1.indexOf('workmanship warranty does not cover the repaired areas')>=0,'cementitious invoice carries the note too');
 // both, not as options: both in the total, switch offered
 run("S.spalling={small:2,med:1,large:1,area:0}; calcAll();");
 ok(Math.abs(run("calcAll()")-(215+220))<0.001,'both entered, options off: both in the total');
 ok(!!run("document.getElementById('spallAltToggle')") && run("document.getElementById('spallOptBox').textContent").indexOf('Both are in the total')>=0,'switch to quote them as options appears once both are entered');
 // as options, Option 1 in the total
 run("document.getElementById('spallAltToggle').checked=true; document.getElementById('spallAltToggle').dispatchEvent(new Event('change',{bubbles:true}));");
 ok(run("S.spallingOpt.alternatives")===true && run("calcAll()")===215,'as options: only Option 1 (epoxy) is in the grand total');
 var o=JSON.parse(run("JSON.stringify(spallingOptions().options.map(function(x){return {n:x.n,price:x.price,inc:x.totals.incGst};}))"));
 ok(o[0].n===1 && o[0].price===215 && Math.abs(o[0].inc-236.5)<0.001 && o[1].n===2 && o[1].price===220 && Math.abs(o[1].inc-242)<0.001,'each option has its own price and its own quote total');
 run("generatePDF();"); var d2=run("window.__doc");
 ok(d2.indexOf('Spalling Repair (Epoxy Mortar): Option 1')>=0 && d2.indexOf('Spalling Repair (Cementitious): Option 2</span>')<0,'scope lists Option 1 only (the one in the price)');
 ok(d2.indexOf('Spalling Repair Options')>=0 && d2.indexOf('Option 1: Spalling Repair (Epoxy Mortar)</strong> (included in the Contract Price)')>=0 && d2.indexOf('Option 2: Spalling Repair (Cementitious)</strong>')>=0,'options box shows both, Option 1 marked as included');
 ok(d2.indexOf('$215.00 ex GST')>=0 && d2.indexOf('$220.00 ex GST')>=0 && d2.indexOf('$236.50')>=0 && d2.indexOf('$242.00')>=0,'options box shows each option\'s price and quote total');
 ok(d2.indexOf('Quote Total (Inc GST)</td><td class="price-col">$236.50')>=0,'Contract Price is the Option 1 total, not both added');
 ok(d2.indexOf('Choose Option 2 instead and the total becomes $242.00 inc GST')>=0,'says what the total becomes with the other option');
 ok(d2.indexOf('workmanship warranty does not cover')>=0,'cementitious offered as an option still carries the note');
 ok(!/[—–]/.test(spallBox=d2.slice(d2.indexOf('Spalling Repair Options'), d2.indexOf('Payment Terms'))),'options wording has no dashes');
 await run("makeInvoice('deposit')"); var i2=run("window.__doc");
 ok(i2.indexOf('workmanship warranty does not cover')<0 && i2.indexOf('Spalling Repair Options')<0,'invoice for Option 1 bills epoxy only, no cementitious note');
 // switch to Option 2 in the total
 run("var sel=document.getElementById('spallIncludeSel'); sel.value='cem'; sel.dispatchEvent(new Event('change',{bubbles:true}));");
 ok(run("S.spallingOpt.include")==='cem' && run("calcAll()")===220,'picking Option 2 puts cementitious in the total instead');
 run("generatePDF();"); var d3=run("window.__doc");
 ok(d3.indexOf('Spalling Repair (Cementitious): Option 2')>=0 && d3.indexOf('Quote Total (Inc GST)</td><td class="price-col">$242.00')>=0 && d3.indexOf('Choose Option 1 instead and the total becomes $236.50 inc GST')>=0,'quote follows Option 2');
 await run("makeInvoice('deposit')");
 ok(run("window.__doc").indexOf('workmanship warranty does not cover')>=0,'invoice for Option 2 carries the note');
 // other work and a % discount flow through both option totals
 run("S.spallingOpt.include='epoxy'; S.cracks=[{lm:5,qty:1}]; S.custom.adjustType='discount_pct'; S.custom.adjustAmount=10; calcAll();");
 var base=run("calcAll()"); var o2=JSON.parse(run("JSON.stringify(spallingOptions().options.map(function(x){return x.totals.incGst;}))"));
 ok(Math.abs(o2[0]-base*1.1)<0.01 && Math.abs(o2[1]-run("(function(){var s=buildSections().filter(function(x){return x.key!=='spalling';}).concat([spallingCemSection(true)]); return totalsFor(s).incGst;})()"))<0.01 && o2[1]-o2[0]>0,'option totals include the rest of the job and the discount');
 run("S.cracks=[]; S.custom.adjustType='none'; S.custom.adjustAmount=0; calcAll();");
 // summary, badges, price edits
 ok(run("document.getElementById('summaryOptions').textContent").indexOf('Option 2 Cementitious: $220.00 ex GST')>=0,'Summary tab shows both options');
 ok(run("document.getElementById('badge-spalling').textContent")==='$215' && run("document.getElementById('badge-spallCem').textContent")==='$220','each card shows its own price, in the total or not');
 run("setOverride('spalling','200'); calcAll();");
 ok(run("calcAll()")===200 && run("spallingOptions().options[0].price")===200,'a price edit on the Summary flows into the option');
 run("S.overrides={}; calcAll();");
 // sheet totals carry the options and the note
 run("S.spallingOpt.include='cem'; calcAll();");
 var sn=JSON.parse(run("JSON.stringify(quoteSnapshot())"));
 ok(sn.options.length===2 && sn.options[1].inTotal===true && sn.options[0].quoteIncGst===236.5 && sn.notes[0]===NOTE && Math.abs(sn.incGst-242)<0.01,'totals sent to the sheet list both options and the note');
 // older quotes, round trip
 run("var osq=JSON.parse(JSON.stringify({state:S})); delete osq.state.spallingCem; delete osq.state.spallingOpt; confirmReset(false); restoreQuote(osq);");
 ok(JSON.stringify(run("S.spallingCem"))==='{"small":0,"med":0,"large":0}' && run("S.spallingOpt.alternatives")===false,'older quotes open with no cementitious spalling');
 run("S.spallingCem={small:1,med:0,large:2}; S.spalling={small:1,med:0,large:0,area:0}; S.spallingOpt={alternatives:true,include:'cem'}; var rt=JSON.parse(JSON.stringify({state:S})); confirmReset(false); restoreQuote(rt); calcAll();");
 ok(run("S.spallingCem.large")===2 && run("S.spallingOpt.include")==='cem' && run("calcAll()")===25+130 && run("document.querySelector('[data-bind=\"spallingCem.large\"]').value")==='2','save and reopen keeps quantities and the option choice');
 // typing into the card
 run("var inp=document.querySelector('[data-bind=\"spallingCem.small\"]'); inp.value='4'; inp.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("S.spallingCem.small")===4,'typing in the Cementitious card updates the quote');
 run("confirmReset(false);");
 // ===== Commercial & Chemical Resistant Systems =====
 run("closeDocOverlay(); window.confirm=function(){return true;}; confirmReset(false); openDoc=function(h){window.__doc=h;}; window.alert=function(){}; try{localStorage.removeItem('poxit_sika_mat');}catch(e){}");
 ok(run("SUB_NAV[SUB_NAV.length-1]")==='comm' && !!run("document.querySelector('.subtab[data-sub=\"comm\"]')"),'Commercial is the last Services panel');
 run("showTab('comm'); addCommArea(); S.commAreas[0].name='Kennel 1'; S.commAreas[0].floor=22.3; S.commAreas[0].wall=44; S.commAreas[0].coving=25; calcAll();");
 ok(Math.abs(run("commUnit(S.commAreas[0],'Hychem Premium').total")-9076)<0.001,'KENNEL CHECK: Hychem Premium = $9,076.00 ex GST');
 ok(Math.abs(run("commUnit(S.commAreas[0],'Sika Standard').total")-5872.5)<0.001,'KENNEL CHECK: Sika Standard = $5,872.50 ex GST');
 ok(Math.abs(run("calcAll()")-9076)<0.001 && run("document.getElementById('badge-comm').textContent")==='$9,076','area on Hychem puts $9,076.00 in the quote');
 run("setCommSystem(0,'Sika Standard');");
 ok(Math.abs(run("calcAll()")-5872.5)<0.001,'switching the area to Sika puts $5,872.50 in the quote');
 // joints, routing, quantity
 run("setCommSystem(0,'Hychem Premium'); setCommField(0,'joints','10');");
 ok(Math.abs(run("calcAll()")-(9076+350))<0.001,'joints default Hyflex NS $35/lm');
 run("setCommJoint(0,'Hyflex FC');"); ok(Math.abs(run("calcAll()")-(9076+250))<0.001,'Hyflex FC $25/lm');
 run("setCommField(0,'routing',true);"); ok(Math.abs(run("calcAll()")-(9076+330))<0.001,'routing adds $8/lm');
 run("setCommField(0,'joints','0'); setCommField(0,'routing',false); setCommJoint(0,'Hyflex NS'); setCommField(0,'qty','3');");
 ok(Math.abs(run("calcAll()")-9076*3)<0.001 && run("buildSections().filter(function(s){return s.key==='comm-0';})[0].zoneName")==='Kennel 1 × 3','quantity multiplies identical areas');
 // discounts
 run("addCommArea(); S.commAreas[1].name='Wash Bay'; S.commAreas[1].floor=10; calcAll();");
 var both=9076*3+1200;
 ok(Math.abs(run("calcAll()")-both)<0.001,'second area adds on');
 run("setCommDiscount('type','lastfree');"); ok(Math.abs(run("calcAll()")-(both-1200))<0.001 && run("buildSections().filter(function(s){return s.key==='comm-discount';})[0].category")==='Discount: last area free','Last area free takes off one unit of the last area');
 run("S.commAreas.reverse(); calcAll();"); ok(Math.abs(run("calcAll()")-(both-9076))<0.001,'last area free with a quantity takes off one unit, not all of them');
 run("S.commAreas.reverse(); setCommDiscount('type','flat'); setCommDiscount('amount','500');"); ok(Math.abs(run("calcAll()")-(both-500))<0.001,'flat $ discount');
 run("setCommDiscount('type','pct'); setCommDiscount('amount','10');"); ok(Math.abs(run("calcAll()")-both*0.9)<0.001 && run("commDiscountLabel()")==='Discount (10%)','percentage discount with its label');
 run("setCommDiscount('label','Multi kennel discount');"); ok(run("commDiscountLabel()")==='Multi kennel discount','discount label is editable');
 run("generatePDF();"); var cd=run("window.__doc");
 ok(cd.indexOf('<span class="zone-cat">Multi kennel discount</span>')>=0 && cd.indexOf('-$'+(both*0.1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','))>=0,'discount is its own line on the PDF with its label');
 run("setCommDiscount('type','none'); setCommDiscount('label','');");
 // side by side on the PDF
 run("S.commAreas.splice(1,1); S.commAreas[0].qty=1; calcAll(); generatePDF();"); var pd1=run("window.__doc");
 ok(pd1.indexOf('Choose Your System')>=0 && pd1.indexOf('<strong>Hychem Premium</strong>')>=0 && pd1.indexOf('<strong>Sika Standard</strong>')>=0,'PDF shows Hychem Premium and Sika Standard side by side');
 ok(pd1.indexOf('<td>Kennel 1</td><td class="price-col">$9,076.00</td><td class="price-col">$5,872.50</td>')>=0,'side by side shows the kennel at $9,076.00 and $5,872.50');
 ok(pd1.indexOf('$9,983.60')>=0 && pd1.indexOf('$6,459.75')>=0 && pd1.indexOf('The Quote Total above is based on Hychem Premium.')>=0,'each system has its own Quote Total (inc GST)');
 ok(pd1.indexOf('Quote Total (Inc GST)</td><td class="price-col">$9,983.60')>=0 && pd1.indexOf('TOTAL AMOUNT DUE')<0,'"TOTAL AMOUNT DUE" renamed to "Quote Total"');
 ok(pd1.indexOf('System Specifications')>=0 && pd1.indexOf('4 coat floor system, approx 2 mm build with sand broadcast. Walls 3 coats plus filler. Coved junctions. Hyflex NS sealed joints. 15 to 20 year design life.')>=0,'Hychem spec block at the bottom');
 ok(pd1.indexOf('Sika commercial epoxy floor and wall system')>=0,'Sika spec placeholder on the PDF');
 run("S.commSikaSpec='Sikafloor 263 SL, 3 coats.'; generatePDF();"); ok(run("window.__doc").indexOf('Sikafloor 263 SL, 3 coats.')>=0,'Sika spec text is editable');
 ok(pd1.indexOf('System Specifications')>pd1.indexOf('Payment Terms'),'spec blocks sit at the bottom');
 // internal material cost and margin: on screen only
 run("renderComm(); renderCommMargins();");
 var intTxt=run("document.getElementById('commInt-0').textContent");
 ok(intTxt.indexOf('Material $1,902.10')>=0 && intTxt.indexOf('Margin $7,173.90 (79%)')>=0,'Hychem material cost (22.3x27 + 44x25 + 25x8 = $1,902.10) and margin shown in the tool');
 run("setCommSystem(0,'Sika Standard'); renderCommMargins();");
 ok(run("document.getElementById('commInt-0').textContent").indexOf('Sika material cost not set')>=0,'Sika material cost starts at $0 and says so');
 run("setSikaMat('floor','30'); setSikaMat('wall','20'); setSikaMat('coving','6');");
 ok(run("document.getElementById('commInt-0').textContent").indexOf('Material $1,699.00')>=0,'Sika material cost is editable and used for its margin');
 run("generatePDF();"); var pd2=run("window.__doc");
 var pdText=new JSDOM(pd2).window.document.body.textContent; ok(!/Material|Margin|1,902\.10|1,699\.00|7,173\.90/.test(pdText),'material cost and margin never reach the PDF');
 ok(pd2.indexOf('The Quote Total above is based on Sika Standard.')>=0 && pd2.indexOf('Quote Total (Inc GST)</td><td class="price-col">$6,459.75')>=0,'quote follows the area set to Sika');
 run("setCommSystem(0,'Hychem Premium');");
 // save and reopen
 run("var cq=JSON.parse(JSON.stringify({state:S})); confirmReset(false); restoreQuote(cq); calcAll();");
 ok(run("S.commAreas.length")===1 && Math.abs(run("calcAll()")-9076)<0.001 && run("S.commSikaSpec")==='Sikafloor 263 SL, 3 coats.','commercial areas and spec save with the quote');
 run("var oq=JSON.parse(JSON.stringify({state:S})); delete oq.state.commAreas; delete oq.state.commDiscount; delete oq.state.lineEdits; confirmReset(false); restoreQuote(oq);");
 ok(JSON.stringify(run("S.commAreas"))==='[]' && run("S.commDiscount.type")==='none' && JSON.stringify(run("S.lineEdits"))==='{}','older quotes open with no commercial areas and no edits');

 // ===== Editable summary (every category) =====
 run("confirmReset(false); S.client.first='Edit'; S.client.last='Test'; S.services={epoxy:true}; S.epoxyZones=[{name:'Garage',sys:'Flake Internal',flake:'Standard',conc:'Hard',coat:'Single Paint',area:40,addons:{}}]; S.cracks=[{lm:5,qty:1}]; calcAll(); showTab('summary');");
 var raw=run("buildSections().map(function(s){return s.key;})"); var base0=run("calcAll()");
 ok(raw.indexOf('epoxy-0')>=0 && run("document.querySelectorAll('#summaryLines button').length")>=raw.length,'every summary line has an Edit button, plus Add Line');
 run("toggleLineEditor('epoxy-0');");
 ok(!!run("document.querySelector('[data-le=\"epoxy-0:name\"]')") && !!run("document.querySelector('[data-le=\"epoxy-0:qty\"]')") && !!run("document.querySelector('[data-le=\"epoxy-0:unit\"]')") && !!run("document.querySelector('[data-le=\"epoxy-0:rate\"]')") && !!run("document.querySelector('[data-le=\"epoxy-0:amount\"]')") && !!run("document.querySelector('[data-le=\"epoxy-0:desc\"]')"),'editor has name, description, qty, unit, rate and amount');
 run("var nm=document.querySelector('[data-le=\"epoxy-0:name\"]'); nm.focus(); nm.value='Garage floor, full flake system'; nm.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("buildSections()[0].category")==='Garage floor, full flake system','rename a line');
 ok(!!run("document.querySelector('[data-le=\"epoxy-0:name\"]')") && run("document.activeElement.getAttribute('data-le')")==='epoxy-0:name','typing does not redraw the editor (keeps your place)');
 run("setLineEdit('epoxy-0','desc','Grind, prime, flake, two topcoats');");
 run("setLineEdit('epoxy-0','qty','40'); setLineEdit('epoxy-0','unit','m²'); setLineEdit('epoxy-0','rate','85');");
 var sec0=JSON.parse(run("JSON.stringify(buildSections().filter(function(s){return s.key==='epoxy-0';})[0])"));
 ok(sec0.subtotal===3400 && sec0.qtyText==='40 m² @ $85.00/m²','qty × rate sets the amount');
 var crack=run("effSub(buildSections().filter(function(s){return s.key==='cracks';})[0])");
 ok(Math.abs(run("calcAll()")-(3400+crack))<0.001,'totals recalculate');
 ok(run("document.getElementById('summaryExGst').textContent")===run("fmt(calcAll())") && run("document.getElementById('summaryIncGst').textContent")===run("fmt(calcAll()*1.1)"),'GST and inc GST recalculate on the summary');
 run("setLineEdit('epoxy-0','amount','3300');");
 sec0=JSON.parse(run("JSON.stringify(buildSections().filter(function(s){return s.key==='epoxy-0';})[0])"));
 ok(sec0.subtotal===3300 && sec0.rate===82.5 && sec0.qtyText==='40 m² @ $82.50/m²','typing an amount keeps the qty and works out the rate');
 run("deleteLine('cracks');");
 ok(run("buildSections().some(function(s){return s.key==='cracks';})")===false && Math.abs(run("calcAll()")-3300)<0.001,'delete a line: gone from the total');
 ok(run("document.getElementById('summaryLines').textContent").indexOf('Deleted lines')>=0,'deleted lines can be restored');
 run("addCustomLine(); setCustomLine(0,'desc','Site induction'); setCustomLine(0,'note','Half day, two staff'); setCustomLine(0,'qty','2'); setCustomLine(0,'unit','hr'); setCustomLine(0,'rate','95');");
 ok(run("S.custom.items[0].price")===190 && Math.abs(run("calcAll()")-3490)<0.001,'add a custom line with qty × rate');
 run("generatePDF();"); var ed=run("window.__doc");
 ok(ed.indexOf('<span class="zone-cat">Garage floor, full flake system</span>')>=0 && ed.indexOf('Grind, prime, flake, two topcoats')>=0 && ed.indexOf('40 m² @ $82.50/m²')>=0 && ed.indexOf('$3,300.00')>=0,'PDF shows the edited line exactly');
 ok(ed.indexOf('<span class="zone-cat">Site induction</span>')>=0 && ed.indexOf('Half day, two staff')>=0 && ed.indexOf('2 hr @ $95.00/hr')>=0 && ed.indexOf('$190.00')>=0,'PDF shows the custom line exactly');
 ok(ed.indexOf('Crack Repair')<0,'PDF leaves out the deleted line');
 ok(ed.indexOf('Quote Total (Inc GST)</td><td class="price-col">$3,839.00')>=0,'PDF totals match the edits (3,300 + 190 = 3,490 + GST)');
 await run("makeInvoice('deposit')"); ok(run("window.__doc").indexOf('Garage floor, full flake system')>=0 && run("window.__doc").indexOf('Crack Repair')<0,'invoice uses the edited lines too');
 var snE=JSON.parse(run("JSON.stringify(quoteSnapshot())"));
 ok(Math.abs(snE.exGst-3490)<0.01 && snE.lines.some(function(l){return l.category==='Garage floor, full flake system' && l.amount===3300;}) && snE.lines.some(function(l){return l.category==='Site induction' && l.amount===190;}),'totals sent to the sheet use the edits');
 // edits survive save and reopen
 run("var eq=JSON.parse(JSON.stringify({state:S})); confirmReset(false); restoreQuote(eq); calcAll(); generatePDF();");
 ok(Math.abs(run("calcAll()")-3490)<0.001 && run("window.__doc").indexOf('Garage floor, full flake system')>=0 && run("window.__doc").indexOf('Crack Repair')<0,'manual edits save with the quote and come back on the PDF');
 run("restoreLine('cracks'); resetLine('epoxy-0');");
 ok(Math.abs(run("calcAll()")-(base0+190))<0.001,'restore and undo bring lines back to their worked-out prices');
 // commercial lines are editable like any other
 run("S.commAreas=[{name:'Kennel 1',system:'Hychem Premium',floor:22.3,wall:44,coving:25,joints:0,jointType:'Hyflex NS',routing:false,qty:1}]; setLineEdit('comm-0','amount','9000');");
 ok(Math.abs(run("effSub(buildSections().filter(function(s){return s.key==='comm-0';})[0])")-9000)<0.001,'commercial lines can be edited too');
 run("S.lineEdits={}; S.commAreas=[]; S.custom.items=[]; confirmReset(false);");
 // ===================== 17 NOV: FLOW, PRICING, SITE =====================
 run("closeDocOverlay(); window.confirm=function(){return true;}; window.alert=function(){}; openDoc=function(h){window.__doc=h;}; freshState=window.__freshStateAuto; localStorage.removeItem('poxit_prices'); applyPriceOverrides({}); confirmReset(false); measureShapes=[];");
 ok(run("JSON.stringify(NAV)")===JSON.stringify(['client','measure','services','site','review','save']),'FLOW step order Client > Measure > Services > Site > Review > Save');
 ok(run("[].map.call(document.querySelectorAll('.tab[data-tab]'),function(t){return t.getAttribute('data-tab');}).join(',')")==='client,measure,services,site,review,save,close','FLOW tab bar shows the six steps, then Close (outside the Next flow)');
 ok(!run("document.querySelector('.tab[data-tab=\"addons\"]')") && !run("document.getElementById('tab-addons')"),'FLOW no separate Add-Ons step');
 run("showTab('details')"); ok(run("currentTab")==='services' && run("document.getElementById('sub-floors').classList.contains('active')"),'FLOW old step names open the right Services panel');
 run("showTab('client'); nextTab(); nextTab(); nextTab();"); ok(run("currentTab")==='site','FLOW Next walks Client > Measure > Services > Site');
 run("nextTab(); nextTab();"); ok(run("currentTab")==='save' && !!run("document.getElementById('btnSaveNew2')") && !!run("document.querySelector('#tab-save button[onclick=\"generatePDF()\"]')"),'FLOW Save step has Save and Quote PDF');
 // Import measurement on every area
 run("measureShapes=[{type:'rect',v1:6,v2:7.5,v3:0,label:'Garage'},{type:'rect',v1:3,v2:4,v3:0,label:'Porch'}]; S.services.epoxy=true; S.services.seal=true; showTab('services'); addZone('epoxy'); addZone('seal');");
 var imp=run("[].map.call(document.querySelectorAll('#detailsContainer .import-sel'),function(x){return x.options.length;}).join(',')");
 ok(imp==='4,4','MEASURE each new area has an Import measurement picker with total + each shape (got '+imp+')');
 ok(run("document.querySelector('#detailsContainer .import-sel').innerHTML").indexOf('Garage: 45.00 m²')>-1,'MEASURE picker lists shapes by name');
 run("importMeasure('epoxyZones.0.area','all')"); ok(run("S.epoxyZones[0].area")===57,'MEASURE import all = 57 m²');
 run("importMeasure('epoxyZones.0.area','0')"); ok(run("S.epoxyZones[0].area")===45,'MEASURE import one shape = 45 m²');
 ok(run("document.querySelector('[data-bind=\"epoxyZones.0.area\"]').value")==='45','MEASURE imported value shows in the box');
 run("importMeasure('sealZones.0.area','1')"); ok(run("S.sealZones[0].area")===12,'MEASURE import into seal area');
 run("showSub('pw'); addPwZone(); showSub('pw');"); ok(!!run("document.querySelector('#pwContainer .import-sel')"),'MEASURE pressure wash areas have the picker');
 run("showSub('comm'); addCommArea();"); ok(!!run("document.querySelector('#commContainer .import-sel')"),'MEASURE commercial areas have the picker');
 run("importMeasure('commAreas.0.floor','all')"); ok(run("S.commAreas[0].floor")===57,'MEASURE import into commercial floor');
 run("S.commAreas=[]; S.pwZones=[]; showSub('floors');");
 // Add-ons inside the service
 ok(run("document.getElementById('detailsContainer').innerHTML").indexOf('Add-ons for this zone')>-1,'ADDONS epoxy add-ons sit inside the epoxy zone');
 ok(run("document.querySelectorAll('#detailsContainer details.addon-box input[type=checkbox]').length")>=8,'ADDONS zone add-on toggles render in the zone');
 // Finish selection
 ok(run("S.epoxyZones[0].finish")==='Gloss' && run("S.sealZones[0].finish")==='Matte','FINISH defaults: epoxy Gloss, seal Matte');
 var fp=run("[].map.call(document.querySelectorAll('#detailsContainer .zone-box'),function(z){return [].filter.call(z.querySelectorAll('.radio-pill'),function(p){return /^(Matte|Invisible|Gloss)$/.test(p.textContent);}).length;}).join(',')");
 ok(fp==='3,3','FINISH Matte / Invisible / Gloss on epoxy and seal (got '+fp+')');
 ok(JSON.parse(sec('epoxy-0')).desc.indexOf('Gloss finish')>-1,'FINISH prints on the quote line');
 run("setZoneVal('sealZones',0,'finish','Invisible')"); ok(JSON.parse(sec('seal-0')).desc.indexOf('Invisible finish')>-1,'FINISH Invisible on seal');
 ['tinted','gs'].forEach(function(t){ run("S.services."+t+"=true; addZone('"+t+"');"); });
 ok(run("document.querySelectorAll('#detailsContainer .zone-box').length")===4 && run("[].filter.call(document.querySelectorAll('#detailsContainer .radio-pill'),function(p){return p.textContent==='Invisible';}).length")===4,'FINISH on tinted and grind & seal too');
 run("S.tintedZones=[]; S.gsZones=[]; S.services.tinted=false; S.services.gs=false; renderDetails();");
 // Clean and seal
 ok(run("S.sealZones[0].type")==='Premium Next-Day Sealer','SEAL new zones default to the premium next-day sealer');
 var pills=run("[].map.call(document.querySelectorAll('#detailsContainer .zone-box')[1].querySelectorAll('.radio-group')[0].querySelectorAll('.radio-pill'),function(p){return p.textContent;}).join('|')");
 ok(pills==='Premium Next-Day Sealer','SEAL same-day is hidden by default (got '+pills+')');
 run("setShowHidden(true)"); pills=run("[].map.call(document.querySelectorAll('#detailsContainer .zone-box')[1].querySelectorAll('.radio-group')[0].querySelectorAll('.radio-pill'),function(p){return p.textContent;}).join('|')");
 ok(pills==='Same-Day Sealer|Premium Next-Day Sealer','SEAL show hidden options brings back same-day (got '+pills+')');
 run("setSZ_type(0,'Same-Day Sealer'); setShowHidden(false);");
 pills=run("[].map.call(document.querySelectorAll('#detailsContainer .zone-box')[1].querySelectorAll('.radio-group')[0].querySelectorAll('.radio-pill'),function(p){return p.textContent;}).join('|')");
 ok(pills==='Same-Day Sealer|Premium Next-Day Sealer','SEAL a zone already on same-day still shows it with hidden options off');
 run("S.sealZones[0].area=30; calcAll();"); ok(Math.abs(JSON.parse(sec('seal-0')).subtotal-600)<0.001,'SEAL same-day 30m² @ $20 = $600');
 run("setSZ_type(0,'Premium Next-Day Sealer')"); ok(Math.abs(JSON.parse(sec('seal-0')).subtotal-1050)<0.001,'SEAL premium next-day 30m² @ $35 = $1,050');
 run("savePriceTable({'seal|Premium Next-Day Sealer':38})"); ok(Math.abs(JSON.parse(sec('seal-0')).subtotal-1140)<0.001,'SEAL rates editable in the price table ($38 → $1,140)');
 run("savePriceTable({})"); ok(Math.abs(JSON.parse(sec('seal-0')).subtotal-1050)<0.001,'PRICE table reset puts $35 back');
 run("S.sealZones=[]; S.services.seal=false; renderDetails();");
 // Matte topcoat
 run("setZoneVal('epoxyZones',0,'finish','Matte')"); ok(JSON.parse(sec('epoxy-0')).addons.every(function(a){return a.label.indexOf('Matte Topcoat')<0;}),'MATTE no charge until the kit cost is filled in');
 ok(run("document.getElementById('detailsContainer').innerHTML").indexOf('set the matting kit cost')>-1,'MATTE zone says to set the kit cost');
 run("savePriceTable({'matte|kitCost':60})"); ok(run("matteRate()")===1.2,'MATTE $60 kit ÷ 100m² × 2 = $1.20/m²');
 var ep=JSON.parse(sec('epoxy-0')); var ml=ep.addons.find(function(a){return a.label.indexOf('Matte Topcoat')===0;});
 ok(ml && Math.abs(ml.price-54)<0.001 && Math.abs(ep.subtotal-(45*90+54))<0.001,'MATTE 45m² adds $54 to the zone (got '+(ml&&ml.price)+')');
 run("savePriceTable({'matte|kitCost':60,'matte|kitM2':80,'matte|markup':2.5})"); ok(run("matteRate()")===1.88,'MATTE coverage and markup editable ($1.88/m²)');
 run("savePriceTable({}); setZoneVal('epoxyZones',0,'finish','Gloss');");
 // Walls on all coatings
 run("S.epoxyZones[0].walls=true; S.epoxyZones[0].wallM2=10; calcAll();");
 ep=JSON.parse(sec('epoxy-0')); ok(Math.abs(ep.subtotal-(45*90+900))<0.001 && ep.addons.some(function(a){return a.label==='Walls (10m² @ $90/m²)';}),'WALLS epoxy walls default to the floor rate ($900)');
 run("S.epoxyZones[0].wallRate='70'; calcAll();"); ok(Math.abs(JSON.parse(sec('epoxy-0')).subtotal-(4050+700))<0.001,'WALLS wall rate editable ($700)');
 run("S.epoxyZones[0].walls=false; S.epoxyZones[0].wallRate='';");
 [['tinted',30],['seal',35],['gs',85],['aqua',20]].forEach(function(x){
   run("S.services."+x[0]+"=true; addZone('"+x[0]+"'); var z=S."+x[0]+"Zones[S."+x[0]+"Zones.length-1]; z.area=40; z.walls=true; z.wallM2=5; calcAll();");
   var sc=JSON.parse(sec(x[0]+'-0')); ok(sc && sc.addons.some(function(a){return a.label==='Walls (5m² @ $'+x[1]+'/m²)' && Math.abs(a.price-5*x[1])<0.001;}),'WALLS on '+x[0]+' ($'+(5*x[1])+')');
 });
 ok(run("document.querySelectorAll('#detailsContainer .toggle-label')").length>0 && run("[].filter.call(document.querySelectorAll('#detailsContainer .toggle-label'),function(t){return t.textContent==='Walls';}).length")===4,'WALLS toggle on every coating zone (epoxy, tinted, seal, grind & seal)');
 run("['tinted','seal','gs','aqua'].forEach(function(t){ S[t+'Zones']=[]; S.services[t]=false; }); renderDetails();");
 // Coving
 run("S.generalAddons.coving=true; S.generalAddons.covingLm=10; calcAll();"); ok(Math.abs(run("generalAddonsTotal()")-500)<0.001,'COVING standard $50/lm');
 run("S.generalAddons.coving=false; S.generalAddons.covingLm=0; S.epoxyZones[0].addons.turnup=true; S.epoxyZones[0].addons.coving=true; S.epoxyZones[0].addons.covingLm=4; calcAll();");
 ok(JSON.parse(sec('epoxy-0')).addons.some(function(a){return a.label==='Coving (4lm)' && a.price===200;}),'COVING standard inside epoxy zone $200 for 4lm');
 ok(run("PRICE.comm['Hychem Premium'].coving")===80 && run("PRICE.comm['Sika Standard'].coving")===80,'COVING commercial $80/lm');
 run("S.epoxyZones[0].addons.turnup=false; S.epoxyZones[0].addons.coving=false; calcAll();");
 // Price table is internal only
 var spec=run("JSON.stringify(priceTableSpec().map(function(g){return g.rows.filter(function(r){return typeof priceGet(PRICE,r.path)!==(r.text?'string':'number');}).length;}))");
 ok(JSON.parse(spec).every(function(n){return n===0;}),'PRICE TABLE every row points at a real rate');
 run("openPriceTable()"); ok(run("document.querySelectorAll('#priceTableBody [data-pt]').length")>80,'PRICE TABLE opens with all rates editable');
 run("savePriceTable({'epoxy|Flake Internal':-5,'addons|coving':'abc','travelRate':2})"); ok(run("PRICE.epoxy['Flake Internal']")===90 && run("PRICE.addons.coving")===50 && run("PRICE.travelRate")===2,'PRICE TABLE ignores bad entries');
 run("savePriceTable({}); closePriceTable();");
 run("generatePDF()"); ok(!/Price Table|kitCost|matting kit|Matting agent/.test(run("window.__doc")),'PRICE TABLE never on the PDF');
 // Site: auto days, travel, waste
 run("S.auto={days:true,travel:true,waste:true}; S.client.suburb=''; S.travel={mode:'suburb',place:'',km:0}; calcAll();");
 ok(run("S.custom.travelDays")===2,'SITE epoxy 45m² = 2 days');
 run("S.epoxyZones[0].area=100; calcAll();"); ok(run("S.custom.travelDays")===3,'SITE epoxy 100m² = 3 days');
 run("S.epoxyZones[0].area=45; S.epoxyZones[0].sys='Metallic Internal'; calcAll();"); ok(run("S.custom.travelDays")===3,'SITE metallic 45m² = 3 days');
 run("S.epoxyZones[0].sys='Flake Internal'; S.demo.tile=30; calcAll();"); ok(run("S.custom.travelDays")===3,'SITE tile removal over 20m² adds a day');
 run("S.demo.tile=0; calcAll();");
 ok(run("S.waste.enabled")===true && run("S.waste.m2")===45 && run("S.waste.tier")==='Light' && run("S.waste.runs")===1,'SITE waste turns on from the grind area (45m² light, 1 run)');
 ok(Math.abs(JSON.parse(sec('waste')).subtotal-45*0.39)<0.001 && !!sec('wasteRun'),'SITE waste priced $0.39/m² + tip run');
 run("setEZ_coat(0,'Epoxy Removal')"); ok(run("S.waste.tier")==='Heavy','SITE epoxy removal makes the waste Heavy');
 run("setEZ_coat(0,'None')");
 run("showTab('site')"); ok(run("document.getElementById('siteDaysBox').innerHTML").indexOf('AUTO')>-1,'SITE shows AUTO tags');
 // manual change to the waste area sticks
 run("var el=document.querySelector('#wasteContainer [data-bind=\"waste.m2\"]'); el.value='30'; el.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("S.auto.waste")===false && run("S.waste.m2")===30,'SITE typing a waste area switches waste to manual and keeps 30m²');
 run("S.epoxyZones[0].area=60; calcAll();"); ok(run("S.waste.m2")===30,'SITE manual waste area is not overwritten');
 run("setAuto('waste',true)"); ok(run("S.waste.m2")===60,'SITE ↺ Auto puts the grind area back');
 run("var d=document.getElementById('travelDays'); d.value='4'; d.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("S.auto.days")===false && run("S.custom.travelDays")===4,'SITE days editable (4)');
 run("setAuto('days',true)"); ok(run("S.custom.travelDays")===2,'SITE days back to auto');
 // Travel: suburb and custom location
 run("var sel=document.querySelector('#siteTravelBox .suburb-sel'); sel.value='Burleigh Heads'; onSuburbChange(sel);");
 ok(run("S.client.suburb")==='Burleigh Heads' && run("S.custom.travelKm")===3.5,'TRAVEL suburb dropdown still works (3.5km billable)');
 ok(Math.abs(JSON.parse(sec('travel')).subtotal-3.5*2*2*1.75)<0.001,'TRAVEL Burleigh 2 days = $24.50');
 ok(run("document.getElementById('suburbSel').value")==='Burleigh Heads','TRAVEL client step dropdown follows');
 run("var sel=document.querySelector('#siteTravelBox .suburb-sel'); sel.value='__custom__'; onSuburbChange(sel);");
 ok(run("S.travel.mode")==='custom' && !!run("document.querySelector('#siteTravelBox [data-bind=\"travel.km\"]')"),'TRAVEL Custom location shows town and km boxes');
 run("var p=document.querySelector('#siteTravelBox [data-bind=\"travel.place\"]'); p.value='Toowoomba'; p.dispatchEvent(new Event('input',{bubbles:true})); var k=document.querySelector('#siteTravelBox [data-bind=\"travel.km\"]'); k.value='160'; k.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("S.custom.travelKm")===135,'TRAVEL custom 160km one way → 135km billable');
 var tr=JSON.parse(sec('travel')); ok(Math.abs(tr.subtotal-135*2*2*1.75)<0.001 && tr.desc.indexOf('Toowoomba')===0,'TRAVEL Toowoomba 2 days = $945.00, named on the line (got '+tr.subtotal+')');
 ok(run("S.client.suburb")==='Toowoomba' && run("document.getElementById('travelCalcLine').textContent").indexOf('945.00')>-1,'TRAVEL site address and working line show Toowoomba');
 run("var b=document.querySelector('#siteTravelBox [data-bind=\"custom.travelKm\"]'); b.value='100'; b.dispatchEvent(new Event('input',{bubbles:true}));");
 ok(run("S.auto.travel")===false && run("S.custom.travelKm")===100,'TRAVEL billable km editable (100)');
 run("generatePDF()"); ok(run("window.__doc").indexOf('Toowoomba')>-1,'TRAVEL custom location prints on the quote');
 // Sub-panel amounts
 ok(/\$/.test(run("document.getElementById('subamt-floors').textContent")),'FLOW Floors panel shows its total');
 // Older quotes keep exactly what they had
 run("confirmReset(false);");
 run("restoreQuote({state:{client:{first:'Legacy',last:'Job',suburb:'Coolangatta'},services:{epoxy:true},epoxyZones:[{name:'G',sys:'Flake Internal',flake:'Standard',conc:'Hard',coat:'None',area:45,addons:{}}],tintedZones:[],sealZones:[{name:'P',type:'Premium Gloss',area:20}],gsZones:[],aquaZones:[],grindZones:[],polishedZones:[],careZones:[],shineZones:[],waste:{enabled:false,m2:0,tier:'Medium',runFee:true,runs:1},custom:{adjustType:'none',adjustAmount:0,items:[],travelKm:10,travelDays:3,carePromo:false}},measureShapes:[]})");
 ok(run("S.auto.days")===false && run("S.auto.travel")===false && run("S.auto.waste")===false,'LEGACY older quotes load with auto-fill off');
 ok(Math.abs(total()-(45*90+20*35+10*2*3*1.75))<0.001,'LEGACY older quote total unchanged (old seal tier, own travel, no waste) got '+total());
 ok(JSON.parse(sec('epoxy-0')).desc.indexOf('finish')<0,'LEGACY older zones without a finish print as before');
 // Central quote numbers
 run("confirmReset(false); S.client.first='Ref'; S.client.last='Test'; S.client.location='Internal'; window.__fo17=window.fetch; window.__p17=[]; window.fetch=function(u,o){ if(o&&o.method==='POST'){ var b=JSON.parse(o.body); window.__p17.push(b); if(b.action==='nextQuoteRef') return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',number:212,ref:'PXT-2026-212'}));}}); return Promise.resolve({text:function(){return Promise.resolve('{\"status\":\"ok\"}');}}); } return Promise.resolve({json:function(){return Promise.resolve({status:'saved',quotes:[]});}}); };");
 await run("saveQuote('new')");
 ok(run("S.client.ref")==='PXT-2026-212' && run("localStorage.getItem('poxit_quote_num')")==='212','REFS quote number comes from the shared sheet counter');
 run("window.fetch=function(){return Promise.reject('offline');}; S.saveKey='';");
 await run("saveQuote('new')");
 ok(run("S.client.ref")==='PXT-'+new Date().getFullYear()+'-213','REFS offline falls back to the device counter (213)');
 run("window.fetch=window.__fo17;");
 ok(run("document.getElementById('saveStatus').innerHTML").indexOf('PXT-')>-1,'SAVE step shows the saved ref');
 ok(run("driveQuoteName()")==='PXT-'+new Date().getFullYear()+'-213 - Ref Test.pdf','DRIVE name "PXT-ref - Client - Address.pdf"');
 run("confirmReset(false);");
 function r2(n){return Math.round(n*100)/100;} function fmtW(n){return '$'+n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
 // ===================== 18 NOV: PRICING, OFFERS, DEPOSITS, INVOICES =====================
 run("closeDocOverlay(); window.confirm=function(){return true;}; window.alert=function(){}; openDoc=function(h){window.__doc=h;}; freshState=window.__freshStateAuto; applyPriceOverrides({}); confirmReset(false); measureShapes=[]; S.auto={days:false,travel:false,waste:false};");
 // 1. pressure washing and ramping
 run("S.pwZones=[{name:'Drive',area:100}]; S.pwJob.tier='Standard'; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-800)<0.001,'PW Standard 100m² = $8/m² = $800');
 run("S.pwZones[0].area=120; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-920)<0.001 && JSON.parse(sec('pw')).addons[0].label==='First 100m² @ $8/m²' && JSON.parse(sec('pw')).addons[1].label==='Next 20m² @ $6/m²','PW Standard 120m² = 100 @ $8 + 20 @ $6 = $920');
 run("S.pwZones[0].area=100; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-800)<0.001,'PW Standard 100m² = $800 (all at $8)');
 run("S.pwZones[0].area=20; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-250)<0.001,'PW Standard 20m² lifts to the $250 minimum');
 run("S.pwZones[0].area=120; calcAll();");
 run("S.pwZones[0].area=20; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-250)<0.001,'PW $250 minimum kept');
 run("S.pwZones[0].area=150; S.pwJob.tier='Basic'; calcAll();"); ok(Math.abs(JSON.parse(sec('pw')).subtotal-750)<0.001,'PW Basic tier unchanged ($5/m²)');
 run("S.pwZones=[]; S.pwJob.tier='Standard'; S.ramps=[{name:'Garage lip',rise:50,width:1,ratio:12,material:'epoxysand'}]; calcAll();");
 ok(Math.abs(JSON.parse(sec('ramping')).subtotal-330)<0.001,'RAMP 2 batches x $55 x 3 = $330');
 run("S.ramps[0].rise=20; calcAll();"); ok(Math.abs(JSON.parse(sec('ramping')).subtotal-250)<0.001,'RAMP 1 batch ($165) lifts to the $250 minimum');
 run("S.ramps=[]; calcAll();");
 // 2-5. offers on a dummy quote: epoxy 45m² + patio seal 30m²
 run("S.client.first='Offer'; S.client.last='Test'; S.client.location='Internal'; S.services.epoxy=true; S.services.seal=true; addZone('epoxy'); S.epoxyZones[0].name='Garage'; S.epoxyZones[0].area=45; addZone('seal'); S.sealZones[0].name='Patio'; S.sealZones[0].type='Same-Day Sealer'; S.sealZones[0].area=30; calcAll();");
 ok(Math.abs(total()-4650)<0.001,'OFFERS base job $4,650 ex GST');
 run("setOffer('warranty','extended')"); ok(Math.abs(total()-4650*1.1)<0.001,'WARRANTY 5 years = 10% of job ex GST ($465)');
 run("savePriceTable({'offers|warrantyCap':300})"); ok(Math.abs(total()-4950)<0.001,'WARRANTY cap setting ($300)');
 run("savePriceTable({}); generatePDF();"); var wd=run("window.__doc");
 ok((wd.match(/Workmanship warranty: 5 years/g)||[]).length===2,'WARRANTY printed per system (5 years on both systems)');
 ok(wd.indexOf('Extend to 5 year workmanship warranty')>-1 && wd.indexOf('Or get the 5 year warranty included with our top Care Plan (includes a maintenance topcoat)')>-1,'WARRANTY both choices on the quote');
 run("setOffer('warranty','careplan')"); ok(Math.abs(total()-4650)<0.001 && run("warrantyText()").indexOf('top Care Plan')>-1,'WARRANTY Care Plan option: 5 years, no charge on the job');
 run("setOffer('warranty','standard'); generatePDF();"); ok((run("window.__doc").match(/Workmanship warranty: 1 year</g)||[]).length===2,'WARRANTY standard 1 year per system');
 run("setOffer('priority',true)"); ok(Math.abs(total()-(4650+250))<0.001,'PRIORITY 5% ($232.50) lifts to the $250 minimum');
 run("generatePDF()"); ok(run("window.__doc").indexOf('Priority booking: commence within 7 days of deposit.')>-1,'PRIORITY quote shows the priority start');
 run("S.epoxyZones[0].area=400; calcAll();"); ok(Math.abs(run("quoteMoney().extras.find(function(x){return x.key==='priority';}).ex")-1500)<0.001,'PRIORITY capped at $1,500');
 run("S.epoxyZones[0].area=45; setOffer('priority',false); generatePDF();"); ok(run("window.__doc").indexOf('Start date confirmed on deposit.')>-1,'PRIORITY standard shows "Start date confirmed on deposit"');
 run("setOffer('bundle',true)"); var mb=JSON.parse(run("JSON.stringify(quoteMoney().extras)"));
 ok(mb.length===1 && mb[0].label==='Bundle discount: 10% off Patio' && Math.abs(mb[0].ex+60)<0.001,'BUNDLE 10% off the second area ($60 off Patio)');
 run("setOffer('bookNow',true)"); var bn=JSON.parse(run("JSON.stringify(quoteMoney().extras.find(function(x){return x.key==='bookNow';}))"));
 ok(bn && bn.inc===-101 && Math.abs(run("quoteMoney().incGst")-(4590*1.1-101))<0.001,'BOOK NOW 2% of $5,049 inc GST rounds to $101 off');
 run("setOffer('careCredit',true)"); ok(run("S.offers.careCredit")===false && run("offerLimitText()").indexOf('Bundle discount + Book today')>-1,'LIMIT a third discount is blocked and the two active ones are named');
 run("setOffer('priority',true)"); ok(run("S.offers.priority")===true,'LIMIT paid upgrades never count toward the two');
 run("setOffer('priority',false); setOffer('bookNow',false); setOffer('careCredit',true);"); ok(Math.abs(run("quoteMoney().extras.find(function(x){return x.key==='careCredit';}).ex")+169)<0.001,'CARE CREDIT 75m² floor = Basic $169 off');
 run("showTab('review')"); ok(run("document.getElementById('offersBox').innerHTML").indexOf('Two offer limit reached')>-1,'LIMIT shown on the Review step');
 run("setOffer('careCredit',false); setOffer('bookNow',true);");
 // 7. deposits
 var inc1=run("quoteMoney().incGst");
 ok(Math.abs(run("quoteMoney().deposit.amount")-r2(inc1*0.10))<0.001 && run("quoteMoney().deposit.pct")===10,'DEPOSIT domestic $3,301 to $19,999 = 10%');
 run("generatePDF()"); ok(run("window.__doc").indexOf('50%')<0 && run("window.__doc").indexOf('10% deposit')>-1 && run("window.__doc").indexOf('QBCC')>-1,'DEPOSIT domestic quote never says 50%');
 run("setJobType('Commercial'); generatePDF();"); ok(run("quoteMoney().deposit.pct")===50 && run("window.__doc").indexOf('50% deposit')>-1,'DEPOSIT commercial 50%');
 run("setJobType('Domestic'); S.epoxyZones[0].area=10; S.sealZones=[]; S.offers.bundle=false; S.offers.bookNow=false; calcAll();"); ok(run("quoteMoney().deposit.pct")===20,'DEPOSIT domestic up to $3,300 = 20%');
 run("S.epoxyZones[0].area=300; calcAll();"); ok(run("quoteMoney().deposit.pct")===5,'DEPOSIT domestic $20,000 and over = 5%');
 run("S.epoxyZones[0].area=45; addZone('seal'); S.sealZones[0].name='Patio'; S.sealZones[0].area=30; S.offers.bundle=true; S.offers.bookNow=true; calcAll();");
 // price lock
 run("S.client.date=fmtAUDate(new Date()); S.client.valid='01/01/2099';"); ok(/^Accept within 14 days \(by \d\d\/\d\d\/\d{4}\) to lock in this price\. After that, pricing may be reviewed until this quote expires on 01\/01\/2099\.$/.test(run("priceLockText()")),'PRICE LOCK shows the lock deadline');
 run("S.client.date=fmtAUDate(new Date(Date.now()-16*86400000));"); ok(run("priceLockText()")==='This quote expires on 01/01/2099.','PRICE LOCK after 14 days shows just the expiry');
 // 8. invoices with payment history
 run("S.saveKey='PXT-1790000000001'; S.client.ref='PXT-2026-300'; LEDGER={key:S.saveKey,loaded:true,rows:[{invNo:'INV-2026-050',type:'Deposit',date:'01/12/2026',amount:494.8,paid:true},{invNo:'INV-2026-051',type:'Progress',date:'05/12/2026',amount:1000,paid:false,progressNo:1}]};");
 await run("makeInvoice('final')"); var fi=run("window.__doc"); var tot=run("quoteMoney().incGst");
 ok(fi.indexOf('Contract total inc GST')>-1 && fi.indexOf('Less deposit (INV-2026-050, 01/12/2026, paid)')>-1,'INVOICE lists the paid deposit with number and date');
 ok(fi.indexOf('Less progress payment 1 (INV-2026-051, 05/12/2026, unpaid)')>-1 && fi.indexOf('OUTSTANDING')>-1,'INVOICE lists the unpaid progress invoice as outstanding');
 ok(Math.abs(run("docCtx.amountDue")-r2(tot-494.8))<0.001,'INVOICE only paid invoices are deducted');
 ok(fi.indexOf('Pay ')<0,'EARLY PAY not offered while two offers are already used');
 run("S.offers.bookNow=false; calcAll();"); await run("makeInvoice('final', 0, '20/12/2026')"); var fe=run("window.__doc"); var tot2=run("quoteMoney().incGst");
 var disc=r2(tot2*0.03);
 ok(fe.indexOf('Pay '+fmtW(r2(tot2-494.8-disc))+' by 11:59pm on 20/12/2026 and save '+fmtW(disc)+'.')>-1,'EARLY PAY 3% of the contract on the final invoice');
 ok(fe.indexOf('Early payment discount applies only if the full balance is received by 11:59pm on the completion date. After that the full balance applies.')>-1,'EARLY PAY terms printed');
 ok(Math.abs(run("docCtx.earlyDiscount")-disc)<0.001,'EARLY PAY amount sent with the invoice');
 await run("makeInvoice('progress', 500)"); ok(run("window.__doc").indexOf('Progress payment 2')>-1 && run("docCtx.progressNo")===2,'PROGRESS invoices number themselves per quote (2)');
 run("LEDGER.rows=[{invNo:'INV-2026-050',type:'Deposit',amount:494.8,paid:true},{invNo:'INV-2026-052',type:'Final',amount:r2(quoteMoney().incGst-494.8),paid:true,onTime:true,earlyDiscount:100}];");
 ok(Math.abs(run("invoiceCalc('final',{ledger:LEDGER.rows}).balanceBefore"))<0.001 && Math.abs(run("invoiceCalc('final',{ledger:LEDGER.rows}).discountsTaken")-100)<0.001 && Math.abs(run("invoiceCalc('final',{ledger:LEDGER.rows}).received")-r2(run("quoteMoney().incGst")-100))<0.001,'EARLY PAY ticked on time: discount recorded, balance cleared with $100 less received');
 run("LEDGER.rows[1].onTime=false;"); ok(Math.abs(run("invoiceCalc('final',{ledger:LEDGER.rows}).discountsTaken"))<0.001 && Math.abs(run("invoiceCalc('final',{ledger:LEDGER.rows}).received")-r2(run("quoteMoney().incGst")))<0.001,'EARLY PAY not on time: no discount, the full amount is owed');
 run("LEDGER.rows=[]; S.client.jobType='Domestic'; showTab('save');"); ok(!!run("document.getElementById('ledgerBox')") && run("document.getElementById('ledgerBox').innerHTML").indexOf('Balance owing')>-1,'LEDGER payment view on the Save step');
 // variations
 run("setAccepted(true); addOnsiteArea('seal'); var z=S.sealZones[S.sealZones.length-1]; z.type='Same-Day Sealer'; z.area=20; calcAll();");
 var vl=JSON.parse(run("JSON.stringify(variationList().map(function(v){return {vid:v.vid,ex:v.ex,d:v.discountEx,days:v.days,ap:v.approved};}))"));
 ok(vl.length===1 && vl[0].vid==='V1' && Math.abs(vl[0].ex-400)<0.001 && Math.abs(vl[0].d+60)<0.001 && vl[0].days===1,'ONSITE area added after acceptance: variation V1, 15% off, +1 day');
 var vbefore=run("quoteMoney().incGst"); ok(run("quoteMoney().sections.every(function(x){return x.key!=='seal-1';})"),'ONSITE added area stays out of the original contract');
 run("openVariation('V1')"); ok(run("window.__doc").indexOf('VARIATION V1')>-1 && run("window.__doc").indexOf('Approved by client')>-1,'ONSITE variation PDF for client approval');
 ok(Math.abs(run("invoiceCalc('final',{ledger:[]}).totalInc")-r2(vbefore))<0.001,'VARIATION not approved: contract total unchanged');
 run("approveVariation('V1',true)"); ok(Math.abs(run("invoiceCalc('final',{ledger:[]}).totalInc")-r2(r2(vbefore)+374))<0.001,'VARIATION approved: adds $374 to the contract total');
 ok(run("jobTrackFlags().extraDays")===1,'ONSITE extra day goes to Job Track');
 // 6. close screen
 run("S.sealZones.pop(); S.offers.bundle=false; S.offers.bookNow=false; S.accepted=null; S.client.date=fmtAUDate(new Date()); showTab('close');"); var cb=run("document.getElementById('closeBox').innerHTML");
 ok(cb.indexOf('What we measured')>-1 && cb.indexOf('Garage')>-1 && cb.indexOf('Your price')>-1 && cb.indexOf('inc GST')>-1,'CLOSE shows what we measured and the price inc GST');
 ok(cb.indexOf('Next available start dates')<0,'CLOSE hides start dates with no calendar connected');
 ok(/Book today and save \$\d/.test(cb) && (cb.match(/close-offer/g)||[]).length===1,'CLOSE opens on the book today offer in dollars');
 run("nextCloseOffer(); nextCloseOffer(); nextCloseOffer(); nextCloseOffer(); nextCloseOffer();"); var cb2=run("document.getElementById('closeBox').innerHTML");
 run("nextCloseOffer();"); cb2=run("document.getElementById('closeBox').innerHTML");
 ok((cb2.match(/close-offer/g)||[]).length===7 && cb2.indexOf('Next offer')<0,'CLOSE Next offer reveals bundle, price lock, Care Plan credit, Black Label, priority and warranty');
 ok(!/\d+% off<\/h3>/.test(cb2.replace('save 10% on it','')) ,'CLOSE every offer headline is a dollar amount');
 run("toggleCloseOffer('bookNow'); toggleCloseOffer('careCredit'); toggleCloseOffer('bundle');"); ok(run("closeChosenDiscounts().length")===2,'CLOSE respects the two offer maximum');
 run("window.__fo18=window.fetch; window.fetch=function(u,o){ if(o&&o.method==='POST'){ var b=JSON.parse(o.body); if(b.action==='nextQuoteRef') return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',number:301,ref:'PXT-2026-301'}));}}); if(b.action==='nextInvoice') return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',number:60,ref:'INV-2026-060'}));}}); return Promise.resolve({text:function(){return Promise.resolve(JSON.stringify({status:'ok',invoices:[]}));}}); } return Promise.resolve({json:function(){return Promise.resolve({status:'saved',quotes:[],jobs:[]});}}); };");
 run("S.saveKey=''; S.client.ref='';"); await run("bookIt()");
 ok(run("S.accepted && S.accepted.how")==='in person' && run("S.offers.bookNow")===true && run("S.offers.careCredit")===true && run("docCtx.kind")==='Invoice' && run("docCtx.invType")==='Deposit','CLOSE Book it applies the offers, records acceptance and opens the deposit invoice');
 ok(run("window.__doc").indexOf('Care Plan sign up credit')>-1 && run("window.__doc").indexOf('Book today discount')>-1,'deposit invoice carries the chosen offers');
 run("window.fetch=window.__fo18; closeDocOverlay(); confirmReset(false);");
 // ===================== 19 NOV: invoice number, quote ref, footer =====================
 run("window.__fo19=window.fetch; window.__al19=window.alert; window.__alerts19=[]; window.alert=function(m){window.__alerts19.push(String(m));}; openDoc=function(h){window.__doc=h;}; confirmReset(false); S.client.first='Num'; S.client.last='Test'; S.saveKey='PXT-1790000000009'; S.client.ref='PXT-2026-200'; localStorage.setItem('poxit_inv_num','7');");
 run("window.fetch=function(u,o){ if(o&&o.method==='POST') return Promise.resolve({text:function(){return Promise.resolve('{\"status\":\"ok\"}');}}); return Promise.resolve({json:function(){return Promise.resolve({status:'ok',quotes:[]});}}); };");
 var r19=await run("nextInvoiceRef().then(function(r){return r.ref;})");
 ok(r19==='INV-'+new Date().getFullYear()+'-008','a sheet reply with no number falls back to the device counter (no "undefined")');
 ok(run("window.__alerts19.some(function(m){return m.indexOf('device')>-1;})"),'and says so before the invoice goes out');
 var threw=run("(function(){ try { invoiceDocHtml('deposit', undefined, {}); return false; } catch(e) { return /Invoice number missing/.test(e.message); } })()");
 ok(threw,'an invoice is never built without a number');
 await run("makeInvoice('deposit')"); var d19=run("window.__doc");
 ok(d19.indexOf('undefined')<0 && /Reference: <strong>INV-\d{4}-\d{3}<\/strong>/.test(d19),'invoice number and payment reference always filled in');
 ok(d19.indexOf('signed work contract')<0 && d19.indexOf('Payment is due as per the terms above.')>-1,'footer no longer mentions a signed work contract');
 ok(d19.indexOf('Quote Reference:</div><div class="client-value">PXT-2026-200<')>-1,'invoice shows the quote ref of the quote it is for');
 run("localStorage.setItem('poxit_quote_num','1'); window.fetch=function(u,o){ if(o&&o.method==='POST') return Promise.reject('offline'); return Promise.resolve({json:function(){return Promise.resolve({status:'ok',quotes:[{key:'PXT-1',name:'A',ref:'PXT-'+new Date().getFullYear()+'-125'},{key:'PXT-2',name:'B',ref:'PXT-'+new Date().getFullYear()+'-009'}]});}}); };");
 var q19=await run("nextQuoteRef().then(function(r){return r.ref;})");
 ok(q19==='PXT-'+new Date().getFullYear()+'-126','offline quote ref carries on from the sheet (PXT-…-126), never restarts at 001 on a new device');
 run("window.fetch=window.__fo19; window.alert=window.__al19; closeDocOverlay(); confirmReset(false);");
 // ===================== 20 NOV: epoxy finish tiers, seal default, pressure washing =====================
 run("confirmReset(false); S.client.first='Tier'; S.client.last='Test'; S.client.location='Internal'; S.client.suburb='Upper Coomera'; S.services.epoxy=true; addZone('epoxy'); var z=S.epoxyZones[0]; z.name='Garage'; z.area=40; z.flake='Marble Tone'; z.addons.nonslip=true; S.auto.days=true; showTab('services'); showSub('floors'); renderDetails(); calcAll();");
 var ez=function(){ return JSON.parse(sec('epoxy-0')); };
 ok(run("S.epoxyZones[0].tier")==='classic' && Math.abs(ez().subtotal-4200)<0.001,'TIER new zones are Classic: 40m² @ $95 (Marble Tone) + non slip $400 = $4,200');
 var dh=run("document.getElementById('detailsContainer').innerHTML");
 ok(['Classic','Gold','Platinum','Black Label'].every(function(n){ return dh.indexOf('>'+n+' <span')>-1; }) && dh.indexOf('<label>Sheen</label>')>-1,'TIER Finish selector shows the four finishes (gloss/matte pills now labelled Sheen)');
 ok(dh.indexOf('Fast-Cure Polyaspartic')<0,'TIER fast cure add-on gone from flake and quartz zones');
 var d0=run("estimateDays().days");
 run("setTier(0,'gold')"); ok(Math.abs(ez().subtotal-4800)<0.001 && ez().addons.some(function(a){return a.label==='Gold finish (40m² @ $15/m²)' && a.price===600;}),'TIER Gold +$15/m² stacks on flake and non slip ($4,800)');
 ok(run("estimateDays().days")===d0+1 && run("tierSpec(S.epoxyZones[0]).extraCoat")===1,'TIER Gold adds 1 day on site and 1 coat of disposables');
 run("setTier(0,'platinum')"); ok(Math.abs(ez().subtotal-5000)<0.001 && run("estimateDays().days")===d0,'TIER Platinum 1 coat +$20/m², no extra day');
 run("S.epoxyZones[0].platCoats='2'; calcAll();"); ok(Math.abs(ez().subtotal-5800)<0.001 && ez().addons[0].label.indexOf('2 coats polyaspartic topcoat')>-1,'TIER Platinum 2 coats +$40/m²');
 run("setTier(0,'blackLabel')"); ok(Math.abs(ez().subtotal-(3800+2000))<0.001 && !ez().addons.some(function(a){return /Non-slip/.test(a.label);}),'TIER Black Label +$50/m² and non slip comes off ($5,800)');
 ok(run("S.epoxyZones[0].addons.nonslip")===false && run("document.getElementById('detailsContainer').innerHTML").indexOf('Not with Black Label')>-1,'TIER non slip cannot go on Black Label');
 ok(run("tierSpec(S.epoxyZones[0]).floodL")===44 && run("estimateDays().days")===d0+1 && run("document.getElementById('detailsContainer').innerHTML").indexOf('clear flood epoxy 44 L')>-1,'TIER Black Label: 44 L clear flood epoxy (1 L/m² + 10%), +1 day, +1 coat');
 run("S.epoxyZones[0].sys='Flake External'; calcAll();"); ok(Math.abs(ez().subtotal-40*(110+5+50))<0.001,'TIER uplift sits on the external base rate too ($110 + $50)');
 run("S.epoxyZones[0].sys='Quartz Internal'; setTier(0,'gold');"); ok(Math.abs(ez().subtotal-40*(95+15))<0.001,'TIER quartz gets the Finish selector too');
 run("S.epoxyZones[0].sys='Metallic Internal'; renderDetails(); calcAll();"); ok(!ez().addons.some(function(a){return /finish \(/.test(a.label);}) && run("document.getElementById('detailsContainer').innerHTML").indexOf('Fast-Cure Polyaspartic')>-1,'TIER metallic has no Finish tiers and keeps its fast cure add-on');
 run("S.epoxyZones[0].sys='Flake Internal'; setTier(0,'gold'); generatePDF();"); var td=run("window.__doc");
 ok(td.indexOf('<strong>Gold finish:</strong> a subtle gloss with a light texture, great for interiors like kitchens and hallways.')>-1,'QUOTE shows the finish name and its one line description');
 ok(!/[‐-―-]/.test(run("FINISH_TIERS.map(function(t){return PRICE.finishDesc[t];}).join(' ')")),'QUOTE finish descriptions have no hyphens or dashes');
 run("savePriceTable({'finishName|gold':'Gold Plus','finish|gold':18}); generatePDF();"); td=run("window.__doc");
 ok(td.indexOf('<strong>Gold Plus finish:</strong>')>-1 && Math.abs(ez().subtotal-40*(95+18))<0.001,'SETTINGS finish names and uplifts are editable in the Price Table');
 run("openPriceTable()"); ok(run("document.querySelectorAll('#priceTableBody input[type=text][data-pt^=\"finishName\"]').length")===4,'SETTINGS name fields are text boxes');
 run("closePriceTable(); savePriceTable({}); closeDocOverlay();");
 // Close screen upsell: Classic on an internal area offers Black Label at the difference
 run("setTier(0,'classic'); S.epoxyZones[0].addons.nonslip=true; S.client.date=fmtAUDate(new Date()); calcAll(); CLOSE={step:0,chosen:{},prev:{}};");
 var ups=JSON.parse(run("JSON.stringify(blackLabelUpsells())"));
 ok(ups.length===1 && ups[0].title==='Upgrade Garage to Black Label: +$1,760.00' && /^Our flagship\. A smooth, deep, high gloss finish/.test(ups[0].sub),'UPSELL Classic internal area: Black Label for +$1,760 inc GST ($2,000 less the $400 non slip, plus GST)');
 var bl20=run("quoteMoney().incGst"); run("CLOSE.step=9; renderClose(); toggleCloseOffer('blackLabel-0');");
 ok(run("S.epoxyZones[0].tier")==='blackLabel' && Math.abs(run("quoteMoney().incGst")-bl20-1760)<0.01 && run("document.getElementById('closeBox').innerHTML").indexOf('✓ Added')>-1,'UPSELL Add this switches the area to Black Label and the price goes up by exactly that');
 run("toggleCloseOffer('blackLabel-0')"); ok(run("S.epoxyZones[0].tier")==='classic' && run("S.epoxyZones[0].addons.nonslip")===true && Math.abs(run("quoteMoney().incGst")-bl20)<0.01,'UPSELL tapping again puts Classic and non slip back');
 run("S.epoxyZones[0].sys='Flake External'; calcAll();"); ok(run("blackLabelUpsells().length")===0,'UPSELL not offered on external areas');
 run("S.epoxyZones[0].sys='Flake Internal'; setTier(0,'gold');"); ok(run("blackLabelUpsells().length")===0,'UPSELL only when Classic is picked');
 // old quotes: fast cure becomes Platinum, no double charge
 run("var st=JSON.parse(JSON.stringify(S)); st.epoxyZones[0].tier=undefined; delete st.epoxyZones[0].tier; st.epoxyZones[0].addons.fastcure=true; st.epoxyZones[0].addons.fastcureCoats='2'; st.epoxyZones[0].addons.nonslip=false; restoreQuote({state:st,measureShapes:[]}); calcAll();");
 ok(run("S.epoxyZones[0].tier")==='platinum' && run("S.epoxyZones[0].platCoats")==='2' && run("S.epoxyZones[0].addons.fastcure")===false && Math.abs(ez().subtotal-40*(95+40))<0.001,'OLD QUOTE fast cure 2 coats opens as Platinum 2 coats, charged once');
 // Clean and seal default and pressure washing
 run("S.services.seal=true; addZone('seal'); calcAll();"); ok(run("S.sealZones[0].type")==='Premium Next-Day Sealer','SEAL Premium Next Day is the default');
 ok(run("SERVICES.find(function(x){return x.key==='seal';}).rate").indexOf('Same-day')<0,'SEAL service tile no longer advertises same-day');
 run("S.pwJob=freshState().pwJob; S.pwJob.tier='Standard'; S.pwZones=[{name:'Drive',area:180}]; calcAll();"); ok(Math.abs(run("pwCalc().total")-(800+80*6))<0.001,'PW Standard 180m² = 100 @ $8 + 80 @ $6 = $1,280');
 run("confirmReset(false);");
 // ===================== 21 NOV: sanding and topcoat, post fit out check =====================
 run("confirmReset(false); S.client.first='Sand'; S.client.last='Test'; S.client.location='Internal'; S.client.date=fmtAUDate(new Date()); showTab('services'); showSub('floors'); S.services.sandtop=true; addZone('sandtop'); var z=S.sandtopZones[0]; z.name='Garage'; z.area=40; renderDetails(); calcAll();");
 var st=function(i){ return JSON.parse(sec('sandtop-'+(i||0))); };
 ok(run("SERVICES.some(function(x){return x.key==='sandtop';})") && run("document.getElementById('detailsContainer').innerHTML").indexOf('Sanding &amp; Topcoat')>-1,'SANDTOP service tile and card');
 ok(Math.abs(st().subtotal-1200)<0.001 && /UV stable topcoat · Gloss finish/.test(st().desc),'SANDTOP 40m² sand + UV topcoat @ $30 = $1,200');
 run("setST(0,'top','Polyaspartic Topcoat')"); ok(Math.abs(st().subtotal-1800)<0.001 && /polyaspartic/.test(st().desc),'SANDTOP polyaspartic @ $45 = $1,800');
 run("setST(0,'second',true); setST(0,'nonslip',true); setST(0,'pwFirst',true);");
 ok(Math.abs(st().subtotal-(1800+800+400+320))<0.001 && st().addons.length===3,'SANDTOP second coat $20, non slip $10, pressure clean first $8 per m² stack ($3,320)');
 run("setST(0,'top','UV Topcoat')"); ok(st().addons[0].label==='Second UV topcoat (40m² @ $15/m²)','SANDTOP second UV coat at $15');
 run("S.sandtopZones[0]=zoneDefaults('sandtop'); S.sandtopZones[0].area=10; calcAll();"); ok(Math.abs(st().subtotal-500)<0.001 && st().addons.some(function(a){return /Minimum job charge/.test(a.label);}),'SANDTOP small job lifts to the $500 minimum');
 run("addZone('sandtop'); S.sandtopZones[1].area=10; calcAll();"); ok(Math.abs(st(0).subtotal+st(1).subtotal-600)<0.001,'SANDTOP minimum is for the whole job, not each zone');
 ok(run("estimateDays().parts.some(function(p){return p.label==='Sanding and topcoat';})"),'SANDTOP counts toward days on site');
 ok(run("buildSections().some(function(x){return x.key==='coatingMin';})")===false,'SANDTOP does not trigger the $1,800 small coating minimum');
 // post fit out check
 run("S.sandtopZones=[]; S.services.sandtop=false; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].name='Living'; S.epoxyZones[0].area=50; renderAddons(); calcAll();");
 var ah=run("document.getElementById('addonsContainer').innerHTML");
 ok(ah.indexOf('Other trades still to come')>-1 && ah.indexOf('Post Fit Out Check')<0,'FITOUT card asks about other trades first');
 run("setFitout('trades',true)"); ok(run("document.getElementById('addonsContainer').innerHTML").indexOf('Post Fit Out Check')>-1 && sec('fitout')==='null','FITOUT check offered once trades follow, nothing charged yet');
 run("generatePDF()"); var fd=run("window.__doc");
 ok(fd.indexOf('not damage caused by other trades')>-1 && fd.indexOf('Ram Board')>-1 && fd.indexOf('Add a Post Fit Out Check')>-1,'FITOUT terms: other trade damage not covered, floor protection, check offered');
 run("setFitout('on',true)"); var fo=JSON.parse(sec('fitout'));
 ok(fo && Math.abs(fo.subtotal-250)<0.001 && /dated photos and the first hour/.test(fo.addons[0].label),'FITOUT $250 visit includes the first hour');
 run("S.fitout.hours=2; calcAll();"); ok(Math.abs(JSON.parse(sec('fitout')).subtotal-650)<0.001,'FITOUT 2 extra hours @ $200 = $650');
 ok(!run("JSON.stringify(bundleLines(buildSections()))").includes('fitout') ,'FITOUT never gets the bundle discount');
 run("generatePDF()"); fd=run("window.__doc"); ok(fd.indexOf('Post Fit Out Check')>-1 && fd.indexOf('Your Post Fit Out Check is booked')>-1 && !/[‐-―]/.test(fd.split('Post Fit Out Check')[1].slice(0,600)),'FITOUT on the quote with booked wording');
 run("setFitout('trades',false)"); ok(sec('fitout')==='null' && run("S.fitout.on")===false,'FITOUT switching trades off removes the check');
 run("var st2=JSON.parse(JSON.stringify(S)); delete st2.sandtopZones; delete st2.fitout; restoreQuote({state:st2,measureShapes:[]});"); ok(Array.isArray(run("S.sandtopZones")) && run("S.fitout.trades")===false,'OLD QUOTE opens with the new fields filled in');
 run("closeDocOverlay(); confirmReset(false);");
 // ===================== 24 NOV: invoice terms follow the invoice type =====================
 run("confirmReset(false); S.client.first='Terms'; S.client.last='Test'; S.client.location='Internal'; S.client.ref='PXT-2026-200'; S.client.date=fmtAUDate(new Date()); S.client.customDeposit=''; S.services.epoxy=true; addZone('epoxy'); S.epoxyZones[0].name='Garage'; S.epoxyZones[0].area=40; calcAll();");
 var TERMS={};
 var terms=function(stage,amt,ledger){ var h=run("invoiceDocHtml('"+stage+"','INV-2026-099',{ledger:"+JSON.stringify(ledger||[])+",amount:"+JSON.stringify(amt||'')+",date:new Date(2026,10,24)}).html"); var m=h.match(/<p style="font-size:11.5px;line-height:1.7;color:#333;">([\s\S]*?)<\/p>/); return m?m[1].replace(/<[^>]+>/g,''):''; };
 var inc=function(){ return run("r2(quoteMoney().incGst)"); };
 ['Domestic','Commercial'].forEach(function(jt){
   run("setJobType('"+jt+"'); calcAll();");
   var dom=jt==='Domestic', pct=run("depositPct(quoteMoney().incGst)"), tot=inc(), dep=run("r2(quoteMoney().incGst*depositPct(quoteMoney().incGst)/100)");
   var f=terms('full'); TERMS[jt+' full']=f;
   ok(/Payment in full is required to confirm your booking\./.test(f) && !/deposit/i.test(f) && !/QBCC/.test(f),'TERMS '+jt+' full payment: no deposit or QBCC wording');
   var d=terms('deposit'); TERMS[jt+' deposit']=d;
   ok(d.indexOf('A '+pct+'% deposit of '+run("fmt("+dep+")")+' is required to confirm your booking')>-1 && /The balance is due on completion, less any progress payments\./.test(d),'TERMS '+jt+' deposit shows '+pct+'% and the dollar amount');
   ok(dom ? /in line with the QBCC deposit limits for domestic building work/.test(d) : !/QBCC/.test(d),'TERMS '+jt+(dom?' deposit has':' deposit never has')+' the QBCC wording');
   var cd=terms('deposit',300); TERMS[jt+' custom deposit']=cd;
   ok(cd.indexOf('A deposit of $300.00 is required to confirm your booking')>-1 && cd.indexOf('%')<0,'TERMS '+jt+' custom deposit uses the typed amount');
   ok(dom ? /QBCC/.test(cd) : !/QBCC/.test(cd),'TERMS '+jt+' custom deposit QBCC wording only on domestic');
   var pr=terms('progress',2000,[{invNo:'INV-2026-090',type:'Deposit',amount:1000,paid:true}]); TERMS[jt+' progress']=pr;
   ok(pr.indexOf('Progress payment of $2,000.00 is due now. The balance of '+run("fmt(r2("+tot+"-1000-2000))")+' is due within 7 days of practical completion.')>-1 && !/QBCC|deposit/i.test(pr),'TERMS '+jt+' progress: amount now, balance within 7 days of practical completion');
   ok(Object.keys(TERMS).filter(function(k){return k.indexOf(jt)===0;}).every(function(k){ return /^All quotes are valid for 14 days from the date of issue\. /.test(TERMS[k]); }),'TERMS '+jt+' quote validity sentence unchanged');
   ok(Object.keys(TERMS).every(function(k){ return !/[‐-―]| - /.test(TERMS[k]); }),'TERMS '+jt+' no hyphens or dashes');
 });
 run("setJobType('Domestic'); calcAll();");
 var big=terms('deposit', 99999); ok(!/QBCC/.test(big),'TERMS domestic custom deposit above the QBCC limit leaves the QBCC wording off');
 var dh=run("invoiceDocHtml('deposit','INV-2026-099',{ledger:[],amount:1500}).html"); ok(dh.indexOf('<div>Deposit (due to confirm booking)</div><div class="p-amount">$1,500.00</div>')>-1,'TERMS custom deposit is the amount on the invoice');
 run("S.client.customDeposit=1200; calcAll();"); ok(/A deposit of \$1,200\.00/.test(terms('deposit')),'TERMS Details tab custom deposit still works');
 ok(/Warranty: 1 year workmanship warranty\./.test(run("invoiceDocHtml('full','INV-2026-099',{ledger:[]}).html").replace(/<[^>]+>/g,'')),'TERMS warranty sentence unchanged');
 run("S.client.customDeposit=''; generatePDF();"); ok(run("window.__doc").indexOf('in line with QBCC deposit limits for domestic building work')>-1,'TERMS quote and contract wording untouched');
 run("closeDocOverlay(); generateInvoice(); pickInvStage('deposit');"); ok(run("document.getElementById('invDepField').style.display")==='' && run("document.getElementById('invDep').placeholder").indexOf('Blank = '+run("depositPct(quoteMoney().incGst)")+'%')>-1,'TERMS invoice modal has the custom deposit field');
 run("pickInvStage('progress')"); ok(run("document.getElementById('invDepField').style.display")==='none','TERMS custom deposit field hides for other types');
 run("document.getElementById('invoiceModal').classList.remove('open'); confirmReset(false);");
 require('fs').writeFileSync('/tmp/claude-0/-home-claude/a30b5ba6-8492-582c-9f72-b37d1c5b8583/scratchpad/terms.json', JSON.stringify(TERMS,null,1));
 ok(errs.length===0,'no window errors '+errs.join('|'));
}catch(e){console.log('HARNESS ERROR',e.stack);process.exitCode=1;}},300);
