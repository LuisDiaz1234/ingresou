
/* ========= IngresoU — Banner de Renovación ========= */
(function () {
  const PHONE = '50762796078';   // Tu WhatsApp
  const THRESHOLD_DAYS = 10;     // Mostrar cuando falten <= 10 días
  const WA_BASE = `https://wa.me/${PHONE}`;

  function fmt(dateStr){
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-PA', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function daysLeft(dateStr){
    const now = new Date(); const d = new Date(dateStr);
    return Math.ceil((d - now) / (1000*60*60*24));
  }
  function getLS(k){ try{return localStorage.getItem(k)||'';}catch{return '';} }

  // Busca contenedor cómodo
  function mountPoint(){
    const byText = Array.from(document.querySelectorAll('h1,h2,h3,div,section'))
      .find(el => /mi cuenta|tu suscripci[oó]n/i.test(el.textContent||''));
    if (byText && byText.parentElement) return byText.parentElement;
    return document.querySelector('main') || document.body;
  }

  function render({ university, plan, expires_at }){
    if (!expires_at) return;
    const d = daysLeft(expires_at);
    if (isNaN(d) || d > THRESHOLD_DAYS) return;

    const expired = d <= 0;
    const colorBox = expired ? 'background:#FEF2F2;border:1px solid #FECACA;' : 'background:#FFFBEB;border:1px solid #FDE68A;';
    const title = expired
      ? `Tu plan expiró el ${fmt(expires_at)} (hace ${Math.abs(d)} día${Math.abs(d)===1?'':'s'}).`
      : `Tu plan vence el ${fmt(expires_at)} (en ${d} día${d===1?'':'s'}).`;

    const msg = encodeURIComponent(
      `Hola! Quiero ${expired ? 'renovar' : 'renovar antes del vencimiento'} mi plan IngresoU.` +
      `\nUniversidad: ${university || 'UTP/UP'}` +
      `\nPlan: ${plan || 'Pro 60d — $29'}` +
      `\nKEY: ${getLS('ingresou_key') || '-'}` +
      `\nEmail: ${getLS('ingresou_email') || '-'}` +
      `\nVence: ${fmt(expires_at)}`
    );
    const waLink = `${WA_BASE}?text=${msg}`;

    const wrap = document.createElement('div');
    wrap.style = `margin-top:16px;border-radius:12px;padding:16px;${colorBox}`;
    wrap.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">${title}</div>
      <div style="color:#374151;font-size:14px;">Renueva ahora para no perder acceso a simuladores y exámenes.</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <a href="${waLink}" target="_blank" style="background:#16a34a;color:#fff;padding:8px 12px;border-radius:8px;font-size:14px;text-decoration:none;">Renovar por WhatsApp</a>
        <button id="copy-renew" style="padding:8px 12px;border-radius:8px;border:1px solid #D1D5DB;background:#fff;font-size:14px;">Copiar datos</button>
      </div>
      <div style="margin-top:6px;color:#6B7280;font-size:12px;">Tel: +507 ${PHONE}</div>
    `;
    mountPoint().appendChild(wrap);
    wrap.querySelector('#copy-renew')?.addEventListener('click', () => {
      const text = `Renovación IngresoU
Universidad: ${university || ''}
Plan: ${plan || ''}
KEY: ${getLS('ingresou_key') || ''}
Email: ${getLS('ingresou_email') || ''}
Vence: ${fmt(expires_at)} (${expired ? 'expirado' : d + ' días restantes'})`;
      navigator.clipboard.writeText(text);
    });
  }

  async function init(){
    const code  = getLS('ingresou_key');
    const email = getLS('ingresou_email');
    let sub = null;
    if (code && email){
      try {
        const r = await fetch('/api/get-subscription', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ code, email })
        });
        const data = await r.json();
        sub = data?.subscription || data || null;
      } catch {}
    }
    const university = sub?.university || getLS('ingresou_university') || '';
    const plan       = sub?.plan       || getLS('ingresou_plan')       || '';
    const expires_at = sub?.expires_at || getLS('ingresou_expires_at') || '';

    if (expires_at) render({ university, plan, expires_at });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
