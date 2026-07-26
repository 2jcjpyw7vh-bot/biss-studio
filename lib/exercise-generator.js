const DEFAULT_COUNT = 8;

function slugify(value=""){
  return String(value).toLowerCase().trim()
    .replace(/[\u0590-\u05ff]+/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")
    .slice(0,48) || `equipment-${Date.now()}`;
}

function normalizeExercise(x,equipment,index){
  const base=slugify(x.en||x.he||`${equipment.name_en}-${index+1}`);
  return {
    id:`${slugify(equipment.name_en||equipment.name_he)}-${base}-${index+1}`,
    he:String(x.he||"").trim(),en:String(x.en||"").trim(),
    region:String(x.region||"כל הגוף").trim(),muscles:String(x.muscles||"").trim(),
    equipment:equipment.name_he,
    level:["מתחילים","בינוניים","מתקדמים"].includes(x.level)?x.level:"בינוניים",
    cue:String(x.cue||"").trim(),pattern:String(x.pattern||"Strength").trim(),
    goal:String(x.goal||"חיזוק").trim(),regression:String(x.regression||"").trim(),
    progression:String(x.progression||"").trim(),safety:String(x.safety||"").trim(),
    antagonist_group:String(x.antagonist_group||"").trim(),
    source:"equipment-auto",active:true,videoUrl:"",imageUrl:""
  };
}

const knownTemplates=[
 {test:/בר קבוע|barre|studio bar/i,items:[
  ["סקוואט בתמיכת בר","Barre Supported Squat","רגליים","ארבע ראשי, ישבן","מתחילים","אחיזה קלה בלבד; הבר משמש לתמיכה.","Squat","חיזוק","טווח קטן","סקוואט מפוצל בתמיכה","לבדוק שהבר מקובע ויציב.","quads-hamstrings"],
  ["סקוואט מפוצל בתמיכת בר","Barre Supported Split Squat","רגליים","ארבע ראשי, ישבן","בינוניים","ירידה אנכית ואגן מאוזן.","Lunge","חיזוק","טווח קטן","פולסים בתחתית","לעבוד בטווח ללא כאב.","quads-hamstrings"],
  ["עליות עקב בתמיכת בר","Barre Supported Calf Raise","שוק","תאומים, סולאוס","מתחילים","לעלות ולרדת לאט בלי להישען.","Calf","חיזוק","שתי רגליים","רגל אחת","להימנע מנעילת ברכיים.","calf"],
  ["הרחקת ירך בעמידה","Barre Standing Hip Abduction","ישבן","Gluteus Medius","בינוניים","אגן ישר ותנועה קטנה ומבוקרת.","Abduction","חיזוק","טווח קטן","ללא מגע רגל ברצפה","לא לסובב אגן.","hip"],
  ["פשיטת ירך בעמידה","Barre Standing Hip Extension","ישבן","ישבן, ירך אחורית","בינוניים","צלעות אסופות; הרגל נעה מהירך.","Hip Extension","חיזוק","טווח קטן","פולסים בשליטה","לא להקשת גב תחתון.","hip"],
  ["כפיפת ברך בעמידה","Barre Standing Hamstring Curl","ירך אחורית","המסטרינג","בינוניים","ברכיים בקו אחד והאגן יציב.","Knee Flexion","חיזוק","טווח קטן","קצב איטי","להפסיק אם יש התכווצות חדה.","quads-hamstrings"]
 ]},
 {test:/עיגון.*רצפה|floor.*anchor|low anchor/i,items:[
  ["סקוואט עם גומייה מעיגון נמוך","Low Anchor Band Squat","רגליים","ארבע ראשי, ישבן","בינוניים","לשמור מתח רציף ולנוע בשליטה.","Squat","חיזוק","סקוואט משקל גוף","סקוואט עם עצירה","לוודא חיבור בטוח של הגומייה.","quads-hamstrings"],
  ["דדליפט עם גומייה מעיגון נמוך","Low Anchor Band Deadlift","ירך אחורית","ישבן, ירך אחורית","בינוניים","אגן לאחור, גב ניטרלי.","Hinge","חיזוק","טווח קטן","קצב איטי עם עצירה","לבדוק את הגומייה והעיגון.","quads-hamstrings"],
  ["חתירה מלמטה עם גומייה","Low Anchor Band Row","גב","גב עליון, רחב גבי, יד קדמית","בינוניים","למשוך מרפקים לאחור בלי להרים כתפיים.","Pull","חיזוק","קרוב לעיגון","רחוק יותר","לא לעמוד בקו החזרה של גומייה פגומה.","chest-back"],
  ["כפיפת מרפקים מעיגון נמוך","Low Anchor Band Biceps Curl","ידיים","יד קדמית","בינוניים","מרפקים נשארים סמוך לגוף.","Arms Pull","חיזוק","מתח נמוך","עבודה חד צדדית","לוודא אחיזה ותקינות גומייה.","biceps-triceps"],
  ["פאלוף אלכסוני מעיגון נמוך","Low Anchor Diagonal Pallof Press","ליבה","ליבה, אלכסונים","מתקדמים","אגן וצלעות מול החזית.","Anti Rotation","יציבות","קרוב לעיגון","עמידת פסיעה","להימנע מסיבוב מהיר תחת עומס.","core-back"]
 ]},
 {test:/עיגון.*מותן|waist.*anchor|mid anchor/i,items:[
  ["חתירה עם גומייה מעיגון בגובה מותן","Waist Anchor Band Row","גב","גב עליון, רחב גבי, יד קדמית","מתחילים","כתפיים נמוכות ומשיכת מרפקים לצלעות.","Pull","חיזוק","מתח קל","חתירה חד צדדית","לוודא שהעיגון והגומייה תקינים.","chest-back"],
  ["לחיצת חזה עם גומייה","Waist Anchor Band Chest Press","חזה","חזה, כתפיים, יד אחורית","בינוניים","עמידת פסיעה יציבה וצלעות אסופות.","Push","חיזוק","מתח קל","לחיצה חד צדדית","לא לאפשר לגומייה להחליק.","chest-back"],
  ["פאלוף פרס מעיגון בגובה מותן","Waist Anchor Pallof Press","ליבה","ליבה, Anti-rotation","בינוניים","להרחיק ידיים בלי לאפשר לגוף להסתובב.","Anti Rotation","יציבות","קרוב לעיגון","עמידת פסיעה","לעבוד בשליטה.","core-back"],
  ["רוטציה מבוקרת עם גומייה","Waist Anchor Band Rotation","ליבה","אלכסונים, ליבה","מתקדמים","סיבוב מבוקר מהחזה והירכיים כיחידה.","Rotation","חיזוק","טווח קטן","עמידה רחוקה יותר","לא לבצע תנועה בליסטית.","core-back"],
  ["פשיטת מרפקים עם גומייה","Waist Anchor Triceps Press","ידיים","יד אחורית","בינוניים","מרפקים יציבים ופשיטה מלאה בשליטה.","Arms Push","חיזוק","מתח קל","עבודה חד צדדית","לשמור שורש כף יד ניטרלי.","biceps-triceps"]
 ]}
];

function knownExercises(equipment){
  const hay=`${equipment.name_he||""} ${equipment.name_en||""}`;
  const hit=knownTemplates.find(t=>t.test.test(hay));
  if(!hit)return[];
  return hit.items.map((v,i)=>normalizeExercise({
    he:v[0],en:v[1],region:v[2],muscles:v[3],level:v[4],cue:v[5],pattern:v[6],
    goal:v[7],regression:v[8],progression:v[9],safety:v[10],antagonist_group:v[11]
  },equipment,i));
}

async function geminiExercises(equipment){
  const key=process.env.GEMINI_API_KEY;
  if(!key)return[];
  const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
  const schema={type:"ARRAY",items:{type:"OBJECT",properties:{
    he:{type:"STRING"},en:{type:"STRING"},region:{type:"STRING"},muscles:{type:"STRING"},
    level:{type:"STRING"},cue:{type:"STRING"},pattern:{type:"STRING"},goal:{type:"STRING"},
    regression:{type:"STRING"},progression:{type:"STRING"},safety:{type:"STRING"},
    antagonist_group:{type:"STRING"}
  },required:["he","en","region","muscles","level","cue","pattern","goal","regression","progression","safety","antagonist_group"]}};
  const prompt=`צור ${DEFAULT_COUNT} תרגילי סטודיו מקצועיים ובטוחים לציוד:
עברית: ${equipment.name_he}
אנגלית: ${equipment.name_en||""}
קטגוריה: ${equipment.category||"other"}
פרטים: ${equipment.details||""}
שלב מתחילים, בינוניים ומתקדמים. antagonist_group יהיה אחת: chest-back, biceps-triceps, quads-hamstrings, core-back, shoulder-pull, hip, calf או ריק.
אין להמציא שימוש שאינו מתאים לציוד. אין אבחון או טיפול רפואי.`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
      generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:0.25}})
  });
  if(!response.ok)throw new Error(`Gemini generation failed (${response.status})`);
  const data=await response.json();
  const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"[]";
  const parsed=JSON.parse(text);
  return Array.isArray(parsed)?parsed.map((x,i)=>normalizeExercise(x,equipment,i)):[];
}

async function attachYouTubeVideos(exercises){
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return exercises;
  return Promise.all(exercises.map(async x=>{
    try{
      const q=`${x.en} exercise proper form tutorial`;
      const url=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoEmbeddable=true&safeSearch=strict&q=${encodeURIComponent(q)}&key=${key}`;
      const r=await fetch(url,{next:{revalidate:86400}});
      if(!r.ok)return x;
      const d=await r.json();
      const preferred=d.items?.find(item=>{
        const title=(item.snippet?.title||"").toLowerCase();
        return["how to","proper form","tutorial","technique"].some(k=>title.includes(k));
      })||d.items?.[0];
      const id=preferred?.id?.videoId;
      return id?{...x,videoUrl:`https://www.youtube.com/embed/${id}`} : x;
    }catch{return x}
  }));
}

export async function generateExercisesForEquipment(equipment){
  let generated=knownExercises(equipment);
  let source=generated.length?"curated":"none";
  if(!generated.length){
    try{generated=await geminiExercises(equipment);if(generated.length)source="gemini"}
    catch(error){console.error("Gemini equipment generation:",error)}
  }
  return{exercises:generated,source};
}
