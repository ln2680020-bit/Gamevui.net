const http=require('http'),fs=require('fs'),path=require('path');
const rooms=new Map();
function bcast(code){const r=rooms.get(code);if(!r)return;
  const msg='data: '+JSON.stringify([...r].map(([id,p])=>({peer:id,presence:p.presence})))+'\n\n';
  for(const p of r.values()){try{p.res.write(msg)}catch(e){}}}
http.createServer((q,s)=>{
  const u=new URL(q.url,'http://x'),code=(u.searchParams.get('room')||'').slice(0,20),id=(u.searchParams.get('id')||'').slice(0,40);
  if(u.pathname==='/'){s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return s.end(fs.readFileSync(path.join(__dirname,'index.html')))}
  if(u.pathname==='/events'&&code&&id){
    s.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no'});
    s.write('retry: 1500\n\n');
    if(!rooms.has(code))rooms.set(code,new Map());
    const r=rooms.get(code),old=r.get(id);
    if(old){try{old.res.end()}catch(e){}}
    const me={presence:old?old.presence:{},res:s};r.set(id,me);
    const ka=setInterval(()=>{try{s.write(': ka\n\n')}catch(e){}},20000);
    q.on('close',()=>{clearInterval(ka);setTimeout(()=>{
      if(rooms.get(code)===r&&r.get(id)===me){r.delete(id);if(!r.size)rooms.delete(code);else bcast(code)}},15000)});
    return bcast(code)}
  if(u.pathname==='/presence'&&q.method==='POST'){let b='';
    q.on('data',d=>{b+=d;if(b.length>16384)q.destroy()});
    q.on('end',()=>{try{const{room,id,patch}=JSON.parse(b),p=rooms.get(room)&&rooms.get(room).get(id);
      if(p&&patch&&typeof patch==='object'){for(const k in patch){patch[k]===null?delete p.presence[k]:p.presence[k]=patch[k]}bcast(room)}}catch(e){}
      s.end('ok')});return}
  s.writeHead(404);s.end()
}).listen(process.env.PORT||3000,()=>console.log('Game chạy tại http://localhost:'+(process.env.PORT||3000)));
