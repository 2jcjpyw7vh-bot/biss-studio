export function loginTarget(value) {
  if (["arbox","my-sessions","my-visits","account"].includes(value)) return value;
  return /^(?:build-task|visit):[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value || "") ? value : "";
}

export function loginDestination(target, role) {
  if(target==="my-visits"&&role==="trainee")return "/my-visits";
  if(loginTarget(target).startsWith("visit:")&&role==="trainee")return `/my-visits?visit=${target.slice(6)}`;
  if (loginTarget(target).startsWith("build-task:") && ["manager", "instructor"].includes(role)) {
    return `/?buildTask=${target.slice(11)}`;
  }
  if (target === "arbox" && role === "manager") return "/?tab=integrations";
  if (target === "my-sessions" && (role === "manager" || role === "instructor")) return "/my-sessions";
  return "";
}
