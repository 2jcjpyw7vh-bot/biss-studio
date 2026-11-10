 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient;
export function supabaseBrowser(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://onnecsibxkcdyhbzffgj.supabase.co",key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_V_MDHZPEEfN-vkvQLaeYjA_wQd9Dgyt";
 if(!url||!key)return null;
 if(!browserClient)browserClient=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return browserClient;
}



