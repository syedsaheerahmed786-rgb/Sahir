const {chromium}=require('playwright');
const path=require('path'), fs=require('fs');
(async()=>{
  const REEL=process.argv.includes('--reel');
  const times=process.argv.slice(2).filter(a=>a!=='--reel').map(Number);
  const dir=__dirname;
  const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--disable-lcd-text']});
  const pg=await b.newPage({viewport:{width:REEL?1080:1920,height:REEL?1920:1080},deviceScaleFactor:1});
  const errs=[];
  pg.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
  await pg.goto('file://'+path.join(dir,'scene.html')+(REEL?'?reel=1':''));
  await pg.waitForFunction('window.__ready===true',{timeout:30000}).catch(e=>errs.push('READY TIMEOUT'));
  fs.mkdirSync(path.join(dir,'probe'),{recursive:true});
  for(const t of times){
    await pg.evaluate(tt=>window.renderFrame(tt),t);
    const buf=await pg.evaluate(()=>document.getElementById('c').toDataURL('image/png'));
    fs.writeFileSync(path.join(dir,'probe',`${REEL?'r':''}t${t.toFixed(2)}.png`),Buffer.from(buf.split(',')[1],'base64'));
  }
  console.log(errs.length?errs.join('\n'):'no errors');
  await b.close();
})();
