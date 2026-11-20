# BISS Studio — מפת הפרויקט

## מתחילים כאן

- `reports/Pilates-TRX-Variation-2026-11-19.md` — סוגי פילאטיס/TRX, שינוי מנגנון ההחלפה, בדיקות חיות והגירת פלייליסטים.
- `reports/Arbox-Instructor-Workspace-2026-11-19.md` — שיבוץ צוות מארבוקס, קישור חשבונות, משימות לסדרה ועריכת אימון בנוי.

- `reports/UX-2026-11-19.md` — אזור אישי, ניהול החיבור, בדיקת מסך צר, ממצאים והמשך ליטוש. כניסה לצוות: https://biss-studio.vercel.app/my-sessions.

- `SUCCESSOR_START_HERE.txt` — דף קצר למי שמקבל אחריות ללא חפיפה.
- `CONTINUITY.md` — מצב הייצור, מה הושלם ומה עדיין דורש בדיקה.
- `docs/SUCCESSION_AND_ACCESS.md` — חשבונות, הרשאות ואופן העברת שליטה.
- `docs/RECOVERY_RUNBOOK.md` — הקמה מחדש ושחזור לאחר תקלה.
- `docs/DATA_BACKUP_RUNBOOK.md` — שכבות הגיבוי, תדירות ושחזור נתונים.
- `reports/QA-2026-11-10.md` — דוח האימות האחרון.

## תיקיות קוד ונתונים

- `app/` — מסכים ונתיבי שרת של Next.js.
- `data/` — נתוני בסיס מקומיים לתרגילים ולציוד.
- `lib/` — לוגיקה משותפת, הרשאות וחיבורי שירותים.
- `supabase/` — סכמות ומיגרציות מסד הנתונים לפי סדר מתועד.
- `test/` — בדיקות אוטומטיות.
- `backups/` — גיבויים מקומיים פרטיים; התיקייה כולה מוחרגת מ-GitHub.
- `backups/PRIVATE_SUCCESSOR_REGISTRY.md` — פרטי קשר וסטטוס הרשאות של היורש המורשה; פרטי הקובץ אינם מועלים ל-GitHub.
- `reports/` — דוחות בדיקה, UX, אבטחה ופריסה.

## עקרונות מחייבים

- GitHub `main` הוא מקור הקוד הקובע.
- Supabase של Studio הוא פרויקט מבודד; אין להשתמש בפרויקט הישן המשותף עם Vineyard.
- סודות נשמרים רק בכספת סיסמאות פרטית ובשירות שבו הם נדרשים.
- אין להכניס לפרויקט הזה קבצי BISS Vineyard, סודות שלו או נתונים שלו.

- `docs/APPROVED_ROADMAP.txt` — מפת הדרכים שאושרה ב־19.11.2026, לפירוק אופרטיבי ביום ראשון 22.11.2026.

- `reports/QA-2026-11-19.md` — בדיקות כניסה, דואר, אנשי קשר ובקשות בנייה, עם פירוט מה שנותר לאימות.

- `reports/Recruitment-Review-2026-11-19.md` — טיוטת גיוס לאישור, מועמדויות, ביטוח/הסמכות, בדיקות חיות ומגבלות החיבור לרשתות.
- `reports/recruitment-work/applied-schema.sql` — SQL שהוחל בפרויקט Studio בלבד; הגירת `studio_recruitment_documents_and_review`.

- `reports/Customer-Visits-2026-11-19.md` — customer visit pilot, DJ/workout/leisure flexibility, manager workflow, private ownership, farm shop configuration and remaining automatic Arbox work.
- `reports/visit-work/schema.sql` — full visit schema for fresh recovery; do not rerun blindly against the migrated project.
- `reports/visit-work/activity-migration.sql` — incremental activity selection migration already applied to Studio.
- `reports/visit-work/database-qa.sql` — rollback-only live database authorization, idempotency and overlap checks.

- `reports/Visit-Save-Fix-2026-11-19.md` — סיבת כפתור שמירה מושבת ללא לקוחות, הוספה באותו מסך ובדיקת שימור פרטי הביקור ושמירה חיה.
