export function programDateError(start, end) {
  const validDate = value => {
    if (value == null || value === "") return true;
    if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(start) || !validDate(end)) return "יש להזין תאריכים תקינים.";
  if (start && end && end < start) return "תאריך הסיום צריך להיות ביום ההתחלה או אחריו.";
  return "";
}

export function programPlaylistUrl(value) {
  if (typeof value !== "string" || value.length > 500) return "";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function sessionPlaylist(program, session) {
  const ownUrl = programPlaylistUrl(session?.musicUrl);
  return ownUrl
    ? {musicUrl:ownUrl, musicTitle:session.musicTitle || "פלייליסט לאימון"}
    : {musicUrl:programPlaylistUrl(program?.musicUrl), musicTitle:program?.musicTitle || "פלייליסט לתוכנית"};
}

export function programSessionWorkout(program, session) {
  return {
    title:session.name,
    meta:session.progression,
    ...sessionPlaylist(program, session),
    exercises:session.items.map(({id, he, en, equipment, level, prescription, cue}) => ({
      id, he, en, equipment, level, prescription, cue
    }))
  };
}
