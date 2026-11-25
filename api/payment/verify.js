const crypto=require('node:crypto');
function send(res,code,data){res.status(code).setHeader('Content-Type','application/json').send(JSON.stringify(data));}
const env=n=>String(process.env[n]||'').trim();
async function authUser(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return null;const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw Error('Supabase server config missing');const r=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});return r.ok?r.json():null;}
async function db(path,method='GET',body){const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw Error('Set SUPABASE_SERVICE_ROLE_KEY in Vercel (server-only)');const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.message||'Database request failed');return d;}

module.exports=async function(req,res){
 if(req.method!=='POST')return send(res,405,{ok:false,msg:'Method not allowed'});
 try{
  const u=await authUser(req);if(!u?.id)return send(res,401,{ok:false,msg:'Please log in again'});
  const b=req.body||{},id=String(b.registrationId||''),oid=String(b.razorpay_order_id||''),pid=String(b.razorpay_payment_id||''),sig=String(b.razorpay_signature||'');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!oid||!pid||!sig)return send(res,400,{ok:false,msg:'Payment verification details missing'});
  const secret=env('RAZORPAY_KEY_SECRET'),key=env('RAZORPAY_KEY_ID');if(!secret||!key)return send(res,503,{ok:false,msg:'Razorpay credentials missing'});
  const expected=crypto.createHmac('sha256',secret).update(oid+'|'+pid).digest(),given=Buffer.from(sig,'hex');if(expected.length!==given.length||!crypto.timingSafeEqual(expected,given))return send(res,400,{ok:false,msg:'Invalid payment signature'});
  const p=(await db('payments?registration_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(u.id)+'&gateway_order_id=eq.'+encodeURIComponent(oid)+'&select=id,amount,status'))?.[0];
  if(!p)return send(res,404,{ok:false,msg:'Order does not belong to this registration'});if(p.status==='paid')return send(res,200,{ok:true,msg:'Payment already verified'});
  const auth='Basic '+Buffer.from(key+':'+secret).toString('base64');let r=await fetch('https://api.razorpay.com/v1/payments/'+encodeURIComponent(pid),{headers:{Authorization:auth}});let payment=await r.json();
  if(!r.ok||payment.order_id!==oid||Number(payment.amount)!==Number(p.amount)*100)return send(res,402,{ok:false,msg:'Payment amount/order mismatch'});
  if(payment.status==='authorized'){r=await fetch('https://api.razorpay.com/v1/payments/'+encodeURIComponent(pid)+'/capture',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({amount:Number(p.amount)*100,currency:'INR'})});payment=await r.json();}
  if(!r.ok||payment.status!=='captured')return send(res,402,{ok:false,msg:'Payment is not captured yet. Contact the organizer before paying again.'});
  await db('payments?id=eq.'+encodeURIComponent(p.id)+'&user_id=eq.'+encodeURIComponent(u.id),'PATCH',{status:'paid',payment_reference:pid,gateway_payment_id:pid,verified_at:new Date().toISOString()});
  return send(res,200,{ok:true,msg:'Payment captured and verified. Status updated to Paid.'});
 }catch(e){return send(res,500,{ok:false,msg:e.message||'Payment verification error'});}
};
