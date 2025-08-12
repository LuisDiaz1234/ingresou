// /api/submit-score.js
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const ALLOWED = ["Álgebra Básica", "Razonamiento Lógico", "Comprensión Lectora"];

function isNum(x){ return typeof x==='number' && !isNaN(x); }
function validCode(c){ return /^(UTP|UP)-[A-Z0-9]{4}-\d{4}$/.test(String(c||'').trim().toUpperCase()); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const { code, email, module, score, total, ms } = req.body || {};
    if (!code || !email || !module || !isNum(score) || !isNum(total) || !isNum(ms)) {
      return res.status(400).json({ ok:false, error:'MISSING_FIELDS' });
    }
    const mod = String(module);
    if (!ALLOWED.includes(mod)) return res.status(400).json({ ok:false, error:'INVALID_MODULE' });
    const codeUP = String(code).trim().toUpperCase();
    if (!validCode(codeUP)) return res.status(400).json({ ok:false, error:'INVALID_CODE' });

    // validate key
    const { data: row, error } = await supabase.from('keys').select('*').eq('code', codeUP).single();
    if (error && error.code === 'PGRST116') return res.status(404).json({ ok:false, error:'KEY_NOT_FOUND' });
    if (error) { console.error(error); return res.status(500).json({ ok:false, error:'DB_ERROR' }); }

    // status, email, expiry
    if (row.redeemed_by_email && row.redeemed_by_email.toLowerCase() !== String(email).toLowerCase())
      return res.status(403).json({ ok:false, error:'EMAIL_MISMATCH' });
    if (row.status !== 'redeemed') return res.status(403).json({ ok:false, error:'NOT_REDEEMED' });
    if (row.expires_at && new Date(row.expires_at) < new Date()) return res.status(403).json({ ok:false, error:'EXPIRED' });

    const ins = await supabase.from('scores').insert({
      module: mod,
      score: Math.max(0, Math.floor(score)),
      total: Math.max(1, Math.floor(total)),
      ms: Math.max(0, Math.floor(ms)),
      user_email: String(email),
      code: codeUP,
    }).select('id').single();

    if (ins.error) { console.error(ins.error); return res.status(500).json({ ok:false, error:'INSERT_FAILED' }); }

    // return top 10 for module
    const top = await supabase.from('scores')
      .select('score,total,ms,created_at')
      .eq('module', mod)
      .order('score', { ascending: false })
      .order('ms', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10);

    return res.status(200).json({ ok:true, top: top.data || [] });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:'SERVER_ERROR' });
  }
};
