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
 res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Comedy Studio</title><style>body{background:#111827;color:#f8fafc;font:18px system-ui;margin:0;padding:8vw}main{max-width:680px;margin:auto;padding:36px;background:#1f2937;border-radius:20px}small{color:#a5b4fc}p{line-height:1.6}</style><main><small>CONNECTION TEST | PHASE 1</small><h1>AI Comedy Studio</h1><p>'+status+'</p><p>Publishing is disabled. No videos or posts can be created by this version.</p><small>Refresh after configuration.</small></main></html>');
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>{if(key){status='Validating connection';verify();}});
