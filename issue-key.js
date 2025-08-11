// /api/issue-key.js
// Issues (inserts) a new KEY into Supabase. Requires admin password.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function validateCode(code) {
  return /^(UTP|UP)-[A-Z0-9]{4}-\d{4}$/.test(code);
}

function computeExpiry(plan) {
  // Extract like "30d" from "Basic 30d — $14"
  const m = String(plan).match(/(\d+)d/i);
  const days = m ? parseInt(m[1], 10) : 60;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { admin_password, code, university, plan, issued_to_email, expires_at } = req.body || {};
    if (!admin_password || admin_password !== ADMIN_API_TOKEN) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    if (!code || !university || !plan) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    }

    const codeUP = String(code).trim().toUpperCase();
    if (!validateCode(codeUP)) return res.status(400).json({ ok: false, error: 'INVALID_FORMAT' });

    const exp = expires_at || computeExpiry(plan);

    const { error } = await supabase.from('keys').insert({
      code: codeUP,
      university,
      plan,
      status: 'issued',
      issued_to_email: issued_to_email || null,
      expires_at: exp
    });

    if (error) {
      if (error.code === '23505') { // duplicate
        return res.status(409).json({ ok: false, error: 'ALREADY_EXISTS' });
      }
      console.error(error);
      return res.status(500).json({ ok: false, error: 'DB_ERROR' });
    }

    return res.status(200).json({ ok: true, code: codeUP, expires_at: exp });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};