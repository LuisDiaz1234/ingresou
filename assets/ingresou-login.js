
/* ========= IngresoU — Auto-login con auto-redeem =========
   Requisitos: Debe existir el bloque de login con IDs:
   - form:     #key-login-form
   - key input:#key-input
   - mail:     #email-input
   - button:   #login-btn
   - status:   #login-status (se creará si no existe)

   Qué hace:
   - Verifica KEY+email en /api/get-subscription
   - Si responde NOT_REDEEMED → llama /api/redeem-key y reintenta
   - Si OK → guarda en localStorage y redirige a /premium.html
   - Muestra errores claros (NOT_FOUND, EXPIRED, EMAIL_MISMATCH)
*/
(function () {
  const $ = (id)=>document.getElementById(id);
  const stEl = ()=> document.getElementById('login-status') || (function(){
    const el = document.createElement('div');
    el.id = 'login-status';
    el.style.marginTop = '8px';
    el.style.fontSize = '12px';
    (document.getElementById('key-login-form') || document.body).appendChild(el);
    return el;
  })();

  function setStatus(msg, type='info'){
    const colors = {info:'#374151', ok:'#059669', warn:'#b45309', err:'#b91c1c'};
    const el = stEl;
    (typeof el === 'function' ? el() : el).style.color = colors[type] || colors.info;
    (typeof el === 'function' ? el() : el).textContent = msg;
  }

  async function getSub(code,email){
    const r = await fetch('/api/get-subscription', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, email })
    });
    return r.json();
  }
  async function redeem(code,email){
    const r = await fetch('/api/redeem-key', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, email })
    });
    return r.json();
  }
  function saveSession(code,email, sub){
    try{
      localStorage.setItem('ingresou_key', code);
      localStorage.setItem('ingresou_email', email);
      if (sub?.university) localStorage.setItem('ingresou_university', sub.university);
      if (sub?.plan)       localStorage.setItem('ingresou_plan',       sub.plan);
      if (sub?.expires_at) localStorage.setItem('ingresou_expires_at', sub.expires_at);
    }catch{}
  }

  async function loginFlow(code,email){
    setStatus('Verificando acceso…');
    let res = await getSub(code,email);
    let payload = res?.subscription || res;

    if (payload?.ok === false && payload?.error === 'NOT_REDEEMED'){
      setStatus('Activando tu KEY…');
      const r2 = await redeem(code,email);
      if (!(r2?.ok || r2?.error === 'ALREADY_REDEEMED')){
        setStatus('No se pudo activar: ' + (r2?.error || 'ERROR'), 'err');
        return;
      }
      res = await getSub(code,email);
      payload = res?.subscription || res;
    }

    if (payload?.ok === false){
      const err = payload?.error || 'ERROR';
      if (err === 'NOT_FOUND')         setStatus('La KEY no existe en DB. En admin.html pulsa “Emitir en DB”.','err');
      else if (err === 'EXPIRED')      setStatus('La KEY está vencida. Solicita renovación.','err');
      else if (err === 'EMAIL_MISMATCH') setStatus('El correo no coincide con el de emisión.','err');
      else setStatus('Error: ' + err, 'err');
      return;
    }

    setStatus('Acceso verificado. Entrando…','ok');
    saveSession(code,email,payload);
    location.href = '/premium.html';
  }

  function bind(){
    const form = document.getElementById('key-login-form');
    const key  = document.getElementById('key-input');
    const mail = document.getElementById('email-input');
    const btn  = document.getElementById('login-btn');
    if (!key || !mail || !btn) return;

    function go(e){
      e?.preventDefault?.();
      const code  = (key.value  || '').trim().toUpperCase();
      const email = (mail.value || '').trim().toLowerCase();
      if (!code || !email){ setStatus('Ingresa tu KEY y tu correo.', 'warn'); return; }
      loginFlow(code,email).catch((err)=>{ console.error(err); setStatus('Error de red o servidor.', 'err'); });
    }

    btn.addEventListener('click', go);
    form?.addEventListener?.('submit', go);

    // Autologin por query (?code=&email=)
    const qs = new URLSearchParams(location.search);
    if (qs.get('code') && qs.get('email')){
      key.value  = (qs.get('code')  || '').toUpperCase();
      mail.value = (qs.get('email') || '').toLowerCase();
      go(new Event('submit'));
    }
  }

  document.addEventListener('DOMContentLoaded', bind);
})();
