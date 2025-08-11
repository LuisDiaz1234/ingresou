// /api/get-subscription.js
// Returns subscription info if code is redeemed by the given email and not expired.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function validCode(c){ return /^(UTP|UP)-[A-Z0-9]{4}-\d{4}$/.test(String(c||'').trim().toUpperCase()); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  }
  try {
    const { code, email } = req.body || {};
    if (!code || !email) return res.status(400).json({ ok:false, error:'MISSING_FIELDS' });
    const codeUP = String(code).trim().toUpperCase();
    if (!validCode(codeUP)) return res.status(400).json({ ok:false, error:'INVALID_FORMAT' });

    const { data: row, error } = await supabase.from('keys').select('*').eq('code', codeUP).single();
    if (error && error.code === 'PGRST116') return res.status(404).json({ ok:false, error:'NOT_FOUND' });
    if (error) { console.error(error); return res.status(500).json({ ok:false, error:'DB_ERROR' }); }

    const now = new Date();
    if (row.expires_at && new Date(row.expires_at) < now) {
      await supabase.from('keys').update({ status: 'expired' }).eq('code', codeUP);
      return res.status(403).json({ ok:false, error:'EXPIRED' });
    }
    if (row.status !== 'redeemed') return res.status(409).json({ ok:false, error:'NOT_REDEEMED', status: row.status });
    if (row.redeemed_by_email && row.redeemed_by_email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ ok:false, error:'EMAIL_MISMATCH' });
    }

    return res.status(200).json({
      ok:true,
      code: row.code,
      university: row.university,
      plan: row.plan,
      redeemed_by_email: row.redeemed_by_email,
      redeemed_at: row.redeemed_at,
      expires_at: row.expires_at
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:'SERVER_ERROR' });
  }
};