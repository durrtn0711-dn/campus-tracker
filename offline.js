/* Device-local academic data; no vault, payment documents or credentials. */
const CT = (()=>{
 let dbp, uid, pending=[], snapshots={}, syncing=false, enabled=true, online=true;
 const allowed=new Set(['courses','grades','tasks','deadlines','attendance','memos']);
 const open=()=>dbp??=new Promise((resolve,reject)=>{const r=indexedDB.open('campus-v11',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 async function io(mode,fn){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('state',mode),r=fn(tx.objectStore('state'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 const persist=()=>io('readwrite',s=>s.put({pending,snapshots},uid));
 async function init(id){uid=id;enabled=localStorage.getItem('ctOffline:'+id)!=='off';pending=[];snapshots={};if(enabled){try{const x=await io('readonly',s=>s.get(id));pending=x?.pending||[];snapshots=x?.snapshots||{}}catch(e){enabled=false;console.warn('Offline unavailable',e)}}online=navigator.onLine;status()}
 function status(){const e=document.getElementById('syncstatus');if(e)e.textContent=(navigator.onLine&&online?'Online':'Offline')+' · '+(pending.length?pending.length+' perubahan menunggu':enabled?'cache aktif':'cache nonaktif')}
 const neterr=e=>!navigator.onLine||/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(e?.message||'');
 function overlay(k,rows){let m=new Map(rows.map(r=>[r.id,r]));for(const q of pending.filter(q=>q.table===k)){if(q.op==='delete')m.delete(q.id);else m.set(q.id,{...m.get(q.id),...q.data,id:q.id})}return [...m.values()]}
 async function read(k){if(!allowed.has(k)||!enabled){if(!navigator.onLine)return {data:[],error:null};const r=await sb.from(k).select('*');if(neterr(r.error)){online=false;status();return {data:[],error:null}}return r}
  if(navigator.onLine){try{const r=await sb.from(k).select('*');if(!r.error){online=true;snapshots[k]=r.data||[];await persist().catch(console.warn);status();return {data:overlay(k,snapshots[k]),error:null}}if(!neterr(r.error))return r}catch(e){if(!neterr(e))throw e}}
  online=false;status();return {data:overlay(k,snapshots[k]||[]),error:null};
 }
 async function send(q){let x=sb.from(q.table);if(q.op==='insert')return x.upsert(q.data,{onConflict:'id',ignoreDuplicates:!(q.table==='attendance'&&q.data.session_key)});if(q.op==='update')return x.update(q.data).eq('id',q.id);return x.delete().eq('id',q.id)}
 async function write(table,op,id,data={}){if(op==='insert'){id=id||crypto.randomUUID();data={...data,id,user_id:uid,created_at:data.created_at||new Date().toISOString()};if(table==='memos')delete data.created_at}const q={table,op,id,data};
  if(!allowed.has(table)||!enabled){if(!navigator.onLine)return {error:{message:'Fitur ini membutuhkan koneksi internet.'}};return send(q)}
  if(!pending.length&&navigator.onLine){try{const r=await send(q);if(!r.error){online=true;status();return r}if(!neterr(r.error))return r}catch(e){if(!neterr(e))throw e}}
  pending.push(q);try{await persist()}catch(e){pending.pop();return {error:{message:'Penyimpanan offline gagal: '+e.message}}}status();if(navigator.onLine)void flush();return {error:null,queued:true};
 }
 async function flush(){if(!uid||!enabled||syncing||!navigator.onLine||!pending.length)return;syncing=true;try{const {data}=await sb.auth.getSession();if(data.session?.user.id!==uid)return;while(pending.length){const q=pending[0],r=await send(q);if(r.error){online=!neterr(r.error);if(online)toast('Sinkronisasi tertahan: '+r.error.message);break}const rows=snapshots[q.table]||[];snapshots[q.table]=q.op==='delete'?rows.filter(x=>x.id!==q.id):[...rows.filter(x=>x.id!==q.id),{...rows.find(x=>x.id===q.id),...q.data,id:q.id}];pending.shift();await persist();online=true}}catch(e){console.warn(e)}finally{syncing=false;status()}}
 async function clear(){if(uid)await io('readwrite',s=>s.delete(uid));pending=[];snapshots={};localStorage.removeItem('ctLastUser');status()}
 async function toggle(){if(pending.length)return toast('Sinkronkan perubahan dahulu.');if(enabled){await clear();enabled=false;localStorage.setItem('ctOffline:'+uid,'off')}else{enabled=true;localStorage.removeItem('ctOffline:'+uid);localStorage.setItem('ctLastUser',uid)}render()}
 return {init,read,write,flush,clear,toggle,status,allowed,get pending(){return pending.length},get enabled(){return enabled},get online(){return online&&navigator.onLine}};
})();
addEventListener('online',async()=>{await CT.flush();CT.status();if(!$('#mod').innerHTML&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))render()});
addEventListener('offline',()=>{CT.status();if(typeof lockV==='function')lockV()});
