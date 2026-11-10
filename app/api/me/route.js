import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return reply({error:"נדרשת כניסה"},401);
 const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const{data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user?.email)return reply({error:"הכניסה אינה תקפה"},401);
 let{data:profile,error}=await db.from("biss_users").select("id,full_name,role,status,can_view_health,auth_user_id").eq("auth_user_id",user.id).maybeSingle();
 if(error)return reply({error:"לא ניתן לבדוק הרשאות"},503);
 if(!profile){
  const matched=await db.from("biss_users").select("id,full_name,role,status,can_view_health,auth_user_id").eq("email",user.email.toLowerCase()).maybeSingle();
  if(matched.error)return reply({error:"לא ניתן לבדוק הרשאות"},503);
  profile=matched.data;
  if(profile&&!profile.auth_user_id){const linked=await db.from("biss_users").update({auth_user_id:user.id}).eq("id",profile.id).is("auth_user_id",null).select("id,full_name,role,status,can_view_health,auth_user_id").maybeSingle();if(linked.error)return reply({error:"לא ניתן לקשר את החשבון"},409);profile=linked.data}
 }
 if(!profile||profile.status!=="active")return reply({error:"החשבון אינו רשום כמשתמשת פעילה ב-Studio"},403);
 return reply({user:{id:profile.id,full_name:profile.full_name,role:profile.role,can_view_health:profile.can_view_health}});
}

