# Seminar confirmation email

This function sends the registration confirmation for the Revit Basics event once.

Before deployment:

1. Create a Resend account and verify `bimsolutions-th.com`.
2. Add the secrets `RESEND_API_KEY` and `BIMS_WEBHOOK_SECRET` in Supabase Edge Functions secrets.
3. Deploy the function with JWT verification disabled because it is called only by the database webhook, which supplies `x-bims-webhook-secret`.
4. In Supabase Database Webhooks, create an `INSERT` webhook for `public.seminar_registrations` targeting the function URL. Add the `x-bims-webhook-secret` header with the same secret value.
5. Run the SQL update in `../../supabase_admin_seminar_registrations.sql` to add `confirmation_sent_at`.

The message deliberately says that the Zoom link and time will follow. Update the message in `index.ts` when those details are final.
