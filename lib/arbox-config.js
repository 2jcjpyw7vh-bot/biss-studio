const officialBaseUrl = "https://arboxserver.arboxapp.com/api/public/v3";
const previewLimit = 20;

export function arboxConfiguration(env = process.env) {
  const baseUrl = String(env.ARBOX_API_V3_BASE_URL || officialBaseUrl).trim().replace(/\/$/, "");
  const hasKey = Boolean(String(env.ARBOX_API_KEY || "").trim());
  const validHost = baseUrl === officialBaseUrl;

  return {
    configured: validHost && hasKey,
    validHost,
    hasKey,
    host: validHost ? new URL(officialBaseUrl).hostname : "",
    version: "v3",
  };
}

function scheduleWindow(now, days) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem" }).format(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days - 1);
  return { from_date: today, to_date: end.toISOString().slice(0, 10) };
}

function arboxRequest(env, request, path) {
  return request(`${officialBaseUrl}/${path}`, {
    headers: { Accept: "application/json", "api-key": env.ARBOX_API_KEY.trim() },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(6000),
  });
}

export async function checkArboxConnection(env = process.env, request = fetch, now = new Date()) {
  if (!arboxConfiguration(env).configured) return null;

  const scheduleQuery = new URLSearchParams({ ...scheduleWindow(now, 2), limit: "1" });
  const check = async (path) => {
    try {
      const response = await arboxRequest(env, request, path);
      await response.body?.cancel().catch(() => {});
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, status: null };
    }
  };

  const [locations, schedule] = await Promise.all([
    check("locations?limit=1"),
    check(`schedule?${scheduleQuery}`),
  ]);
  return { locations, schedule };
}

function readCount(value) {
  if (!/^\d+$/.test(String(value ?? ""))) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : null;
}

function readTime(value) {
  if (typeof value !== "string" || !/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return "";
  const [hour, minute] = value.split(":");
  return `${hour.padStart(2,"0")}:${minute}`;
}

export async function readArboxSchedule(env = process.env, request = fetch, now = new Date()) {
  if (!arboxConfiguration(env).configured) return { error: "not_configured" };
  const range = scheduleWindow(now, 7);
  const query = new URLSearchParams({
    ...range, limit: String(previewLimit), sort: "asc", registration_count: "1", registration_details: "0",
  });
  try {
    const response = await arboxRequest(env, request, `schedule?${query}`);
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return { error: response.status === 401 || response.status === 403 ? "access_denied" : "unavailable" };
    }
    const data = response.status === 204 ? [] : (await response.json())?.data;
    if (!Array.isArray(data)) return { error: "unexpected_response" };
    const lessons = data.slice(0, previewLimit).flatMap(row => {
      const date = row?.date;
      const start = readTime(row?.start_time);
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < range.from_date || date > range.to_date || !start) return [];
      return [{
        date, start, end: readTime(row.end_time),
        name: String(row.session_name || "").trim().slice(0, 120) || "שיעור ללא שם",
        location: String(row.location_name || "").trim().slice(0, 100),
        capacity: readCount(row.max_participants),
        registrations: readCount(row.registration_count),
        cancelled: ["1","true","cancelled","canceled"].includes(String(row.cancelled_status || "").trim().toLowerCase()),
      }];
    }).sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
    return { from: range.from_date, to: range.to_date, lessons, limited: data.length >= previewLimit, skipped: Math.min(data.length, previewLimit) - lessons.length };
  } catch {
    return { error: "unavailable" };
  }
}
