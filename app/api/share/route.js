import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {publicWorkoutShare} from "../../../lib/public-workout-share";

export async function POST(req) {
  const db=supabaseAdmin();
  if(!db)return NextResponse.json({error:"Supabase עדיין לא מחובר"},{status:503});
  const body=await req.json().catch(()=>null);
  const type=body?.type;
  if(!["exercise","workout","program","homework"].includes(type)){
    return NextResponse.json({error:"סוג שיתוף לא תקין"},{status:400});
  }
  const payload=type==="workout"?publicWorkoutShare(body.payload):body.payload;
  if(!payload)return NextResponse.json({error:"אין תוכן תקין לשיתוף"},{status:400});
  const {data,error}=await db.from("shared_items").insert({type,payload}).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  const base=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");
  return NextResponse.json({url:`${base}/share/${data.id}`});
}
