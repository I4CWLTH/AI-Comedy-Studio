const http = require('node:http');
const key = process.env.BUFFER_API_KEY;
async function query(q) {
  const response = await fetch('https://api.buffer.com', {method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({query:q}),signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Buffer HTTP '+response.status);
  const result=await response.json();
  if(result.errors?.length || !result.data) throw new Error('Buffer query rejected');
  return result.data;
}
let status='Awaiting API key';
async function verify(){
 if(!key)return;
 try {
  const data=await query('query { account { organizations { id } } }');
  let found=false;
  for(const org of data.account.organizations){
    const data=await query('query { channels(input: { organizationId: '+JSON.stringify(org.id)+' }) { id service } }');
    if(data.channels.some(c=>String(c.service).toLowerCase()==='tiktok')) found=true;
  }
  status=found?'TikTok connection verified (read-only)':'Buffer authenticated; no TikTok channel found';
 }catch(e){status='Connection validation failed; inspect configuration';console.error('Read-only verification:',e.message);}
}
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 if(req.url==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,mode:'read-only'}));}
 if(req.url!=='/'){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>AI Comedy Studio</title><style>*{box-sizing:border-box}body{background:#10111b;color:#f8fafc;font:16px system-ui;margin:0;padding:5vw}main{max-width:900px;margin:auto}section{background:#202236;padding:24px;border-radius:16px;margin:16px 0}input,textarea,select,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #555;background:#151627;color:white;margin:6px 0}input:not([type=file]),textarea{width:100%}button{background:#6545cf;cursor:pointer}video{max-width:100%;max-height:500px}small{color:#b8b5df}label{display:block}button:disabled{opacity:.4}</style><main><small>PHASE 2 • CREATOR WORKSPACE</small><h1>AI Comedy Studio</h1><p>BUFFER_STATUS</p><section><h2>01 / Story room</h2><label>Premise<input id=\"premise\" placeholder=\"A ridiculous situation\"></label><label>Character<input id=\"character\" placeholder=\"Main character\"></label><button id=\"generate\">Draft comedy outline</button><small>Local template generator, no paid AI service.</small><textarea id=\"script\" rows=\"10\" placeholder=\"Write or edit your script here\"></textarea><button id=\"save\">Save draft on this device</button><button id=\"download\">Export script</button></section><section><h2>02 / Screening room</h2><p>Import a finished vertical video to preview locally. Video generation is not yet connected.</p><input type=\"file\" id=\"file\" accept=\"video/*\"><video id=\"video\" controls playsinline></video><p><label><input type=\"checkbox\" id=\"approve\" disabled> Approve this preview for future publishing</label></p><p id=\"state\">Awaiting video. Publishing disabled.</p></section></main><script>const $=id=>document.getElementById(id);try{$('script').value=localStorage.getItem('comedyDraft')||''}catch{};$('generate').onclick=()=>{const p=$('premise').value.trim()||'An awkward misunderstanding',c=$('character').value.trim()||'The overconfident friend';$('script').value='0–3s | HOOK: '+c+' announces a foolproof plan.\\n3–12s | SETUP: '+p+'.\\n12–22s | ESCALATION: The plan makes everything worse. A second character notices the obvious mistake.\\n22–30s | TWIST: Reveal that the mistake was the plan all along. End on a reaction shot.\\n\\nAdd original dialogue and shot details before filming.'};$('save').onclick=()=>{try{localStorage.setItem('comedyDraft',$('script').value);$('save').textContent='Draft saved'}catch{$('save').textContent='Storage unavailable'}};$('download').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('script').value],{type:'text/plain'}));a.download='comedy-script.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};let url;$('file').onchange=()=>{if(url)URL.revokeObjectURL(url);$('approve').checked=false;$('approve').disabled=true;$('state').textContent='Awaiting valid video. Publishing disabled.';const f=$('file').files[0];if(f){url=URL.createObjectURL(f);$('video').src=url}};$('video').onloadedmetadata=()=>{$('approve').disabled=false;$('state').textContent='Ready for review. Publishing disabled.'};$('approve').onchange=()=>{$('state').textContent=$('approve').checked?'Locally approved for review. Publishing disabled.':'Awaiting approval. Publishing disabled.'};</script></html>".replace('BUFFER_STATUS',status));
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>{if(key){status='Validating connection';verify();}});
