const TTL=7*24*60*60*1000;
export function programDraftKey(owner,taskId=''){return owner?`biss:program-draft:v1:${owner}:${taskId||'personal'}`:'';}
export function readProgramDraft(raw,{owner,taskId='',revision='',now=Date.now()}){
 try{
   if(!owner||typeof raw!=='string'||raw.length>500000)return null;
   const value=JSON.parse(raw);
   if(value.owner!==owner||value.taskId!==taskId||value.revision!==revision||!Number.isFinite(value.at)||now-value.at>TTL||value.at>now+60000)return null;
   if(!Array.isArray(value.program?.sessions)||!value.program.sessions.length||value.program.sessions.some(s=>!Array.isArray(s.items)))return null;
   return value;
 }catch{return null;}
}
export function programReturnPath(taskId='',session=0){
 const query=new URLSearchParams({tab:'programResult'});
 if(/^[a-f0-9-]{36}$/i.test(taskId))query.set('buildTask',taskId);
 const index=Number.isInteger(Number(session))&&Number(session)>=0&&Number(session)<60?Number(session):0;
 return `/?${query}#program-session-${index}`;
}
