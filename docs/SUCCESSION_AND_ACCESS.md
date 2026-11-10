# BISS Studio — המשכיות, ירושה וגישה לחשבונות

עודכן: 10 בנובמבר 2026

מטרת המסמך היא לאפשר לאדם מורשה להמשיך להפעיל את BISS Studio גם ללא חפיפה עם הבעלים. המסמך אינו מכיל סיסמאות, PIN, מפתחות API או קודי אימות.

## מפת השירותים

| רכיב | כתובת או מזהה | מה נמצא שם |
|---|---|---|
| האתר החי | https://biss-studio.vercel.app | המערכת שהמשתמשים פותחים |
| GitHub | https://github.com/2jcjpyw7vh-bot/biss-studio | קוד ותיעוד; ענף הייצור הוא `main` |
| Vercel | https://vercel.com/biss-studio/biss-studio | פריסות, לוגים ומשתני סביבה |
| Supabase Studio | https://supabase.com/dashboard/project/nqpxgxoxxafsrmvfrqnh | מסד נתונים, Auth והגדרות Studio |
| מחשב/OneDrive | `C:\Users\segal\OneDrive\Documents\ChatGPT\BISS Studio – מערכת לבניית אימונים` | עותק עבודה וגיבויים פרטיים |

## אזהרה מוחלטת לגבי Vineyard

פרויקט Supabase הישן `onnecsibxkcdyhbzffgj` משותף עם BISS Vineyard. אין לפתוח בו טבלאות לצורך Studio, אין לשנות בו מפתחות, אין לחבר אליו פריסה ואין למחוק ממנו דבר. פרויקט Studio היחיד הוא `nqpxgxoxxafsrmvfrqnh`.

## מה צריך להכין מראש ליורש מורשה

הבעלים צריך להשלים מחוץ למאגר הקוד:

1. להזמין לפחות מנהל גיבוי אחד ל-GitHub עם הרשאה למאגר Studio.
2. להזמין אותו ל-Vercel ולתת גישה לפרויקט `biss-studio` בלבד.
3. להזמין אותו לארגון/פרויקט Supabase המבודד של Studio בלבד.
4. להגדיר גישת חירום בכספת סיסמאות פרטית. בכספת לשמור את שם החשבון, כתובת המייל, אמצעי השחזור, קודי 2FA והסבר למוציא לפועל/יורש — לא בקובץ זה.
5. לוודא שלאדם המורשה תהיה דרך חוקית להגיע למייל ולמספר הטלפון המשמשים לשחזור החשבונות.
6. לשמור עותק מוצפן של ZIP ההמשכיות במקום נוסף שאינו תלוי רק במחשב או בחשבון אחד.

לא בוצעו הזמנות אלה במסגרת עבודת הפיתוח, משום שלא נמסרו זהות וכתובת של יורש מורשה. בלי השלמתן, התיעוד והקוד נשמרים אך שחזור בעלות על חשבונות עלול לדרוש הליך ירושה רשמי מול הספקים.

## איפה מכניסים הגדרות

### Vercel

להיכנס לפרויקט `biss-studio`, לבחור Settings ואז Environment Variables. שמות החובה:

- `NEXT_PUBLIC_STUDIO_SUPABASE_URL`
- `NEXT_PUBLIC_STUDIO_SUPABASE_PUBLISHABLE_KEY`
- `STUDIO_SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`

`ADMIN_PIN` הוא מנגנון אתחול/גיבוי ישן בלבד. לאחר איפוס מתוך המערכת, ה-PIN הפעיל נשמר במסד כ-hash ואינו אמור להופיע בתיעוד.

שמות אופציונליים:

- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ARBOX_API_V3_BASE_URL`
- `ARBOX_API_KEY`

אין להעתיק ערכים מפרויקט Vineyard. לאחר שינוי משתני Production יש לבצע Redeploy ולבדוק את האתר.

### Supabase

- Database / Table Editor — נתוני Studio.
- SQL Editor — הרצת קובצי הסכימה לפי `docs/RECOVERY_RUNBOOK.md`.
- Authentication / Users — משתמשי הכניסה במייל.
- Authentication / URL Configuration — Site URL וכתובות החזרה.
- Project Settings / API — כתובת הפרויקט והמפתחות; מפתח סודי נשאר בצד השרת בלבד.

הגדרות Auth הנכונות:

- Site URL: `https://biss-studio.vercel.app`
- Redirect URL: `https://biss-studio.vercel.app/login`

### GitHub

כל שינוי קוד עובר ל-`main` רק לאחר בדיקות. ה-Git המקומי במחשב ישן ומכיל שינויים; אין לבצע ממנו `reset`, force push או פריסה ללא השוואה ל-GitHub. GitHub `main` הוא המקור הקובע.

## כניסה למערכת עצמה

- מערכת ראשית: `/`
- כניסה במייל ואיפוס PIN למנהל מזוהה: `/login`
- אזור מדריכה: `/my-sessions`
- אזור מתאמנת: `/my-program`
- אימון עצמאי: `/train/{programId}/{sessionIndex}`

איפוס PIN דורש מנהל מזוהה ב-Supabase Auth. בדיקת קצה לקצה של מייל הכניסה והאיפוס בפרויקט המבודד עדיין מופיעה כבדיקה פתוחה בדוח QA.

## פרטיות והרשאות

- גיבויי נתונים עשויים לכלול שמות, מיילים והערות רגישות; לשמור אותם מוצפנים ובגישה מוגבלת.
- אין לשמור מידע רפואי ב-localStorage, בקישור שיתוף ציבורי או ב-GitHub.
- קישור מחליפה אינו אמור לחשוף שמות מתאמנות או מידע רפואי.
- משתמשי Supabase Auth, סשנים וקישורי כניסה אינם משוחזרים מתמונת JSON; לאחר שחזור ייתכן שיהיה צורך להזמין משתמשים מחדש.

## בדיקת מסירה שנתית

פעם בשנה, או לאחר שינוי בעלות/ספק:

- לאשר שהיורש המורשה עדיין יכול להיכנס לשלושת השירותים.
- לעדכן אמצעי שחזור ו-2FA בכספת הפרטית.
- ליצור גיבוי נתונים ו-ZIP חדשים ולבדוק את חתימת ה-SHA-256.
- לוודא שהאתר, כניסת המייל, איפוס PIN ושמירת מלאי עובדים בפועל.

