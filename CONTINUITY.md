# BISS Studio — קובץ המשכיות

עודכן: 10 בנובמבר 2026

למי שמקבל אחריות ללא חפיפה: להתחיל ב-`SUCCESSOR_START_HERE.txt`, ואז לקרוא את `docs/SUCCESSION_AND_ACCESS.md` ואת `docs/RECOVERY_RUNBOOK.md`.

## סביבת הייצור

- גרסת הפרויקט: `2.9.0`.
- אתר: https://biss-studio.vercel.app
- GitHub: https://github.com/2jcjpyw7vh-bot/biss-studio, ענף `main`.
- Vercel: https://vercel.com/biss-studio/biss-studio
- Supabase Studio המבודד: `nqpxgxoxxafsrmvfrqnh`, Frankfurt (`eu-central-1`).
- קומיט פונקציונליות הבידוד: `a9d660264d5ed5698a01e559db5a410c83114ef1`.
- פריסה מאומתת לאחר מכן: `4e3a424c5bd06223b198b9374347c6b97f7f9ece`, הסתיימה בהצלחה.
- תיקיית עבודה מקומית במחשב הנוכחי: `C:\Users\segal\OneDrive\Documents\ChatGPT\BISS Studio – מערכת לבניית אימונים`.
- התיקייה נמצאת תחת OneDrive, אך בעת בדיקת הגיבוי לקוח OneDrive לא היה פעיל. לכן הגיבוי המקומי מאומת; סנכרון הענן של הקובץ דורש בדיקה ידנית ואינו מאומת.

הפרויקט הישן `onnecsibxkcdyhbzffgj` משותף עם BISS Vineyard ואינו משמש את Studio. אין לשנות בו טבלאות, חיבורים, הרשאות, סודות או הגדרות.

GitHub `main` הוא מקור הקוד הקובע. ה-Git המקומי ישן ומכיל שינויים, ולכן אין לבצע ממנו reset, force push או פריסה ללא השוואה.

## מפת קבצים

- `SUCCESSOR_START_HERE.txt` — הוראות התחלה קצרות.
- `docs/SUCCESSION_AND_ACCESS.md` — שירותים, כניסה, הרשאות וירושה.
- `docs/RECOVERY_RUNBOOK.md` — הקמה ושחזור מלאים.
- `docs/DATA_BACKUP_RUNBOOK.md` — מדיניות גיבוי ופרטיות.
- `docs/PROJECT_INDEX.md` — מפת התיקיות.
- `reports/QA-2026-11-10.md` — מה אומת ומה עדיין פתוח.
- `.env.example` — שמות משתני הסביבה ללא ערכים.
- `backups/` — חבילות וגיבויי נתונים פרטיים, מוחרגים מ-GitHub.

## מצב הגיבוי

- תמונת נתונים פרטית: `backups/studio-data-snapshot-2026-11-10.json`.
- התמונה כוללת 30 פריטי ציוד, 193 יחידות פעילות, 30 תרגילים, 12 פריטי שיתוף ומנהל אחד.
- היא אינה כוללת PIN/hash, סודות, Auth users/sessions, `auth_user_id` או נתוני Vineyard.
- היא כן כוללת שם ואימייל והערות שעשויות להיות רגישות; אין להעלות אותה ל-GitHub או לשתף ללא הצפנה.
- ZIP ההמשכיות הסופי והמעודכן: `backups/BISS-Studio-continuity-backup-2026-11-10-r2.zip`.
- חתימת התקינות והפירוט: `backups/BISS-Studio-continuity-backup-2026-11-10-r2.manifest.md`. יש להשוות SHA-256 לפני שימוש.
- קבצים בעלי שמות דומים ללא `-r2` הם גרסאות ביניים; יש להשתמש רק בקובץ `-r2`.
- הקובץ `BISS-Studio-backup-2026-11-10-0835.zip` חלקי ופגום ואסור לשימוש.

## מה קיים במערכת

- בניית אימוני סטודיו, Functional Training ו-Functional HIIT.
- התאמות לרמה, מלאי, מגבלות אישיות, הריון וכאב זמני בלי להגביל קבוצה שלמה.
- מלאי ציוד מתמשך בענן, משפחות ציוד וקיבולת תחנות.
- רצף קבוצות: אימונים מתוכננים, התאמות והעברת מידע בין מדריכות.
- ניהול צוות והרשאות: מנהל, מדריכה ומתאמנת.
- הצעת אימון למדריכה מחליפה בקישור אישי, כולל בחירה אם להציג אימון ופלייליסט.
- קישור ציבורי שאינו אמור להציג שמות מתאמנות או מידע רפואי.
- שמירת אימון כגרסה בתוך מפגש מתוכנן ויומן פעולות ניהולי.
- כניסה אישית במייל באמצעות Supabase Auth.
- אזור מדריכה, תוכניות אישיות מאושרות ואימון עצמאי עם מעקב בענן.
- איפוס PIN למנהל מזוהה; ה-PIN נשמר כ-hash מומלח ולא כטקסט גלוי.

## טבלאות Studio

- `equipment`, `exercises`, `shared_items`
- `biss_groups`, `biss_sessions`, `biss_adaptations`, `biss_handoffs`
- `biss_users`, `biss_substitute_offers`, `biss_audit_log`
- `biss_programs`, `biss_training_runs`, `biss_admin_settings`

טבלאות `biss_*` ו-`exercises` מוגנות ב-RLS ונגישות דרך נתיבי השרת עם מפתח סודי. `equipment` ו-`shared_items` פועלות גם הן דרך השרת. אין לחשוף מפתח service-role לדפדפן.

## משתני סביבה

שמות החובה ב-Vercel Production:

- `NEXT_PUBLIC_STUDIO_SUPABASE_URL`
- `NEXT_PUBLIC_STUDIO_SUPABASE_PUBLISHABLE_KEY`
- `STUDIO_SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`

`ADMIN_PIN` הוא fallback/אתחול ישן בלבד. שמות אופציונליים נמצאים ב-`.env.example`. הערכים עצמם נשמרים רק ב-Vercel/שירות המקורי ובכספת פרטית.

## מצב בדיקות

### אומת בפועל

- פריסת Vercel הסתיימה בהצלחה והאתר החי נפתח.
- מלאי חי: 30 פריטים ו-193 יחידות פעילות.
- במסד: 30 תרגילים, 12 פריטי שיתוף ומנהל Studio אחד.
- האתר הציג חיבור למסד Studio ושמירה בענן.
- 16 מתוך 16 בדיקות אוטומטיות עברו.
- הגדרות Auth מצביעות ל-`https://biss-studio.vercel.app` ול-`/login`.
- RLS וגישת שרת הוגדרו לטבלאות הרגישות.

### עדיין דורש בדיקה חיה

- Magic Link חדש שמגיע למייל וחוזר בפועל לאתר Studio המבודד.
- איפוס PIN מלא לאחר כניסת מנהל מזוהה.
- מסלול שליחת הצעת החלפה למדריכה רשומה וקבלה/דחייה.
- שימוש מלא באימון עצמאי בטלפון ובמסך הסטודיו.
- חיבור Arbox לאחר קבלת פרטי API V3 רשמיים.

## סדר שחזור הסכימה

1. `supabase/schema.sql`
2. `supabase/v2.8-auto-exercises.sql`
3. `supabase/studio-continuity.sql`
4. `supabase/studio-users-and-substitutes.sql`
5. `supabase/studio-audit-log.sql`
6. `supabase/studio-programs.sql`
7. `supabase/studio-session-workout-versions.sql`
8. `supabase/studio-admin-pin.sql`
9. `supabase/studio-exercises-security.sql`

`supabase/seed.sql` הוא נתון פתיחה ישן ואינו מחליף גיבוי חי.

## פעולות המשכיות שעדיין דורשות את הבעלים

כדי שיורש יוכל להמשיך ללא הליך שחזור חשבון ארוך, יש להזמין מראש מנהל גיבוי מורשה ל-GitHub, Vercel ו-Supabase של Studio בלבד, ולהגדיר לו גישת חירום בכספת הסיסמאות. זה לא בוצע כי לא נמסרו זהות וכתובת של יורש.

## כללי בטיחות

- אין לשמור סודות, PIN, קודי 2FA או מידע רפואי מזוהה ב-GitHub, צ'אט, צילום מסך או ZIP לא מוצפן.
- אין לשמור מידע רפואי ב-localStorage או בקישורי שיתוף.
- אין לבצע אוטומציית דפדפן ל-Arbox; רק API רשמי.
- לפני שינוי סכימה: לגבות, לבדוק RLS, להריץ בדיקות ולהשוות ספירות נתונים.
- אין לגעת ב-BISS Vineyard.

