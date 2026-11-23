// ==============================================================================
// SUPABASE AUTOMATED KEEP-ALIVE SERVERLESS ENDPOINT
// Pings Supabase REST API to prevent Free Tier project pausing after 7 days of inactivity.
// Can be invoked by Vercel Cron, GitHub Actions, or any scheduled ping service.
// ==============================================================================

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead(204);
    return res.end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sekujdfctxvuomoccugy.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_a0pqoY9UHrl4cgfOvMA25w_qIrUMxgB';

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const pingUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/`;
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'User-Agent': 'AK-Studio-Supabase-KeepAlive/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;

    if (response.ok) {
      return sendJson(res, 200, {
        status: 'active',
        message: 'Supabase project is active and awake. Inactivity timer reset successfully.',
        supabaseStatus: response.status,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    return sendJson(res, response.status, {
      status: 'warning',
      message: `Supabase responded with HTTP ${response.status}`,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const isDnsError = error.code === 'ENOTFOUND' || (error.cause && error.cause.code === 'ENOTFOUND');

    return sendJson(res, 503, {
      status: isDnsError ? 'paused' : 'error',
      message: isDnsError
        ? 'Supabase project appears PAUSED by Supabase due to free-tier inactivity. Please log in to https://supabase.com/dashboard to restore your project. Once unpaused, this cron job will keep it active.'
        : `Keep-alive ping notice: ${error.message}`,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  }
};
