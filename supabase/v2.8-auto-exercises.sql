-- BISS Studio V2.8
-- Run once in Supabase SQL Editor.

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null unique,
  he text not null,
  en text not null,
  region text not null default 'כל הגוף',
  muscles text not null default '',
  equipment_name text not null default 'ללא ציוד',
  level text not null default 'בינוניים',
  cue text not null default '',
  pattern text not null default 'Strength',
  goal text not null default 'חיזוק',
  regression text not null default '',
  progression text not null default '',
  safety text not null default '',
  video_url text not null default '',
  image_url text not null default '',
  antagonist_group text not null default '',
  source text not null default 'database',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists exercises_equipment_idx on public.exercises(equipment_name);
create index if not exists exercises_active_idx on public.exercises(active);
create index if not exists exercises_antagonist_idx on public.exercises(antagonist_group);

-- Clean accidental duplicate equipment names before enforcing uniqueness.
delete from public.equipment a
using public.equipment b
where a.name_he=b.name_he
  and a.id>b.id;

create unique index if not exists equipment_name_he_unique on public.equipment(name_he);

insert into public.exercises (exercise_id,he,en,region,muscles,equipment_name,level,cue,pattern,goal,regression,progression,safety,antagonist_group,source,active)
values
('v28-barre-squat','סקוואט בתמיכת בר','Barre Supported Squat','רגליים','ארבע ראשי, ישבן','בר קבוע בסטודיו','מתחילים','אחיזה קלה בלבד; הבר משמש לתמיכה.','Squat','חיזוק','טווח קטן','סקוואט מפוצל בתמיכה','לוודא שהבר מקובע ויציב.','quads-hamstrings','v2.8-seed',true),
('v28-barre-split-squat','סקוואט מפוצל בתמיכת בר','Barre Supported Split Squat','רגליים','ארבע ראשי, ישבן','בר קבוע בסטודיו','בינוניים','ירידה אנכית ואגן מאוזן.','Lunge','חיזוק','טווח קטן','פולסים בתחתית','לעבוד בטווח ללא כאב.','quads-hamstrings','v2.8-seed',true),
('v28-barre-calf','עליות עקב בתמיכת בר','Barre Supported Calf Raise','שוק','תאומים, סולאוס','בר קבוע בסטודיו','מתחילים','לעלות ולרדת לאט בלי להישען על הבר.','Calf','חיזוק','','רגל אחת','להימנע מנעילת ברכיים.','calf','v2.8-seed',true),
('v28-barre-abduction','הרחקת ירך בעמידה','Barre Standing Hip Abduction','ישבן','Gluteus Medius','בר קבוע בסטודיו','בינוניים','אגן נשאר ישר; תנועה קטנה ומבוקרת.','Abduction','חיזוק','','ללא מגע רגל ברצפה','לא לסובב אגן.','hip','v2.8-seed',true),
('v28-barre-extension','פשיטת ירך בעמידה','Barre Standing Hip Extension','ישבן','ישבן, ירך אחורית','בר קבוע בסטודיו','בינוניים','צלעות אסופות; הרגל נעה מהירך ולא מהגב.','Hip Extension','חיזוק','','פולסים בשליטה','לא להקשת גב תחתון.','hip','v2.8-seed',true),
('v28-low-anchor-deadlift','דדליפט עם גומייה מעיגון נמוך','Low Anchor Band Deadlift','ירך אחורית','ישבן, ירך אחורית','נקודת עיגון לגומיות - רצפה','בינוניים','אגן לאחור, גב ניטרלי ומתח רציף.','Hinge','חיזוק','טווח קטן','עצירה בתחתית','לבדוק את הגומייה והעיגון לפני כל סט.','quads-hamstrings','v2.8-seed',true),
('v28-low-anchor-row','חתירה מלמטה עם גומייה','Low Anchor Band Row','גב','גב עליון, רחב גבי, יד קדמית','נקודת עיגון לגומיות - רצפה','בינוניים','למשוך מרפקים לאחור בלי להרים כתפיים.','Pull','חיזוק','','חד צדדי','לא לעמוד בקו החזרה של גומייה פגומה.','chest-back','v2.8-seed',true),
('v28-low-anchor-curl','כפיפת מרפקים מעיגון נמוך','Low Anchor Band Biceps Curl','ידיים','יד קדמית','נקודת עיגון לגומיות - רצפה','בינוניים','מרפקים נשארים סמוך לגוף.','Arms Pull','חיזוק','','חד צדדי','לוודא אחיזה ותקינות גומייה.','biceps-triceps','v2.8-seed',true),
('v28-low-anchor-pallof','פאלוף אלכסוני מעיגון נמוך','Low Anchor Diagonal Pallof Press','ליבה','ליבה, אלכסונים','נקודת עיגון לגומיות - רצפה','מתקדמים','אגן וצלעות מול החזית; תנועה איטית.','Anti Rotation','יציבות','קרוב לעיגון','עמידת פסיעה','להימנע מסיבוב מהיר תחת עומס.','core-back','v2.8-seed',true),
('v28-waist-row','חתירה עם גומייה מעיגון בגובה מותן','Waist Anchor Band Row','גב','גב עליון, רחב גבי, יד קדמית','נקודת עיגון לגומיות - גובה מותן','מתחילים','כתפיים נמוכות ומשיכת מרפקים לצלעות.','Pull','חיזוק','','חתירה חד צדדית','לוודא שהעיגון והגומייה תקינים.','chest-back','v2.8-seed',true),
('v28-waist-chest','לחיצת חזה עם גומייה','Waist Anchor Band Chest Press','חזה','חזה, כתפיים, יד אחורית','נקודת עיגון לגומיות - גובה מותן','בינוניים','עמידת פסיעה יציבה וצלעות אסופות.','Push','חיזוק','','לחיצה חד צדדית','לא לאפשר לגומייה להחליק.','chest-back','v2.8-seed',true),
('v28-waist-pallof','פאלוף פרס מעיגון בגובה מותן','Waist Anchor Pallof Press','ליבה','ליבה, Anti-rotation','נקודת עיגון לגומיות - גובה מותן','בינוניים','להרחיק ידיים בלי לאפשר לגוף להסתובב.','Anti Rotation','יציבות','קרוב לעיגון','עמידת פסיעה','לעבוד בשליטה.','core-back','v2.8-seed',true),
('v28-waist-rotation','רוטציה מבוקרת עם גומייה','Waist Anchor Band Rotation','ליבה','אלכסונים, ליבה','נקודת עיגון לגומיות - גובה מותן','מתקדמים','סיבוב מבוקר מהחזה והירכיים כיחידה.','Rotation','חיזוק','','עמידה רחוקה יותר','לא לבצע תנועה בליסטית.','core-back','v2.8-seed',true),
('v28-waist-triceps','פשיטת מרפקים עם גומייה','Waist Anchor Triceps Press','ידיים','יד אחורית','נקודת עיגון לגומיות - גובה מותן','בינוניים','מרפקים יציבים ופשיטה מלאה בשליטה.','Arms Push','חיזוק','','חד צדדי','לשמור שורש כף יד ניטרלי.','biceps-triceps','v2.8-seed',true),
('v28-renegade-row','חתירת רנגייד','Dumbbell Renegade Row','גב','גב, ליבה, כתפיים','משקולות יד','מתקדמים','אגן יציב; למשוך משקולת בלי לסובב גוף.','Pull Plank','חיזוק','ברכיים על הרצפה','משקל כבד יותר','לשמור שורש כף יד ניטרלי ולהפסיק בכאב.','chest-back','v2.8-seed',true),
('v28-db-bulgarian','סקוואט בולגרי עם משקולות','Dumbbell Bulgarian Split Squat','רגליים','ארבע ראשי, ישבן','משקולות יד','מתקדמים','רגל קדמית יציבה; ירידה אנכית בשליטה.','Lunge','חיזוק','ללא משקל','טמפו איטי','להשתמש במשטח אחורי יציב.','quads-hamstrings','v2.8-seed',true),
('v28-db-single-rdl','דדליפט רומני רגל אחת עם משקולת','Dumbbell Single-leg RDL','ירך אחורית','ירך אחורית, ישבן, ליבה','משקולות יד','מתקדמים','אגן מאוזן ומשקולת קרובה לרגל התומכת.','Hinge','חיזוק','רגל אחורית נוגעת ברצפה','משקל ביד נגדית כבד יותר','לעבוד ליד תמיכה אם שיווי המשקל מוגבל.','quads-hamstrings','v2.8-seed',true),
('v28-db-thruster','תראסטר עם משקולות','Dumbbell Thruster','כל הגוף','רגליים, כתפיים, ליבה','משקולות יד','מתקדמים','להעביר כוח מהרגליים ללחיצה מעל הראש.','Squat Push','חיזוק','סקוואט ולחיצה בנפרד','טמפו רציף','לא להקשת גב בלחיצה.','','v2.8-seed',true),
('v28-kb-swing','סווינג קטלבל','Kettlebell Swing','כל הגוף','ישבן, ירך אחורית, ליבה','קטלבל','מתקדמים','התנועה מגיעה מציר הירך; הידיים מנחות בלבד.','Hinge Power','חיזוק','דדליפט קטלבל','סטים צפופים יותר','דורש שליטה טובה בציר ירך ומרחב פנוי.','quads-hamstrings','v2.8-seed',true),
('v28-kb-clean-press','קלין ולחיצה עם קטלבל','Kettlebell Clean and Press','כל הגוף','ישבן, כתפיים, ליבה','קטלבל','מתקדמים','קליטה רכה של הקטלבל ולחיצה ללא הקשתה.','Power Push','חיזוק','קלין בלבד','חד צדדי רציף','להתקדם רק לאחר שליטה בקלין בסיסי.','','v2.8-seed',true),
('v28-band-face-pull','פייס פול עם גומייה','Resistance Band Face Pull','גב','כתף אחורית, שכמות','גומיות התנגדות','בינוניים','למשוך לכיוון הפנים עם מרפקים פתוחים.','Pull','חיזוק','','מתח גבוה יותר','עיגון בטוח; לא למשוך גומייה פגומה.','shoulder-pull','v2.8-seed',true),
('v28-band-chest-press','לחיצת חזה עם גומייה','Resistance Band Chest Press','חזה','חזה, כתף קדמית, יד אחורית','גומיות עם ידיות','בינוניים','צלעות אסופות; לחיצה קדימה בשליטה.','Push','חיזוק','','חד צדדי','לוודא נקודת עיגון בטוחה.','chest-back','v2.8-seed',true),
('v28-bosu-squat-reach','סקוואט בוסו עם הושטת ידיים','BOSU Squat with Reach','רגליים','רגליים, ליבה, שיווי משקל','בוסו','מתקדמים','מרכז כובד בשליטה וטווח שמתאים ליציבות.','Squat Balance','חיזוק','סקוואט ליד הבוסו','הוספת משקל קל','סביבה פנויה ותמיכה זמינה.','quads-hamstrings','v2.8-seed',true),
('v28-step-knee-drive','עלייה למדרגה עם הרמת ברך','Step-up to Knee Drive','רגליים','ישבן, ארבע ראשי, ליבה','מדרגה','מתקדמים','לדחוף דרך הרגל העליונה ולהתייצב לפני ירידה.','Single Leg','חיזוק','ללא הרמת ברך','משקולות יד','לוודא שהמדרגה אינה מחליקה.','quads-hamstrings','v2.8-seed',true),
('v28-ball-ham-curl','כפיפת ברכיים על כדור פיזיו','Physio Ball Hamstring Curl','ירך אחורית','ירך אחורית, ישבן, ליבה','כדורי פיזיו','מתקדמים','אגן נשאר מורם בזמן גלגול הכדור.','Knee Flexion','חיזוק','גשר על הכדור','רגל אחת','מרחב פנוי וכדור תקין.','quads-hamstrings','v2.8-seed',true),
('v28-ball-pike','פייק על כדור פיזיו','Physio Ball Pike','ליבה','ליבה, כתפיים','כדורי פיזיו','מתקדמים','לדחוף רצפה ולקרב אגן מעלה בשליטה.','Core Flexion','חיזוק','קיפול ברכיים על הכדור','טווח גדול יותר','מיועד למתאמנים עם שליטה טובה בכתפיים ובליבה.','core-back','v2.8-seed',true),
('v28-db-pullover','פולאובר עם משקולת','Dumbbell Pullover','גב','רחב גבי, חזה, ליבה','משקולות יד','בינוניים','צלעות אסופות וטווח כתף נוח.','Pull','חיזוק','משקל קל','טמפו איטי','לא להכריח טווח בכתף.','chest-back','v2.8-seed',true),
('v28-db-zpress','Z Press עם משקולות','Dumbbell Z Press','כתפיים','כתפיים, יד אחורית, ליבה','משקולות יד','מתקדמים','ישיבה זקופה ורגליים ישרות; לחיצה ללא הישענות.','Vertical Push','חיזוק','לחיצה בישיבה על כיסא','משקל גבוה יותר','נדרשת ניידות ירך וגב מספקת.','shoulder-pull','v2.8-seed',true),
('v28-plank-row-band','פלאנק עם משיכת גומייה','Plank Band Row','ליבה','ליבה, גב, כתפיים','גומיות עם ידיות','מתקדמים','אגן שקט; משיכה קצרה בלי רוטציה.','Pull Plank','חיזוק','ברכיים על הרצפה','מתח גבוה יותר','עיגון בטוח ושורש כף יד ללא כאב.','chest-back','v2.8-seed',true),
('v28-reverse-fly','הרחקה אחורית עם משקולות','Dumbbell Reverse Fly','גב','כתף אחורית, שכמות','משקולות יד','בינוניים','ציר ירך יציב ופתיחת ידיים ללא תנופה.','Pull','חיזוק','משקל קל','עצירה בסוף הטווח','לא למשוך מעבר לטווח כתף נוח.','shoulder-pull','v2.8-seed',true)
on conflict (exercise_id) do update set
 he=excluded.he,en=excluded.en,region=excluded.region,muscles=excluded.muscles,
 equipment_name=excluded.equipment_name,level=excluded.level,cue=excluded.cue,
 pattern=excluded.pattern,goal=excluded.goal,regression=excluded.regression,
 progression=excluded.progression,safety=excluded.safety,
 antagonist_group=excluded.antagonist_group,source=excluded.source,active=excluded.active;

select equipment_name,count(*) as exercises
from public.exercises
where active=true
group by equipment_name
order by exercises desc;
