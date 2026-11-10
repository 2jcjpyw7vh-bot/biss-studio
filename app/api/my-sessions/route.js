import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {canAccessInstructorArea,canViewAdaptations} from "../../../lib/studio-permissions";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req){
 const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const{profile,error,status}=await studioProfileFromRequest(req,db);if(error)return reply({error},status);
 if(!canAccessInstructorArea(profile))return reply({error:"אזור זה מיועד לצוות ההדרכה"},403);
 let query=db.from("biss_sessions").select("id,group_id,instructor_id,starts_at,title,instructor_name,workout_summary,playlist_url,status,workout_payload,workout_version").gte("starts_at",new Date(Date.now()-14*24*60*60*1000).toISOString()).order("starts_at").limit(50);
 if(profile.role!=="manager")query=query.eq("instructor_id",profile.id);
 const{data:sessions,error:sessionsError}=await query;if(sessionsError)return reply({error:"לא ניתן לטעון את האימונים"},503);
 const groupIds=[...new Set((sessions||[]).map(x=>x.group_id))],sessionIds=(sessions||[]).map(x=>x.id);
 const [groups,handoffs,adaptations]=await Promise.all([
  groupIds.length?db.from("biss_groups").select("id,name,level,music_style,playlist_url").in("id",groupIds):Promise.resolve({data:[]}),
  sessionIds.length?db.from("biss_handoffs").select("id,session_id,note,author_name,created_at").in("session_id",sessionIds).order("created_at",{ascending:false}):Promise.resolve({data:[]}),
  canViewAdaptations(profile)&&groupIds.length?db.from("biss_adaptations").select("id,group_id,member_name,category,guidance,valid_until").in("group_id",groupIds).eq("active",true):Promise.resolve({data:[]})
 ]);
 const queryError=groups.error||handoffs.error||adaptations.error;if(queryError)return reply({error:"לא ניתן לטעון את תדריך האימון"},503);
 return reply({profile:{full_name:profile.full_name,role:profile.role,can_view_health:canViewAdaptations(profile)},sessions:sessions||[],groups:groups.data||[],handoffs:handoffs.data||[],adaptations:adaptations.data||[]});
}

