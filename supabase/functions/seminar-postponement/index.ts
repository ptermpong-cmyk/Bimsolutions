// Sends the Revit Basics postponement notice to existing registrants exactly once.
// Deploy: supabase functions deploy seminar-postponement --no-verify-jwt
// Required secrets: RESEND_API_KEY, BIMS_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Content-Type': 'application/json' };
const eventCode = 'revit-basics-2026-10-28';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  if (request.headers.get('x-bims-webhook-secret') !== Deno.env.get('BIMS_WEBHOOK_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: recipients, error } = await supabase
    .from('seminar_registrations')
    .select('id, full_name, email')
    .eq('event_code', eventCode)
    .is('postponement_sent_at', null)
    .limit(100);
  if (error) return new Response(JSON.stringify({ error: 'Could not load registrations' }), { status: 500, headers });

  let sent = 0;
  const failed: string[] = [];
  for (const recipient of recipients || []) {
    const mail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BiMSolutions <noreply@bimsolutions-th.com>',
        to: [recipient.email],
        subject: 'แจ้งเลื่อนกิจกรรม: เรียนรู้งาน Revit เบื้องต้น',
        html: `<main style="font-family:Arial,sans-serif;color:#10213b;line-height:1.6"><h1>แจ้งเลื่อนกิจกรรม</h1><p>สวัสดีคุณ ${escapeHtml(recipient.full_name)}</p><p>กิจกรรม <strong>เรียนรู้งาน Revit เบื้องต้น</strong> ซึ่งเดิมกำหนดจัดในวันที่ <strong>6 พฤศจิกายน 2569 เวลา 09.00–12.00 น.</strong> มีความจำเป็นต้องเลื่อนออกไปอย่างไม่มีกำหนด เนื่องจากทีมงานติดภารกิจเร่งด่วน</p><p>ขออภัยในความไม่สะดวก ทีมงานจะส่งอีเมลแจ้งกำหนดการใหม่ให้ทราบทันทีเมื่อพร้อม</p><p>ขอบคุณสำหรับความเข้าใจ<br>BiMSolutions</p></main>`
      })
    });
    if (!mail.ok) { failed.push(recipient.email); continue; }
    const { error: updateError } = await supabase.from('seminar_registrations')
      .update({ postponement_sent_at: new Date().toISOString(), attendance_status: 'cancelled' })
      .eq('id', recipient.id);
    if (updateError) { failed.push(recipient.email); continue; }
    sent++;
  }

  return new Response(JSON.stringify({ sent, failed, remainingBatchMayExist: (recipients || []).length === 100 }), { headers });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!));
}
