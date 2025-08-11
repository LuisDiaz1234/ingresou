// /api/redeem-key.js
// Redeems a KEY: checks existence and status in Supabase, marks as redeemed.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function validateCode(code) {
  return /^(UTP|UP)-[A-Z0-9]{4}-\d{4}$/.test(code);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { code, email } = req.body || {};
    if (!code || !email) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });

    const codeUP = String(code).trim().toUpperCase();
    if (!validateCode(codeUP)) return res.status(400).json({ ok: false, error: 'INVALID_FORMAT' });

    // Fetch key
    const { data: row, error } = await supabase.from('keys').select('*').eq('code', codeUP).single();
    if (error && error.code === 'PGRST116') {
      // No rows found
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'DB_ERROR' });
    }

    // Check status and expiry
    const now = new Date();
    if (row.expires_at && new Date(row.expires_at) < now) {
      // mark expired just in case
      await supabase.from('keys').update({ status: 'expired' }).eq('code', codeUP);
      return res.status(403).json({ ok: false, error: 'EXPIRED' });
    }
    if (row.status !== 'issued') {
      return res.status(409).json({ ok: false, error: row.status === 'redeemed' ? 'ALREADY_REDEEMED' : 'NOT_REDEEMABLE', status: row.status });
    }

    const { error: upErr } = await supabase.from('keys').update({
      status: 'redeemed',
      redeemed_by_email: email,
      redeemed_at: new Date().toISOString(),
    }).eq('code', codeUP).eq('status', 'issued');

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ ok: false, error: 'UPDATE_FAILED' });
    }

    return res.status(200).json({ ok: true, plan: row.plan, university: row.university, expires_at: row.expires_at });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};