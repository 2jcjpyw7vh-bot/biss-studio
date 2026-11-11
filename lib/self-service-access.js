const studioDate = new Intl.DateTimeFormat("sv-SE", {
 timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"
});

const studioCalendarDate = now => studioDate.format(now);

export function selfServiceAccess(profile,program,now=new Date()){
 if(!profile||profile.role!=="trainee"||profile.status!=="active")return{mode:"denied",equipment:false};
 const today=studioCalendarDate(now);
 const withinStart=!program?.starts_on||program.starts_on<=today;
 const withinEnd=!program?.ends_on||program.ends_on>=today;
 const approved=program?.status==="active"&&program?.approved_at&&program?.coach_id&&withinStart&&withinEnd;
 if(approved&&program.equipment_access===true)return{mode:"approved_program",equipment:true};
 return{mode:"mat_only",equipment:false};
}

export function loadCurrentProgram(db,traineeId,now) {
 const today=studioCalendarDate(now);
 return db.from("biss_programs")
  .select("id,coach_id,title,summary,program_payload,equipment_access,status,approved_at,starts_on,ends_on")
  .eq("trainee_id",traineeId).eq("status","active")
  .or(`starts_on.is.null,starts_on.lte.${today}`)
  .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
}

export async function loadCurrentWorkout(db,profile,programId,index,now=new Date()) {
 const {data:program,error}=await loadCurrentProgram(db,profile.id,now);
 if(error)return {error:"לא ניתן לטעון את התוכנית. אפשר לנסות שוב.",status:503};
 if(program?.id!==programId)return {error:"האימון אינו בתוכנית הנוכחית. חזרי ל״התוכנית שלי״.",status:404};
 if(!selfServiceAccess(profile,program,now).equipment)return {error:"האימון אינו מאושר לשימוש במכשירים",status:403};
 const sessions=Array.isArray(program.program_payload?.sessions)?program.program_payload.sessions:[];
 const session=sessions[index];
 if(!session)return {error:"האימון לא נמצא בתוכנית",status:404};
 return {program,session,total:sessions.length};
}

export function nextSessionIndex(total,completedIndexes=[]){
 const count=Math.max(0,Number(total)||0);if(!count)return 0;
 const completed=new Set(completedIndexes.filter(Number.isInteger));
 for(let index=0;index<count;index++)if(!completed.has(index))return index;
 return 0;
}
