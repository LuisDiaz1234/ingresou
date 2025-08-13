/* ========= IngresoU — Login robusto (auto-redeem + sesión) ========= */
(function () {
  const $ = (id)=>document.getElementById(id);

  function statusEl() {
    return document.getElementById('login-status') || (() => {
      const el = document.createElement('div'); el.id='login-status';
      el.style.fontSize='12px'; el.style.marginTop='8px';
      (document.getElementById('key-login-form')||document.body).appendChild(el);
      return el;
    })();
  }
  function setStatus(msg, kind='info') {
    const colors={info:'#374151',ok:'#059669',warn:'#b45309',err:'#b91c1c'};
    const el = statusEl(); el.style.color = colors[kind]||colors.info; el.textContent = msg;
  }
  function saveSession(code,email,sub){
    try{
      localStorage.setItem('ingresou_key', code);
      localStorage.setItem('ingresou_email', email);
      if (sub?.university) localStorage.setItem('ingresou_university', sub.university);
      if (sub?.plan)       localStorage.setItem('ingresou_plan',       sub.plan);
      if (sub?.expires_at) localStorage.setItem('ingresou_expires_at', sub.expires_at);
    }catch{}
  }
  async function postJson(path, payload){
    const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload||{}) });
    let j=null; try{ j=await r.json(); }catch{}
    return j || { ok:false, error:'BROKEN_RESPONSE' };
  }

  async function loginFlow(code,email){
    setStatus('Verificando acceso…');
    let res = await postJson('/api/get-subscription', { code, email });
    let payload = res?.subscription || res;

    if (payload?.ok === false && payload?.error === 'NOT_REDEEMED'){
      setStatus('Activando tu KEY…');
      const r2 = await postJson('/api/redeem-key', { code, email });
      if (!(r2?.ok || r2?.error === 'ALREADY_REDEEMED')){
        setStatus('No se pudo activar: ' + (r2?.error || 'ERROR'), 'err'); return;
      }
      res = await postJson('/api/get-subscription', { code, email });
      payload = res?.subscription || res;
    }

    if (payload?.ok === false){
      const err = payload?.error || 'ERROR';
      if (err==='NOT_FOUND') setStatus('La KEY no existe en DB. Emite en DB desde admin.html','err');
      else if (err==='EXPIRED') setStatus('La KEY está vencida. Solicita renovación.','err');
      else if (err==='EMAIL_MISMATCH') setStatus('El correo no coincide con el de emisión.','err');
      else setStatus('Error: '+err,'err');
      return;
    }

    setStatus('Acceso verificado. Entrando…','ok');
    saveSession(code,email,payload);
    location.href = '/premium.html';
  }

  function bindLogin(){
    const form = $('key-login-form'), key=$('key-input'), mail=$('email-input'), btn=$('login-btn');
    if (!key || !mail || !btn) return;
    async function go(e){
      e?.preventDefault?.();
      const code=(key.value||'').trim().toUpperCase();
      const email=(mail.value||'').trim().toLowerCase();
      if(!code||!email){ setStatus('Ingresa tu KEY y tu correo.','warn'); return; }
      btn.disabled = true; btn.textContent = 'Entrando…';
      try{ await loginFlow(code,email); } finally { btn.disabled=false; btn.textContent='Entrar'; }
    }
    btn.addEventListener('click', go);
    form.addEventListener('submit', go);

    // Autologin por query (?code=&email=)
    const qs=new URLSearchParams(location.search);
    if(qs.get('code')&&qs.get('email')){
      key.value  = (qs.get('code')||'').toUpperCase();
      mail.value = (qs.get('email')||'').toLowerCase();
      go(new Event('submit'));
    }
  }

  document.addEventListener('DOMContentLoaded', bindLogin);
  // Exponer para debug si hace falta
  window.IngresoULogin = { loginFlow };
})();
