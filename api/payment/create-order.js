function send(res,code,data){res.status(code).setHeader('Content-Type','application/json').send(JSON.stringify(data));}
const env=n=>String(process.env[n]||'').trim();
async function authUser(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return null;const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw Error('Supabase server config missing');const r=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});return r.ok?r.json():null;}
async function db(path,method='GET',body){const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw Error('Set SUPABASE_SERVICE_ROLE_KEY in Vercel (server-only)');const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.message||'Database request failed');return d;}

module.exports=async function(req,res){
 if(req.method!=='POST')return send(res,405,{ok:false,msg:'Method not allowed'});
 try{
  const u=await authUser(req);if(!u?.id)return send(res,401,{ok:false,msg:'Please log in again'});
  const id=String(req.body?.registrationId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{ok:false,msg:'Invalid registration'});
  const rows=await db('payments?registration_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(u.id)+'&select=id,amount,status');
  const p=rows?.[0];if(!p)return send(res,404,{ok:false,msg:'Payment not found for this account'});if(p.status==='paid')return send(res,409,{ok:false,msg:'Already paid'});
  const key=env('RAZORPAY_KEY_ID'),secret=env('RAZORPAY_KEY_SECRET');if(!key||!secret)return send(res,503,{ok:false,msg:'Razorpay credentials are not configured in Vercel'});
  const reg=(await db('registrations?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(u.id)+'&select=registration_code,events(title)'))?.[0];if(!reg)return send(res,404,{ok:false,msg:'Registration could not be verified'});
  const ev=Array.isArray(reg.events)?reg.events[0]:reg.events;
  const rr=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({amount:Number(p.amount)*100,currency:'INR',receipt:String(reg.registration_code||id).slice(0,40),notes:{registration_id:id,user_id:u.id}})});
  const order=await rr.json();if(!rr.ok||!order.id)return send(res,502,{ok:false,msg:order.error?.description||'Razorpay order creation failed'});
  await db('payments?id=eq.'+encodeURIComponent(p.id)+'&user_id=eq.'+encodeURIComponent(u.id),'PATCH',{payment_mode:'gateway',gateway_order_id:order.id,gateway_payment_id:'',payment_reference:'',status:'pending'});
  return send(res,200,{ok:true,orderId:order.id,amount:order.amount,currency:order.currency,key,eventTitle:ev?.title||'NCC Event Registration',participantName:u.user_metadata?.name||'',email:u.email||''});
 }catch(e){return send(res,500,{ok:false,msg:e.message||'Payment order error'});}
};
