export async function generateMetadata({params}){
  const {token}=await params;
  const valid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token);
  return {title:"הזדמנות להדריך · BISS Studio",robots:{index:false,follow:false},openGraph:{title:"בואי להדריך ב־BISS Studio",description:"מועדים, תנאים והגשת מועמדות במקום אחד",images:[{url:valid?`/api/share-image?token=${token}`:"/api/share-image",width:1200,height:630,alt:"BISS Studio"}]}};
}
export default function RecruitmentLayout({children}){return children;}
