// /api/leaderboard.js (update ALLOWED to include exams)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const ALLOWED = ["Álgebra Básica", "Razonamiento Lógico", "Comprensión Lectora", "Examen UTP", "Examen UP"];

function maskEmail(e) {
  try {
    const [u, d] = String(e).split('@');
    if (!u || !d) return 'usuario';
    const uMask = u[0] + '*'.repeat(Math.max(1,u.length-2)) + u.slice(-1);
    const dom = d.split('.')[0];
    return uMask + '@' + dom[0] + '*'.repeat(Math.max(1,dom.length-1)) + '.com';
  } catch { return 'usuario'; }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const module = req.query && req.query.module;
    const limit = Math.min(100, Math.max(1, parseInt((req.query && req.query.limit) || '50', 10)));
    if (!module || !ALLOWED.includes(String(module))) return res.status(400).json({ ok:false, error:'INVALID_MODULE' });
    const { data, error } = await supabase.from('scores')
      .select('score,total,ms,user_email,created_at')
      .eq('module', String(module))
      .order('score', { ascending: false })
      .order('ms', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return res.status(500).json({ ok:false, error:'DB_ERROR' });
    const mapped = (data||[]).map(r=>({ score:r.score,total:r.total,ms:r.ms,at:r.created_at,email: maskEmail(r.user_email) }));
    return res.status(200).json({ ok:true, top: mapped });
  } catch (e) { console.error(e); return res.status(500).json({ ok:false, error:'SERVER_ERROR' }); }
};
