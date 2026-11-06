# Seminar postponement email

1. Run `supabase_seminar_postponement.sql` in the Supabase SQL Editor.
2. Deploy with `supabase functions deploy seminar-postponement --no-verify-jwt`.
3. Invoke the function with a `POST` request and the `x-bims-webhook-secret` header.
4. If the response has `remainingBatchMayExist: true`, invoke it again. Each run processes up to 100 unsent recipients.

The function sends the postponement notice only to existing Revit Basics registrants whose `postponement_sent_at` is empty, then records the send time and changes their attendance status to `cancelled`.
