import {supabaseAdmin} from "../../../lib/supabase";
export async function GET(request) {
  const {searchParams}=new URL(request.url);
  const exercise=searchParams.get("exercise");
  const exerciseId=searchParams.get("id");
  if(!exercise)return Response.json({error:"Missing exercise"},{status:400});
  const apiKey=process.env.YOUTUBE_API_KEY;
  if(!apiKey)return Response.json({error:"Missing YouTube API key"},{status:500});
  const query=`${exercise} exercise proper form tutorial`;
  const url=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoEmbeddable=true&safeSearch=strict&q=${encodeURIComponent(query)}&key=${apiKey}`;
  try{
    const response=await fetch(url,{next:{revalidate:86400}});
    const data=await response.json();
    if(!response.ok)return Response.json({error:"YouTube search failed"},{status:response.status});
    const preferred=data.items?.find(item=>{
      const title=(item.snippet?.title||"").toLowerCase();
      return ["how to","proper form","tutorial","technique"].some(k=>title.includes(k));
    })||data.items?.[0];
    const videoId=preferred?.id?.videoId;
    const videoUrl=videoId?`https://www.youtube.com/embed/${videoId}`:"";
    if(videoUrl&&exerciseId){
      const db=supabaseAdmin();
      if(db)await db.from("exercises").update({video_url:videoUrl}).eq("exercise_id",exerciseId);
    }
    return Response.json({videoUrl});
  }catch{return Response.json({error:"Video search failed"},{status:500})}
}
