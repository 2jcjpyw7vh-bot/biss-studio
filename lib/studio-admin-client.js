import {supabaseBrowser} from "./supabase-browser";

export async function studioAdminHeaders(pin){
  const client=supabaseBrowser();
  const {data}=client?await client.auth.getSession():{};
  return {
    "Content-Type":"application/json",
    ...(pin?{"x-admin-pin":pin}:{}),
    ...(data?.session?{Authorization:`Bearer ${data.session.access_token}`}:{})
  };
}
