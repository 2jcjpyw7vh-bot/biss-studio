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
