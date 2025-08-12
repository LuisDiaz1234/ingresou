// /api/send-activation.js
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'IngresoU <no-reply@ingresou.app>';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const { email, code, university, plan, expires_at } = req.body || {};
    if (!email || !code) return res.status(400).json({ ok:false, error:'MISSING_FIELDS' });
    if (!RESEND_API_KEY) return res.status(200).json({ ok:true, skipped:true }); // soft no-op
    const exp = expires_at ? new Date(expires_at).toLocaleString() : '—';
    const body = `
      <div style="font-family:Arial,sans-serif">
        <h2>¡Bienvenido a IngresoU!</h2>
        <p>Tu acceso fue activado correctamente.</p>
        <ul>
          <li><b>KEY:</b> ${code}</li>
          <li><b>Universidad:</b> ${university || '—'}</li>
          <li><b>Plan:</b> ${plan || '—'}</li>
          <li><b>Vence:</b> ${exp}</li>
        </ul>
        <p>Puedes entrar cuando quieras desde Mi cuenta.</p>
      </div>
    `;
    await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers: { 'Authorization': 'Bearer '+RESEND_API_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM, to: [email], subject: 'IngresoU — Plan activado', html: body
      })
    });
    return res.status(200).json({ ok:true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:'SERVER_ERROR' });
  }
};
