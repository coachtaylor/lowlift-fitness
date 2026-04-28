// Supabase Edge Function: delete-account
//
// Apple requires any app with account creation to also provide in-app account
// deletion. Clients can't call `auth.admin.deleteUser` directly (it needs the
// service role key), so this function verifies the caller's JWT and performs
// the deletion on the server side.
//
// Deploy with:
//   supabase functions deploy delete-account
//
// The function picks up SUPABASE_URL, SUPABASE_ANON_KEY, and
// SUPABASE_SERVICE_ROLE_KEY from the Supabase Edge Functions runtime
// automatically — no extra env setup needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing auth header' }, 401);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    console.error('[delete-account] missing env');
    return json({ error: 'Server misconfigured' }, 500);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Invalid session' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error: deleteError } = await admin.auth.admin.deleteUser(
    userData.user.id,
  );
  if (deleteError) {
    console.error('[delete-account] admin.deleteUser failed:', deleteError);
    return json({ error: 'Failed to delete account' }, 500);
  }

  return json({ ok: true }, 200);
});
