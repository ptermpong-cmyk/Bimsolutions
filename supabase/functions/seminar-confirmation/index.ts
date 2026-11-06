// Supabase Edge Function: sends one confirmation email per seminar registration.
// Deploy with: supabase functions deploy seminar-confirmation --no-verify-jwt
// Required secrets: RESEND_API_KEY, BIMS_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Content-Type': 'application/json' };

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  if (request.headers.get('x-bims-webhook-secret') !== Deno.env.get('BIMS_WEBHOOK_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const payload = await request.json();
  const registration = payload.record || payload;
  if (registration?.event_code !== 'revit-basics-2026-10-28' || !registration?.email || !registration?.id) {
    return new Response(JSON.stringify({ error: 'Unsupported registration' }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: current, error: readError } = await supabase
    .from('seminar_registrations').select('id, full_name, email, confirmation_sent_at')
    .eq('id', registration.id).maybeSingle();
  if (readError || !current) return new Response(JSON.stringify({ error: 'Registration not found' }), { status: 404, headers: corsHeaders });
  if (current.confirmation_sent_at) return new Response(JSON.stringify({ ok: true, message: 'Already sent' }), { headers: corsHeaders });

  // The event is postponed and registration is closed. Do not send the old
  // confirmation containing the superseded date or Zoom-link promise.
  return new Response(JSON.stringify({ ok: true, message: 'Event postponed; confirmation not sent' }), { headers: corsHeaders });
});
