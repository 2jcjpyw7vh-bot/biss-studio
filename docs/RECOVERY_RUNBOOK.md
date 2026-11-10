# BISS Studio — נוהל שחזור והקמה מחדש

עודכן: 10 בנובמבר 2026

הנוהל מיועד לתקלה משמעותית, אובדן מחשב או הקמה בחשבון חדש לאחר קבלת הרשאה חוקית. אין לבצע את הפעולות על BISS Vineyard.

## 1. עצירה ובדיקת זהות הפרויקט

לפני כל שינוי יש לוודא:

- המאגר הוא `2jcjpyw7vh-bot/biss-studio`.
- אתר הייצור הוא `https://biss-studio.vercel.app`.
- פרויקט Supabase הוא `nqpxgxoxxafsrmvfrqnh`.
- הפרויקט `onnecsibxkcdyhbzffgj` אסור לשימוש עבור Studio.

אם אחד מהפרטים אינו תואם, עוצרים ולא משנים חיבורים.

## 2. בחירת מקור שחזור

סדר העדיפות:

1. GitHub `main` — מקור הקוד הקובע.
2. ZIP ההמשכיות החדש ביותר בתיקיית `backups/`, רק לאחר התאמת SHA-256 ל-manifest.
3. גיבוי נתונים נפרד מתיקיית `backups/` או גיבוי מסד רשמי.

אין להשתמש בקובץ `BISS-Studio-backup-2026-11-10-0835.zip`; הוא חלקי ופגום. ה-Git המקומי במחשב נמצא מאחור ביחס ל-GitHub ומכיל שינויים, ולכן אין לפרוס ממנו בלי השוואה.

## 3. הקמת הקוד

בסביבה חדשה:

```text
git clone https://github.com/2jcjpyw7vh-bot/biss-studio.git
cd biss-studio
git switch main
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

סביבה שנבדקה: Node.js `24.22.1`, pnpm `11.25.0`.

## 4. הקמת מסד Studio חדש

ב-Supabase SQL Editor מריצים, לפי הסדר המדויק:

1. `supabase/schema.sql`
2. `supabase/v2.8-auto-exercises.sql`
3. `supabase/studio-continuity.sql`
4. `supabase/studio-users-and-substitutes.sql`
5. `supabase/studio-audit-log.sql`
6. `supabase/studio-programs.sql`
7. `supabase/studio-session-workout-versions.sql`
8. `supabase/studio-admin-pin.sql`
9. `supabase/studio-exercises-security.sql`

`supabase/seed.sql` כולל נתוני פתיחה ישנים בלבד ואינו גיבוי של המלאי החי. אין להשתמש בו במקום תמונת נתונים עדכנית.

הטבלאות הצפויות:

- `equipment`, `exercises`, `shared_items`
- `biss_groups`, `biss_sessions`, `biss_adaptations`, `biss_handoffs`
- `biss_users`, `biss_substitute_offers`, `biss_audit_log`
- `biss_programs`, `biss_training_runs`, `biss_admin_settings`

יש לוודא ש-RLS פעיל ושאין policy ציבורית שמאפשרת גישה לנתוני צוות, התאמות או תוכניות.

## 5. שחזור נתונים

תמונת הנתונים המקומית מ-10 בנובמבר 2026 נמצאת ב-`backups/studio-data-snapshot-2026-11-10.json`. היא פרטית וכוללת מידע אישי; אין להעלות אותה ל-GitHub.

הסדר הלוגי לשחזור:

1. `equipment`, `exercises`, `shared_items`
2. `biss_users` — ללא `auth_user_id`
3. `biss_groups`, ואז `biss_sessions`
4. `biss_adaptations`, `biss_handoffs`
5. `biss_programs`, ואז `biss_training_runs`
6. `biss_substitute_offers`
7. `biss_audit_log`

תמונת JSON היא עותק חירום קריא, לא dump מלא של Supabase Auth. לשחזור גדול יש להעדיף dump רשמי של PostgreSQL כאשר קיים, או לבצע יבוא מבוקר בעזרת איש טכני ולהשוות ספירות לפני פריסה.

אין לשחזר את `biss_admin_settings` מגיבוי רגיל ואין להעתיק PIN/hash. יש להגדיר PIN חדש דרך מנהל מזוהה לאחר שהכניסה במייל עובדת.

## 6. Auth והגדרות כתובת

ב-Supabase Authentication / URL Configuration:

- Site URL: `https://biss-studio.vercel.app`
- Redirect URL: `https://biss-studio.vercel.app/login`

משתמשי Auth וסשנים אינם חלק מתמונת ה-JSON. יש להזמין מחדש משתמשים מורשים ולחברם לרשומות `biss_users` בצורה מבוקרת.

## 7. חיבור Vercel

יוצרים או בוחרים רק את פרויקט `biss-studio`, מחברים למאגר ולענף `main`, ומגדירים את השמות הבאים ב-Production:

- `NEXT_PUBLIC_STUDIO_SUPABASE_URL`
- `NEXT_PUBLIC_STUDIO_SUPABASE_PUBLISHABLE_KEY`
- `STUDIO_SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL=https://biss-studio.vercel.app`

רשימת האינטגרציות האופציונליות נמצאת ב-`.env.example`. ערכים סודיים מתקבלים מהשירות המקורי או מהכספת הפרטית; לעולם לא מ-Vineyard, מ-GitHub או מגיבוי ציבורי.

## 8. בדיקות לפני פתיחה למשתמשים

1. `pnpm test` מסתיים ללא כישלון.
2. פריסת Vercel מסומנת Success.
3. דף הבית נטען ומציג חיבור למסד Studio.
4. במלאי נראים 30 פריטים ו-193 יחידות פעילות, כל עוד לא בוצעו שינויים עסקיים מאז הגיבוי.
5. שינוי מלאי נשמר, רענון ודפדפן חדש מציגים אותו, ואז מחזירים את הערך המקורי.
6. קישור כניסה חדש מגיע למייל ומחזיר ל-`/login` באתר Studio, לא ל-Vineyard.
7. מנהל מזוהה יכול להגדיר PIN חדש; PIN שגוי נחסם.
8. קישור מחליפה אינו מציג שמות או מידע רפואי.
9. אימון עצמאי נפתח רק למתאמן עם תוכנית מאושרת והרשאת ציוד מתאימה.

## 9. כתובות שימוש מרכזיות

- `/` — המערכת הראשית
- `/?tab=equipment` — מלאי
- `/?tab=continuity` — קבוצות ורצף אימונים
- `/?tab=team` — צוות, הרשאות והחלפות
- `/?tab=program` — תוכניות אישיות
- `/?tab=integrations` — Arbox
- `/login` — כניסה ואיפוס PIN
- `/my-sessions` — מדריכה
- `/my-program` — מתאמנת

## 10. החזרה לאחור

אם הפריסה החדשה נכשלת, מחזירים ב-Vercel לפריסה האחרונה שסומנה Success. אין לשנות את מסד Vineyard ואין למחוק את מסד Studio. מתעדים את התקלה, זמן הפעולה והגרסה ב-`CONTINUITY.md` לפני ניסיון נוסף.

