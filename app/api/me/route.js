import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req){
 const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const{profile,error,status}=await studioProfileFromRequest(req,db);if(error)return reply({error},status);
 return reply({user:{id:profile.id,full_name:profile.full_name,role:profile.role,can_view_health:profile.can_view_health}});
}

