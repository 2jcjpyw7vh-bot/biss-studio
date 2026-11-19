# BISS Studio — Recruitment, documents and sharing — 19 November 2026

## Scope and entry points
Studio only: https://biss-studio.vercel.app . Repository: 2jcjpyw7vh-bot/biss-studio. Database: nqpxgxoxxafsrmvfrqnh. No changes to Vineyard, its connections, the old shared database, secrets, or global settings.

Manager: personal area → Arbox calendar → an unassigned future lesson → Find instructor / Prepare ad. Alternatively: Team and substitutions → Recruitment and substitutions. Drafts and applications remain in the database, not browser storage.

## Delivered behavior
- Prepare an immutable draft containing dates, lesson types, pay, travel by visit, address, qualifications, experience, notes and recurring-hours description. Select one, several or all active registered instructors; review destinations and image before explicitly opening the public link. Actual WhatsApp/Facebook sharing remains a separate manual action.
- Choose whether applicants must attach insurance and certification. Insurance declaration, qualification type and insurance expiry are required for new postings. PDF/JPEG/PNG files, combined limit 3 MB; uploaded advertisement image JPEG/PNG up to 1 MB.
- Private application documents are served only after manager authorization. Public responses omit files, original instructor identities and internal notes. Manager must explicitly review documents before assignment; the database also rejects missing/unreviewed/expired documents. Existing atomic session locking and retry behavior preserved.
- Arbox lesson is read again before preparing recruitment; assigned, cancelled, changed or past lessons cannot be opened through the unassigned action. Linked Arbox lessons are rechecked before publication and approval. Assignment is saved in Studio; manager still updates Arbox separately. No API writes to Arbox.
- Public links have branded Open Graph images. Recruitment can use a manager-uploaded image, and its image links to BISS Instagram within the public page. Instagram/Facebook links remain present. The recruitment URL is placed before Instagram in shared copy.
- Phone/email shown beside recipient names to distinguish multiple records. The user's wrong-number report was traced to an old phone on the selected English-named Sigal record, not a WhatsApp normalization error. Only that contact's phone was corrected to the user-provided mobile; no email, account identity or role changed. The existing real post's actual wa.me destination was verified as the intended mobile.
- SMTP sender was already configured as BISS Studio; user explicitly confirmed the sender issue no longer occurs. No SMTP password, account or sender configuration changed in this work.

## Verification completed
- 88 automated tests passed; 106 JavaScript files parsed.
- Live database transactional test: closed draft rejected; missing files rejected; unreviewed documents rejected; expired insurance rejected; reviewed valid documents assigned; repeated approval idempotent. Transaction rolled back.
- Live production UI: saved draft with uploaded BISS logo and five selected recipients; public draft blocked; manager opened the link; public form loaded with recurring terms and required files; insufficient insurance expiry rejected; valid form and both uploads accepted; assignment checkbox disabled before review; insurance download matched original bytes; manager review and final assignment saved.
- Public page inspected at 390 and 360 pixels. Initial grid overflow was corrected; final measurement found no elements outside viewport. Uploaded image loaded at native width 1048. Screenshot: Recruitment-Mobile-2026-11-19.jpg.
- Live Arbox: 13 lessons, two without an instructor. Existing linked unassigned lesson opened recruitment and preselected its existing Studio session/title. No ad created for that real lesson by the agent. Nested form width issue found and patched; final deployed retest recorded below.
- Brand image endpoint returned an actual 1200×630 image in browser. Open Graph supplied; actual rendering of previews on every WhatsApp/iOS version cannot be guaranteed from this test.

## Boundaries / remaining work
- No verified active social publishing or official WhatsApp bulk API connection was found in the two social-project chats inspected. No external publication or bulk delivery enabled. Selected recipients get individual WhatsApp links; email action opens the manager's email client. Opening a composer does not mean sent or delivered.
- Automatic daily Instagram image selection is not implemented. Use the approved manager-uploaded image or Studio brand image. Do not reconnect accounts or change global services without authorization.
- Registered contacts are not automatically deduplicated or merged. Several Sigal accounts exist intentionally or as historic trials; name, phone and email are shown so manager can choose. Reusable instructor document profile and automatic reminders are future work; submitted application files are immutable.
- Recurring hours are ad copy plus selected actual dates; approval assigns selected dates only, not an infinite recurring Arbox series.
- Legacy direct substitute-offer flow remains available; this new document policy applies to recruitment posts created through the reviewed flow. Old open recruitment posts retain their existing requirements.

## Recovery
PR57: 74b6eb2cdc410e09b6d7bbd40f54395ee5c6b6df. PR58: a8e2c104590d1f36e1b9aa92f89aef632e34af30. PR59: `5d42da4a13ecef5648c6045d9e4b9e0d30fe633c`; production deployment and final nested form retest recorded below.
Applied Studio migration: studio_recruitment_documents_and_review. Full applied SQL: reports/recruitment-work/applied-schema.sql. Reproducible rollback-only database test: reports/recruitment-work/database-qa.sql. Supabase CLI was unavailable, so the migration was applied through the connected migration tool; do not rerun blindly (constraint already exists).
Post-change advisors: no new finding; same intentional RLS/no-direct-policy informational notices for service-only tables and preexisting leaked-password-protection warning. No security settings changed.

Local source/debug scripts under reports/recruitment-work are supporting local work, not credentials. The backup excludes .env files, browser sessions and node_modules; it is a source/documentation backup, not a full live database export. Preserve the previous recovery instructions and private successor registry separately.

Live QA records (one synthetic group, session, posting and application) were deleted by their exact IDs and labels; verified remaining count 0. Real user-created recruitment posting and existing linked Arbox lesson were preserved.

## Final deployed verification
PR59 `5d42da4a13ecef5648c6045d9e4b9e0d30fe633c` reached Vercel production Ready. The exact nested Arbox recruitment screen reported by the user was retested at measured viewport widths 390 and 360 pixels; no integration-panel element extended outside either viewport. The real post now displays the recipient phone/email; its wa.me path was verified against the intended mobile. Screenshot: `reports/Recruitment-Arbox-Mobile-2026-11-19.jpg`.

PR60 `0a627b53e75e32085bd4d09cc3075da63698a53d` adds the user-confirmed default address `הזורעים 6 מושב היוגב` to new recruitment drafts in both entry points. Address remains editable; existing approved posts are not rewritten.

PR60 production Ready was verified, and its live Arbox form returned the exact default address. Final measurement on the active browser tab: viewport 360, 0 overflowing integration-panel elements, address `הזורעים 6 מושב היוגב`. Browser viewport overrides were reset and original exercise tab restored. No WhatsApp/email message or public social post was sent in these simulations. Local screenshots are included in the source backup, not uploaded to the repository.
