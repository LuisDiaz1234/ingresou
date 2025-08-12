// /api/cron-expire.js
// Marca como 'expired' todas las keys con expires_at < ahora.
// Protegido con header: Authorization: Bearer <CRON_SECRET>

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET; // <- lo crearás en Vercel

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

module.exports = async (req, res) => {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    // Autorización por header
    const auth = (req.headers['authorization'] || '').trim();
    console.log('[cron-expire] hasSecret=', !!CRON_SECRET, 'authLen=', auth.length, 'authStartsWithBearer=', auth.startsWith('Bearer '));

    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    const nowIso = new Date().toISOString();

    // Cambia a 'expired' solo si ya pasó la fecha y aún no estaba expired
    const upd = await supabase
      .from('keys')
      .update({ status: 'expired' })
      .lt('expires_at', nowIso)
      .neq('status', 'expired')
      .select('code, status'); // devuelve filas afectadas para contarlas

    if (upd.error) {
      console.error('cron-expire error', upd.error);
      return res.status(500).json({ ok: false, error: 'DB_ERROR' });
    }

    const count = (upd.data || []).length;
    return res.status(200).json({ ok: true, expired: count, at: nowIso });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
