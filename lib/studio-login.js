export function loginTarget(value) {
  if (value === "arbox" || value === "my-sessions") return value;
  return /^build-task:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value || "") ? value : "";
}

export function loginDestination(target, role) {
  if (loginTarget(target).startsWith("build-task:") && ["manager", "instructor"].includes(role)) {
    return `/?buildTask=${target.slice(11)}`;
  }
  if (target === "arbox" && role === "manager") return "/?tab=integrations";
  if (target === "my-sessions" && (role === "manager" || role === "instructor")) return "/my-sessions";
  return "";
}
