import http from 'node:http';
import {once} from 'node:events';
import {createAppServer} from '../server.mjs';

// Public application shell. School data still requires its own session cookie.
export async function createPublicServer({origin,appFactory=()=>createAppServer()}={}){
 const publicUrl=new URL(origin);
 if(publicUrl.origin!==origin||publicUrl.protocol!=='https:'||publicUrl.username||publicUrl.password)throw new Error('Une origine HTTPS est requise.');
 const backend=appFactory();backend.listen(0,'127.0.0.1');await once(backend,'listening');
 const target=`http://127.0.0.1:${backend.address().port}`;
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Strict-Transport-Security','max-age=31536000');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const fail=status=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Requête non autorisée.'}));};
  if(!req.url?.startsWith('/')||req.url.startsWith('//')){fail(400);return;}
  const path=new URL(req.url,origin).pathname;
  if(path==='/healthz'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
  if(req.headers.host!==publicUrl.host){fail(403);return;}
  if(!['GET','HEAD','POST'].includes(req.method)){fail(405);return;}
  if(req.method==='POST'&&req.headers.origin!==origin){fail(403);return;}
  if(path.startsWith('/api/')&&req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])){fail(403);return;}
  if(path==='/private/login'||path==='/private/logout'){
   res.writeHead(303,{Location:'/','Set-Cookie':'__Host-repere_access=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0'});res.end();return;
  }
  const headers={...req.headers,host:new URL(target).host};
  for(const key of ['forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for','authorization','connection','transfer-encoding','upgrade'])delete headers[key];
  if(req.headers.origin)headers.origin=target;
  const proxy=http.request(target+req.url,{method:req.method,headers},upstream=>{
   const responseHeaders={...upstream.headers};delete responseHeaders.connection;delete responseHeaders['transfer-encoding'];
   if(responseHeaders['set-cookie'])responseHeaders['set-cookie']=responseHeaders['set-cookie'].map(c=>/;\\s*Secure/i.test(c)?c:c+'; Secure');
   res.writeHead(upstream.statusCode||502,responseHeaders);upstream.pipe(res);upstream.on('error',()=>res.destroy());
  });
  proxy.setTimeout(300000,()=>proxy.destroy());
  proxy.on('error',()=>{if(!res.headersSent)fail(502);else res.end();});
  req.on('aborted',()=>proxy.destroy());res.on('close',()=>{if(!res.writableEnded)proxy.destroy();});req.pipe(proxy);
 });
 server.requestTimeout=300000;server.headersTimeout=15000;
 server.on('close',()=>{backend.closeAllConnections();backend.close();});
 return server;
}
