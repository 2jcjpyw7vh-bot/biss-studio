# BISS Studio — Flexible customer visits — 19 November 2026

## Purpose and scope
A customer area for a booked Studio visit, not only an exercise program. Supports self-service workout, independent DJ practice, leisure and mixed visits. Studio repository/project/database only. Vineyard and all other projects, permissions, credentials and global connections were untouched.

## Entry points
- Managers: personal area → Visits and experiences, or https://biss-studio.vercel.app/visits . Create an active customer through Team and permissions if needed; customer role uses the existing internal `trainee` role and is labelled client in the UI.
- Customer: https://biss-studio.vercel.app/my-visits . This is now the default personal area for customer accounts. Existing workout programs remain at /my-program and keep their existing trainer approval/equipment checks.
- Manager preview: generated from a customer's visit card; read-only, and cannot save customer preferences. Managers and instructors retain their own personal area.

## Implemented
- Booked title, activity kind, start/end, party size, exact inclusions/quantities, address, equipment and arrival instructions. Durations support 15 minutes to 12 hours, including 2-hour mixed and 3-hour DJ sessions. No fixed package wine quantities invented.
- Manager manually verifies booking, payment and Studio availability in Arbox before admitting a pilot visit. An Arbox reference and explicit attestation are required. Reference uniqueness, manager role and overlap among imported visits enforced in a transaction. Cancelled slots are released; cancellation in Studio does not refund or cancel Arbox.
- Customer sees upcoming/current/past/cancelled visits and saves preferences in the database: music, preparation notes, requested equipment for DJ, desired workout time/body areas when applicable. Purchased terms are not writable by customers; optimistic revision checks reject concurrent stale writes and cancellation/expiry blocks preparation updates.
- Instructor accounts cannot read customer visits. Customer preview parameters cannot change the customer's owner filter. New table has RLS enabled with no direct anonymous/authenticated access. Only server routes with verified identity can access it. Admin settings query only the dedicated farm-shop key, never PIN records.
- Personal login links support a specific visit, sent by a manager via existing branded email flow or manually in WhatsApp. Visit ownership, role, status and recipient identity are checked. Existing instructor task invitations remain supported. No automatic delivery is claimed.
- Prominent farm-shop card for all visit types, visually separate from purchased inclusions. Extra products/seasonal flower picking are bought separately through Arbox. Manager can save the public customer shop link in Visits management. Public HTTPS Arbox URL required; management links and credentials rejected. Actual BISS customer shop URL still required from user. Until then the card explicitly says link being prepared; no fake checkout or inventory.

## Data and recovery
Studio project `nqpxgxoxxafsrmvfrqnh`, migration `studio_flexible_customer_visits`.
Schema: reports/visit-work/schema.sql. Rollback-only DB QA: reports/visit-work/database-qa.sql. New table biss_visits and RPC studio_create_visit(jsonb,uuid). Shop setting key farm_shop_url in existing private biss_admin_settings table; no other setting changed.
PR61 production code commit: 7c554d728dff07cef3e02ccacd4a30baa42a4d3c.

## Verified so far
94 automated tests pass, 113 JavaScript files parse. Live DB transaction verified manager-only creation, idempotent retries, duplicate Arbox references, overlap rejection, slot release after cancellation and private table/RPC grants; fixtures rolled back. Security advisors: existing warnings unchanged; one expected additional RLS-without-policy informational entry for the service-only visit table.

## Deliberate boundaries
This is a manual pilot foundation. Automatic Arbox paid-order ingestion, cancellation/refund synchronization, service/product mapping, automatic account creation after purchase, automated WhatsApp delivery, door access and product redemption are not enabled. Existing official API integration verifies schedule/staff only; no guessed undocumented endpoints or browser automation of the Arbox management system was used.
Overlap protection covers visits admitted into Studio; it does not automatically compare every ordinary Arbox group lesson. Manager must verify actual availability in Arbox. DJ equipment quantities/availability are not automatically reserved. Fitness preferences do not generate or authorize a new workout; approved-program player remains the functional path. No new exercise safety approvals granted. A guest's purchase does not grant machine eligibility to other guests.
A real customer's device/login, purchase, exercise/DJ setup, screen mirroring and farm checkout still require an operational pilot after product setup and shop link are supplied.

## Live production checks and activity refinement
- Saved a clearly synthetic 3-hour DJ visit through the manager UI; confirmed 11:00–14:00 Israel time, two visitors and exact demo inclusions in the customer preview.
- Attempted a second visit overlapping that slot through the live UI. Server rejected it with the overlap message, and no booking was created.
- Saved a non-overlapping 2-hour mixed visit. Identified that 'mixed' must not imply both fitness and DJ; added explicit booked activity selection (workout/leisure, DJ/leisure or both), with migration studio_visit_activity_selection. Full updated schema and incremental activity-migration.sql are preserved.
- Customer/manager UI at measured 390 pixels had no elements outside the viewport. Manager preview correctly disabled preparation editing. Added a summary of upcoming booking times before the farm shop, so shopping does not hide the main visit information.
- Shop URL was not found in workspace sources or publicly accessible verified pages. User confirmed shop is in Arbox; exact public customer store URL is still pending. No guessed shop URL, fake stock or live checkout was enabled.
- Live customer authentication, preparation save from an actual customer device and actual message delivery have NOT been validated in this slice; only manager flow, read-only preview, library tests and live database authorization/overlap tests are established. Do not report a completed paid-customer end-to-end pilot yet.

## Final verification and cleanup
PR61 `7c554d728dff07cef3e02ccacd4a30baa42a4d3c` and PR62 `db4d5cccaf243512e2ddad2f94351360b73310e3` were deployed. Vercel's production UI showed Ready / Current for PR62 with matching source commit; live production verified the explicit activity selector and upcoming-visit summary. GitHub's combined-status connector lagged behind Vercel in this check; production UI and actual rendered behavior were used as deployment evidence.
- New mixed DJ+leisure booking saved through the real manager form with activities `["dj","leisure"]` and duration 180 minutes. Its preview had DJ preparation, no fitness tools, and a disabled manager preview save button. Earlier mixed workout+leisure preview had fitness-only preparation, preserving compatibility for older visit rows with null activity selection.
- Final measured viewport 360 pixels: zero overflowing main-content elements. The earlier 390-pixel check also had zero overflow. Screenshot (local): reports/Customer-Visits-Mobile-2026-11-19.jpg. Viewport overrides reset; agent test tab closed.
- Direct navigation to the private API without a bearer session returned 'נדרשת כניסה', even in a browser where a manager was logged in through the app.
- All three synthetic visits and their synthetic no-auth client were removed by exact IDs/references; remaining count verified zero. No actual purchase, payment, refund, Arbox booking mutation, email or WhatsApp message was performed in these simulations.
- Final suite: 94 passed; 113 JavaScript files parsed. Source backup: backups/BISS-Studio-Customer-Visits-2026-11-19.zip, companion SHA256. This is source/docs/screenshots/schema, not a full live database export or credential backup.

Open operational items: public BISS Arbox shop URL, real product mapping/purchase event verification and a real customer-device pilot. Manager UI currently creates/cancels visits; editing/rescheduling an existing admitted visit is not yet implemented. Do not promise automatic rescheduling, cancellation/refund synchronization, stock reservation or checkout redemption.
