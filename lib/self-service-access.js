const studioDate = new Intl.DateTimeFormat("sv-SE", {
 timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"
});

export function selfServiceAccess(profile,program,now=new Date()){
 if(!profile||profile.role!=="trainee"||profile.status!=="active")return{mode:"denied",equipment:false};
 const today=studioDate.format(now);
 const withinStart=!program?.starts_on||program.starts_on<=today;
 const withinEnd=!program?.ends_on||program.ends_on>=today;
 const approved=program?.status==="active"&&program?.approved_at&&program?.coach_id&&withinStart&&withinEnd;
 if(approved&&program.equipment_access===true)return{mode:"approved_program",equipment:true};
 return{mode:"mat_only",equipment:false};
}

export function nextSessionIndex(total,completedIndexes=[]){
 const count=Math.max(0,Number(total)||0);if(!count)return 0;
 const completed=new Set(completedIndexes.filter(Number.isInteger));
 for(let index=0;index<count;index++)if(!completed.has(index))return index;
 return 0;
}
