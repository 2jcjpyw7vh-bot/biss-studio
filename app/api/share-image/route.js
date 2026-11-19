import {readFile} from "node:fs/promises";
import path from "node:path";
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
  const logo=await readFile(path.join(process.cwd(),"public","biss-logo.png"));
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",background:"#edf6ef",padding:60,flexDirection:"column",justifyContent:"center",color:"#205d42",fontFamily:"sans-serif"}}>
    <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="BISS" width={180} height={159} style={{objectFit:"contain",marginBottom:20}}/>
    <div style={{fontSize:84,fontWeight:700}}>BISS STUDIO</div><div style={{fontSize:40,marginTop:20}}>Move. Connect. Grow.</div><div style={{fontSize:28,marginTop:24}}>biss.vibes</div>
  </div>,{width:1200,height:630,headers:{"Cache-Control":"public, max-age=3600"}});
}
