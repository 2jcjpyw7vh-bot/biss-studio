import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {canAccessInstructorArea} from "../../../lib/studio-permissions";
import {studioPlaylistEntry,studioPlaylistsForType,studioPlaylistType} from "../../../lib/studio-playlists";

const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

async function staff(req) {
  const db=supabaseAdmin();
  if(!db)return {response:reply({error:"שירות Studio אינו זמין."},503)};
  const {profile,error,status}=await studioProfileFromRequest(req,db);
  if(error)return {response:reply({error},status)};
  if(!canAccessInstructorArea(profile))return {response:reply({error:"ספריית הפלייליסטים זמינה לצוות Studio."},403)};
  return {db,profile};
}

export async function GET(req) {
  const {db,response}=await staff(req);
  if(response)return response;
  const type=studioPlaylistType(new URL(req.url).searchParams.get("type"));
  if(!type)return reply({error:"סוג אימון אינו תקין."},400);
  const {data,error}=await studioPlaylistsForType(db,type);
  return error?reply({error:"לא ניתן לטעון פלייליסטים."},503):reply({playlists:data});
}

export async function POST(req) {
  const {db,profile,response}=await staff(req);
  if(response)return response;
  const entry=studioPlaylistEntry(await req.json().catch(()=>null));
  if(!entry)return reply({error:"נדרש שם וקישור HTTPS לפלייליסט."},400);
  const {error}=await db.from("biss_studio_playlists").insert({...entry,created_by:profile.id});
  if(error&&error.code!=="23505")return reply({error:"לא ניתן לשמור את הפלייליסט."},503);
  const list=await studioPlaylistsForType(db,entry.workout_type);
  if(list.error)return reply({error:"לא ניתן לרענן את הספרייה. אפשר לנסות שוב."},503);
  return reply({playlists:list.data,alreadySaved:error?.code==="23505"});
}
