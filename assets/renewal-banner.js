/* ========= IngresoU — Banner de Renovación (opcional) ========= */
(function () {
  const PHONE = '50762796078';
  const THRESHOLD_DAYS = 10;
  function fmt(s){ const d=new Date(s); if(isNaN(d)) return ''; return d.toLocaleDateString('es-PA',{day:'2-digit',month:'2-digit',year:'numeric'}); }
  function left(s){ const d=new Date(s); return Math.ceil((d - new Date())/(1000*60*60*24)); }
  function ls(k){ try{return localStorage.getItem(k)||'';}catch{return '';} }
  function mount(){ return document.querySelector('#account')?.parentElement || document.body; }
  function render(expires_at, uni, plan){
    const d=left(expires_at); if(isNaN(d) || d>THRESHOLD_DAYS) return;
    const expired = d<=0;
    const wrap=document.createElement('div');
    wrap.style='margin-top:16px;border-radius:12px;padding:16px;border:1px solid #FDE68A;background:#FFFBEB';
    wrap.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">${expired?'Tu plan expiró':'Tu plan está por vencer'} — ${fmt(expires_at)}</div>
      <div style="color:#374151;font-size:14px;">Renueva ahora para no perder acceso.</div>`;
    mount().appendChild(wrap);
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    const exp = ls('ingresou_expires_at'); if(!exp) return;
    render(exp, ls('ingresou_university')||'', ls('ingresou_plan')||'');
  });
})();
