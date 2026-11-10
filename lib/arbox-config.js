export function arboxConfiguration(env=process.env){
 const raw=String(env.ARBOX_API_V3_BASE_URL||"").trim(),hasKey=Boolean(String(env.ARBOX_API_KEY||"").trim());
 if(!raw)return{configured:false,validHost:false,hasKey,host:"",version:"v3"};
 try{
  const url=new URL(raw),host=url.hostname.toLowerCase(),validHost=url.protocol==="https:"&&(host==="arboxapp.com"||host.endsWith(".arboxapp.com"));
  return{configured:validHost&&hasKey,validHost,hasKey,host:validHost?host:"",version:"v3"};
 }catch{return{configured:false,validHost:false,hasKey,host:"",version:"v3"}}
}

