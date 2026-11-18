import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {localDB} from './local-db.mjs';
import {createWorker} from '../worker/index.mjs';
const assets={};
for(const [path,type] of Object.entries({'/index.html':'text/html','/app.js':'text/javascript','/model.js':'text/javascript','/remote.js':'text/javascript','/style.css':'text/css','/remote.css':'text/css'}))assets[path]={type,body:await readFile(new URL('../dist'+path,import.meta.url),'utf8')};
const worker=createWorker(assets),DB=localDB();
createServer(async(req,res)=>{
 try{let body='';for await(const chunk of req)body+=chunk;
 const result=await worker.fetch(new Request('http://127.0.0.1:8765'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body})}),{DB});
 res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end('Local preview failed');console.error(error);}
}).listen(8765,'127.0.0.1',()=>console.log('Courtside preview http://127.0.0.1:8765'));
