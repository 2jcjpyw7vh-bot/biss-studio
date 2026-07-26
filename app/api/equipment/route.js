import {NextResponse} from "next/server";
import crypto from "crypto";
import {supabaseAdmin} from "../../../lib/supabase";
import seed from "../../../data/equipment.json";
import {generateExercisesForEquipment} from "../../../lib/exercise-generator";
const safeEqual=(a,b)=>{const A=Buffer.from(String(a||"")),B=Buffer.from(String(b||""));return A.length===B.length&&crypto.timingSafeEqual(A,B)};
const isAdmin=req=>Boolean(process.env.ADMIN_PIN)&&safeEqual(req.headers.get("x-admin-pin"),process.env.ADMIN_PIN);
export async function GET(){const db=supabaseAdmin();if(!db)return NextResponse.json(seed);const{data,error}=await db.from("equipment").select("*").order("created_at");if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data?.length?data:seed)}
export async function POST(req){
 if(!isAdmin(req))return NextResponse.json({error:"PIN שגוי"},{status:401});
 const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Supabase עדיין לא מחובר"},{status:503});
 const b=await req.json(),nameHe=String(b.name_he||"").trim();if(!nameHe)return NextResponse.json({error:"חסר שם ציוד"},{status:400});
 const{data:existing,error:checkError}=await db.from("equipment").select("*").eq("name_he",nameHe).limit(1);
 if(checkError)return NextResponse.json({error:checkError.message},{status:500});
 if(existing?.length)return NextResponse.json({error:"הציוד כבר קיים במלאי"},{status:409});
 const{data:equipment,error}=await db.from("equipment").insert({name_he:nameHe,name_en:String(b.name_en||"").trim(),category:b.category||"other",quantity:Number(b.quantity||0),details:b.details||"",active:b.active!==false}).select().single();
 if(error)return NextResponse.json({error:error.message},{status:500});
 let generatedCount=0,generationSource="none",generationWarning="";
 try{
   const generated=await generateExercisesForEquipment(equipment);generationSource=generated.source;
   if(generated.exercises.length){
     const rows=generated.exercises.map(x=>({exercise_id:x.id,he:x.he,en:x.en,region:x.region,muscles:x.muscles,equipment_name:nameHe,level:x.level,cue:x.cue,pattern:x.pattern,goal:x.goal,regression:x.regression,progression:x.progression,safety:x.safety,video_url:x.videoUrl||"",image_url:x.imageUrl||"",antagonist_group:x.antagonist_group||"",source:x.source||"equipment-auto",active:true}));
     const{error:exerciseError}=await db.from("exercises").upsert(rows,{onConflict:"exercise_id"});if(exerciseError)throw exerciseError;generatedCount=rows.length;
   }else generationWarning="הציוד נוסף, אך לא נוצרו תרגילים. לציוד לא מוכר יש להגדיר GEMINI_API_KEY.";
 }catch(e){console.error("Automatic exercise creation failed:",e);generationWarning="הציוד נוסף, אך יצירת התרגילים האוטומטית נכשלה."}
 return NextResponse.json({...equipment,generatedCount,generationSource,generationWarning});
}
export async function PATCH(req){if(!isAdmin(req))return NextResponse.json({error:"PIN שגוי"},{status:401});const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Supabase עדיין לא מחובר"},{status:503});const b=await req.json(),id=b.id;delete b.id;const allowed={};for(const k of["quantity","active","details","name_he","name_en","category"])if(k in b)allowed[k]=b[k];const{data,error}=await db.from("equipment").update(allowed).eq("id",id).select().single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data)}
export async function DELETE(req){if(!isAdmin(req))return NextResponse.json({error:"PIN שגוי"},{status:401});const db=supabaseAdmin();if(!db)return NextResponse.json({error:"Supabase עדיין לא מחובר"},{status:503});const{id}=await req.json();const{error}=await db.from("equipment").delete().eq("id",id);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true})}
