import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../../lib/supabase";
import {studioProfileFromRequest} from "../../../../../lib/studio-auth";
import {loadCurrentWorkout} from "../../../../../lib/self-service-access";
import {sessionPlaylist} from "../../../../../lib/program-session";
import {studioPlaylistsForType,studioPlaylistType} from "../../../../../lib/studio-playlists";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req,{params}) {
 const {programId,sessionIndex}=await params;
 const index=Number(sessionIndex);
 if(!Number.isInteger(index)||index<0)return reply({error:"אימון לא תקין"},400);
 const db=supabaseAdmin();
 if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const {profile,error,status}=await studioProfileFromRequest(req,db);
 if(error)return reply({error},status);
 if(profile.role!=="trainee")return reply({error:"אזור זה מיועד למתאמנות"},403);

 const result=await loadCurrentWorkout(db,profile,programId,index);
 if(result.error)return reply({error:result.error},result.status);
 const {program,session,total}=result;
 const type=studioPlaylistType(session.type)||studioPlaylistType(program.program_payload?.type);
 const library=type?await studioPlaylistsForType(db,type):null;
 return reply({
  program:{id:program.id,title:program.title,musicUrl:program.program_payload?.musicUrl||"",musicTitle:program.program_payload?.musicTitle||""},
  session:{
   ...sessionPlaylist(program.program_payload,session),
   playlists:library?.data||[],
   name:String(session.name||"אימון"),progression:String(session.progression||""),
   items:Array.isArray(session.items)?session.items.slice(0,20):[]
  },
  session_index:index,total_sessions:total
 });
}
