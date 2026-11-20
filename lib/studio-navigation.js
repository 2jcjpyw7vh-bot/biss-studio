export function personalArea(role){
  if(role==="operator")return "/operations";
  if(role==="trainee")return "/my-visits";
  return ["manager","instructor"].includes(role)?"/my-sessions":"/login";
}
export function accountArea(role,path){
  return role&&['/my-visits','/my-program'].includes(path)?'/my-visits':personalArea(role);
}

export const workspaceSections=[
  {id:"builder",label:"בניית אימון"},
  {id:"exercises",label:"ספריית תרגילים"},
  {id:"program",label:"תוכניות אימון"},
  {id:"homework",label:"שיעורי בית"},
  {id:"continuity",label:"רצף קבוצות"},
  {id:"team",label:"צוות והחלפות"},
  {id:"equipment",label:"מלאי ציוד"},
  {id:"integrations",label:"לוח ארבוקס"}
];

export function workspaceSection(value){
  return workspaceSections.some(section=>section.id===value)?value:"";
}

export function workspaceTitle(value){
  return workspaceSections.find(section=>section.id===value)?.label||{
    workout:"האימון שבניתי",programResult:"התוכנית שבניתי",homeworkResult:"שיעורי הבית שהכנתי"
  }[value]||"כלי האימון";
}

export function publicStudioPath(path){
  return ["/share/","/recruit/","/substitute/","/train/"].some(prefix=>path.startsWith(prefix));
}
