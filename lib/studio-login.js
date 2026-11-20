export function loginTarget(value) {
  if(/^participant:[a-f0-9]{64}$/.test(value||''))return value;
  if (["arbox","my-sessions","my-visits","account","operations"].includes(value)) return value;
  return /^(?:build-task|visit|activity):[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value || "") ? value : "";
}

export function loginDestination(target, role) {
  if(/^participant:[a-f0-9]{64}$/.test(target||'')&&['manager','instructor','operator','trainee'].includes(role))return `/join/${target.slice(12)}`;
  if(target==="my-visits"&&["manager","instructor","trainee","operator"].includes(role))return "/my-visits";
  if(loginTarget(target).startsWith("visit:")&&["manager","instructor","trainee","operator"].includes(role))return `/my-visits?visit=${target.slice(6)}`;
  if(target==="operations"&&["manager","instructor","operator"].includes(role))return "/operations";
  if(loginTarget(target).startsWith("activity:")&&["manager","instructor","operator"].includes(role))return `/operations?job=${target.slice(9)}`;
  if (loginTarget(target).startsWith("build-task:") && ["manager", "instructor"].includes(role)) {
    return `/?buildTask=${target.slice(11)}`;
  }
  if (target === "arbox" && role === "manager") return "/?tab=integrations";
  if (target === "my-sessions" && (role === "manager" || role === "instructor")) return "/my-sessions";
  return "";
}
// Staff can also be customers: a generic login must show a choice instead of forcing work mode.
export function loginEntryDestination(target,role){
  return loginDestination(target,role)||(!target&&role==='trainee'?'/my-visits':'');
}

// A link is a destination, not a reason to replace an already verified session.
// The account hint only selects UX; server-side authorization remains mandatory.
export function existingLoginAction(profileId,expectedAccount,switchRequested=false){
 if(!profileId)return 'authenticate';
 if(switchRequested)return 'choose';
 if(expectedAccount&&expectedAccount!==profileId)return 'other-account';
 return 'reuse';
}
