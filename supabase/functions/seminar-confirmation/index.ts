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

  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'BiMSolutions <noreply@bimsolutions-th.com>',
      to: [current.email],
      subject: 'ยืนยันการลงทะเบียน: เรียนรู้งาน Revit เบื้องต้น',
      html: `<main style="font-family:Arial,sans-serif;color:#10213b;line-height:1.6"><h1>ลงทะเบียนสำเร็จ</h1><p>สวัสดีคุณ ${escapeHtml(current.full_name)}</p><p>คุณลงทะเบียนกิจกรรม <strong>เรียนรู้งาน Revit เบื้องต้น</strong> วันที่ <strong>28 ตุลาคม 2569</strong> เรียบร้อยแล้ว</p><p>ทีมงานจะส่งเวลาเรียนและลิงก์ Zoom ให้ทางอีเมลนี้ก่อนเริ่มกิจกรรม</p><p>ขอบคุณ<br>BiMSolutions</p></main>`
    })
  });
  if (!mail.ok) return new Response(JSON.stringify({ error: 'Email provider rejected request' }), { status: 502, headers: corsHeaders });

  await supabase.from('seminar_registrations').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', current.id);
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!));
}
