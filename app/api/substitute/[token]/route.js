import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {writeAudit} from "../../../../lib/audit";
import {publicSubstituteOffer} from "../../../../lib/substitute-privacy";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const validToken=token=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token||"");

export async function GET(req,{params}){
 const {token}=await params,db=supabaseAdmin();
 if(!db)return reply({error:"לא זמין"},503);
 if(!validToken(token))return reply({error:"ההצעה לא נמצאה"},404);
 const {data,error}=await db.from("biss_substitute_offers")
  .select("id,status,message,expires_at,show_workout,biss_sessions(id,title,status,starts_at,workout_summary,workout_payload,playlist_url,group_id,biss_groups(name))")
  .eq("token",token).maybeSingle();
 if(error)return reply({error:"לא ניתן לטעון את ההצעה"},503);
 if(!data)return reply({error:"ההצעה לא נמצאה"},404);
 if(data.status==="pending"){
  if(data.biss_sessions?.status!=="planned")data.status="cancelled";
  else if(Math.min(Date.parse(data.expires_at),Date.parse(data.biss_sessions.starts_at))<=Date.now())data.status="expired";
 }
 return reply(publicSubstituteOffer(data));
}

export async function POST(req,{params}){
 const {token}=await params,db=supabaseAdmin();
 if(!db)return reply({error:"לא זמין"},503);
 if(!validToken(token))return reply({error:"ההצעה לא נמצאה"},404);
 const body=await req.json().catch(()=>null);
 const decision=body?.decision;
 if(!["accepted","declined"].includes(decision))return reply({error:"תגובה לא תקינה"},400);
 const {data,error}=await db.rpc("studio_respond_to_substitute",{p_token:token,p_decision:decision}).single();
 if(error)return reply({error:"לא ניתן לשמור תגובה. אפשר לנסות שוב."},503);
 if(data.result==="missing")return reply({error:"ההצעה לא נמצאה"},404);
 if(data.result==="unavailable")return reply({error:"המדריכה אינה זמינה לשיבוץ. יש לפנות לסטודיו."},409);
 if(data.result!=="saved")return reply({error:"ההצעה כבר נענתה, בוטלה או פגה. רעננו את הדף לפרטים."},409);
 await writeAudit(db,{action:`substitute_offer.${decision}`,entityType:"offer",entityId:data.offer_id,label:decision==="accepted"?"הצעת החלפה אושרה":"הצעת החלפה נדחתה",metadata:{status:decision}});
 return reply({ok:true,status:decision});
}
