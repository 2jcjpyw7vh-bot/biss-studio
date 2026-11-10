const profileFields="id,full_name,email,role,status,can_view_health,auth_user_id";

export async function studioProfileFromRequest(req,db){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return{error:"נדרשת כניסה",status:401};
 const{data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user?.email)return{error:"הכניסה אינה תקפה",status:401};
 let{data:profile,error}=await db.from("biss_users").select(profileFields).eq("auth_user_id",user.id).maybeSingle();
 if(error)return{error:"לא ניתן לבדוק הרשאות",status:503};
 if(!profile){
  const matched=await db.from("biss_users").select(profileFields).eq("email",user.email.toLowerCase()).maybeSingle();
  if(matched.error)return{error:"לא ניתן לבדוק הרשאות",status:503};
  profile=matched.data;
  if(profile&&!profile.auth_user_id){
   const linked=await db.from("biss_users").update({auth_user_id:user.id}).eq("id",profile.id).is("auth_user_id",null).select(profileFields).maybeSingle();
   if(linked.error)return{error:"לא ניתן לקשר את החשבון",status:409};
   profile=linked.data;
  }
 }
 if(!profile||profile.status!=="active")return{error:"החשבון אינו רשום כמשתמשת פעילה ב-Studio",status:403};
 return{profile,user,status:200};
}

