-- BISS Studio V2.7
-- הוספת מתקני סטודיו קבועים למלאי, ללא יצירת כפילויות.

insert into equipment (name_he,name_en,category,quantity,details,active)
select 'בר קבוע בסטודיו','Studio Barre / Support Bar','fixed_station',1,
       'בר קבוע לתמיכה, שיווי משקל ותרגילים בעמידה',true
where not exists (select 1 from equipment where name_he='בר קבוע בסטודיו');

insert into equipment (name_he,name_en,category,quantity,details,active)
select 'נקודת עיגון לגומיות — רצפה','Resistance Band Floor Anchor','anchor_points',2,
       '2 נקודות עיגון בגובה הרצפה',true
where not exists (select 1 from equipment where name_he='נקודת עיגון לגומיות — רצפה');

insert into equipment (name_he,name_en,category,quantity,details,active)
select 'נקודת עיגון לגומיות — גובה מותן','Resistance Band Waist-Height Anchor','anchor_points',4,
       '4 נקודות עיגון בגובה המותן',true
where not exists (select 1 from equipment where name_he='נקודת עיגון לגומיות — גובה מותן');
