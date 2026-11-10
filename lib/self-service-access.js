export function selfServiceAccess(profile,program,now=new Date()){
 if(!profile||profile.role!=="trainee"||profile.status!=="active")return{mode:"denied",equipment:false};
 const withinStart=!program?.starts_on||new Date(`${program.starts_on}T00:00:00`)<=now;
 const withinEnd=!program?.ends_on||new Date(`${program.ends_on}T23:59:59`)>=now;
 const approved=program?.status==="active"&&program?.approved_at&&program?.coach_id&&withinStart&&withinEnd;
 if(approved&&program.equipment_access===true)return{mode:"approved_program",equipment:true};
 return{mode:"mat_only",equipment:false};
}

