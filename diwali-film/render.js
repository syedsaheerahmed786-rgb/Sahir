const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path');
const DIR=__dirname, FPS=30;
const REEL=process.argv.includes('--reel');
const OUTW=REEL?1080:1920, OUTH=REEL?1920:1080;
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb','--disable-lcd-text','--disable-gpu-vsync']});
  const pg=await b.newPage({viewport:{width:OUTW,height:OUTH},deviceScaleFactor:1});
  const errs=[];
  pg.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  await pg.goto('file://'+path.join(DIR,'scene.html')+(REEL?'?reel=1':''));
  await pg.waitForFunction('window.__ready===true',{timeout:60000});
  const DUR=await pg.evaluate('window.DURATION');
  const total=Math.round(DUR*FPS);
  const ff=spawn('ffmpeg',['-y','-loglevel','error',
    '-f','image2pipe','-framerate',String(FPS),'-i','pipe:0',
    '-f','f32le','-ar','48000','-ac','2','-i',path.join(DIR,'score.f32'),
    '-map','0:v','-map','1:a',
    '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p',
    '-profile:v','high','-level','4.2','-g','60',
    '-c:a','aac','-b:a','192k','-ar','48000',
    '-movflags','+faststart','-shortest',
    path.join(DIR,REEL?'diwali-reel.mp4':'diwali.mp4')]);
  ff.stderr.on('data',d=>process.stderr.write(d));
  const done=new Promise(res=>ff.on('close',res));
  const t0=Date.now();
  for(let i=0;i<total;i++){
    const t=i/FPS;
    const url=await pg.evaluate(tt=>{window.renderFrame(tt);return document.getElementById('c').toDataURL('image/png');},t);
    const buf=Buffer.from(url.slice(url.indexOf(',')+1),'base64');
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    if(i%120===0){
      const el=(Date.now()-t0)/1000;
      console.log(`frame ${i}/${total}  ${el.toFixed(0)}s elapsed  eta ${(el/Math.max(i,1)*(total-i)).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  const code=await done;
  console.log('ffmpeg exit',code,'| frames',total,'| errors:',errs.length?errs.join('; '):'none');
  await b.close();
})();
