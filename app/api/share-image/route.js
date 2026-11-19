import {ImageResponse} from "next/og";
import {supabaseAdmin} from "../../../lib/supabase";
import {isRecruitmentId} from "../../../lib/recruitment";
export const dynamic="force-dynamic";
export async function GET(req){
  const token=new URL(req.url).searchParams.get("token");
  if(isRecruitmentId(token)){
    const db=supabaseAdmin();
    const result=db&&await db.from("biss_recruitment_posts").select("terms").eq("token",token).eq("status","open").maybeSingle();
    const image=result?.data?.terms?.image;
    if(image&&["image/jpeg","image/png"].includes(image.mime))return new Response(Buffer.from(image.base64,"base64"),{headers:{"Content-Type":image.mime,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  }
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",background:"#edf6ef",padding:76,flexDirection:"column",justifyContent:"center",color:"#205d42",fontFamily:"sans-serif"}}>
    <div style={{display:"flex",gap:16,marginBottom:30}}><div style={{width:72,height:72,borderRadius:24,background:"#55b38a"}}/><div style={{width:22,height:72,borderRadius:10,background:"#139dbb"}}/><div style={{width:72,height:72,borderRadius:24,background:"#c80c46"}}/></div>
    <div style={{fontSize:96,fontWeight:700}}>BISS STUDIO</div><div style={{fontSize:40,marginTop:20}}>Move. Connect. Grow.</div><div style={{fontSize:28,marginTop:44}}>biss.vibes</div>
  </div>,{width:1200,height:630,headers:{"Cache-Control":"public, max-age=3600"}});
}
