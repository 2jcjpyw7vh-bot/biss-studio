import {supabaseBrowser} from "./supabase-browser";

export async function requestWorkoutTask(path="",body) {
  const client=supabaseBrowser();
  const {data}=client?await client.auth.getSession():{};
  if(!data?.session){
    const error=new Error("יש להיכנס לחשבון Studio כדי לפתוח את המשימה.");
    error.status=401;
    throw error;
  }
  const response=await fetch(`/api/workout-tasks${path}`,{
    method:body?"POST":"GET",
    headers:{Authorization:`Bearer ${data.session.access_token}`,...(body&&{"Content-Type":"application/json"})},
    body:body?JSON.stringify(body):undefined,cache:"no-store"
  });
  const result=await response.json();
  if(!response.ok){
    const error=new Error(result.error||"לא ניתן לפתוח את המשימה.");
    error.status=response.status;
    throw error;
  }
  return result;
}
