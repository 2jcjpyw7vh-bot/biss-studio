# BISS Studio — Visit save feedback fix — 19 November 2026

User reported pressing Save visit after entering details produced no saved booking or explanation. Live Studio database had zero active `trainee` customer profiles. The previous button was disabled when customers.length was zero, without a nearby reason. Mandatory-field validation and server messages could also be missed because feedback was only after the entire visit list.

PR63 `83f487930fa97b9255b42b0ff70a0d6f50513ec9` changes only the visit manager UI:
- Explicit notice for an empty customer list.
- Add/select an active client in the same screen using the existing authorized Team route; keeps the already-entered booking fields intact.
- Newly created or already-active matching customer is selected for the booking. No account merges, role changes, invitations or messages are automatic.
- Save button is actionable and explains required fields instead of silently remaining disabled. Native validation and a human-readable message are shown; saving state and server errors appear near the save button.
- Successful persistence followed by refresh failure is identified as saved, with a refresh instruction, preventing unnecessary duplicate retries.

94 tests passed, 113 JavaScript files parsed; Vercel preview Ready. Live production verification recorded below. No schema, Arbox, Vineyard, secret, connection or permission change.

Production verified: Vercel Ready for PR63. Starting with zero active customer profiles, Save was enabled and showed the explicit required-customer message. Filled a synthetic DJ booking for 20 December 11:00–13:00 Israel time, then added a synthetic no-auth customer inline through the UI. The title, Arbox reference, dates/times and DJ kind were all preserved, and the new customer was selected. Saved the visit successfully, refreshed the list and reopened the page: the record remained. Database read confirmed the expected customer, title, kind and UTC timestamps. At 360px there were zero overflowing main-content elements; persisted-record screenshot captured at 390px: reports/Visit-Save-Fix-Mobile-2026-11-19.jpg (local backup only). No email, WhatsApp or purchase was sent/performed. Synthetic visit and no-auth customer removed by exact IDs; remaining count verified zero. Existing audit trace of test customer creation retained.

Backup: backups/BISS-Studio-Visit-Save-Fix-2026-11-19.zip and SHA256 companion. The already-open pre-fix form cannot acquire the new inline behavior without a reload; user should copy existing entered details before refreshing. After the update, adding a customer no longer requires leaving the booking form.
