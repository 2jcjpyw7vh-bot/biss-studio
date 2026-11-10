export function loginTarget(value) {
  return value === "arbox" || value === "my-sessions" ? value : "";
}

export function loginDestination(target, role) {
  if (target === "arbox" && role === "manager") return "/?tab=integrations";
  if (target === "my-sessions" && (role === "manager" || role === "instructor")) return "/my-sessions";
  return "";
}
