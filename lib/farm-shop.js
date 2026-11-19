export function farmShopUrl(value){
 if(typeof value!=="string"||value.length>1000)return "";
 try{const url=new URL(value.trim()),host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||url.port||["manage.arboxapp.com","arboxserver.arboxapp.com","api.arboxapp.com"].includes(host))return "";
  if(!(host==="arboxapp.com"||host.endsWith(".arboxapp.com")||host==="arbox.co.il"||host.endsWith(".arbox.co.il")))return "";
  if([...url.searchParams.keys()].some(key=>/^(?:api[_-]?key|access[_-]?token|password|token_hash)$/i.test(key)))return "";
  return url.href;
 }catch{return "";}
}
