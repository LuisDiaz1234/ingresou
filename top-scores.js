// /api/top-scores.js (update ALLOWED to include exams)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const ALLOWED = ["Álgebra Básica", "Razonamiento Lógico", "Comprensión Lectora", "Examen UTP", "Examen UP"];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const module = req.query && req.query.module;
    const limit = Math.min(100, Math.max(1, parseInt((req.query && req.query.limit) || '10', 10)));
    if (!module || !ALLOWED.includes(String(module))) return res.status(400).json({ ok:false, error:'INVALID_MODULE' });
    const { data, error } = await supabase.from('scores')
      .select('score,total,ms,created_at')
      .eq('module', String(module))
      .order('score', { ascending: false })
      .order('ms', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return res.status(500).json({ ok:false, error:'DB_ERROR' });
    return res.status(200).json({ ok:true, top: data || [] });
  } catch (e) { console.error(e); return res.status(500).json({ ok:false, error:'SERVER_ERROR' }); }
};
