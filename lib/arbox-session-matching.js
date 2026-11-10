const localDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone:"Asia/Jerusalem", year:"numeric", month:"2-digit", day:"2-digit",
  hour:"2-digit", minute:"2-digit", hourCycle:"h23",
});

function studioStart(value) {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? localDateTime.format(instant) : "";
}

const titleKey = value=>String(value || "").normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();

export function matchArboxSessions(lessons, studioSessions, linkedSessions) {
  const byArboxId = new Map(linkedSessions.map(session=>[String(session.arbox_session_id),session]));
  const arboxCounts = new Map();
  for (const lesson of lessons) {
    if (lesson.cancelled || !lesson.scheduleId || byArboxId.has(lesson.scheduleId)) continue;
    const key = `${lesson.date} ${lesson.start} ${titleKey(lesson.name)}`;
    arboxCounts.set(key,(arboxCounts.get(key)||0)+1);
  }
  const byStart = new Map();
  for (const session of studioSessions) {
    const time = studioStart(session.starts_at);
    if (!time) continue;
    const matches = byStart.get(time) || [];
    matches.push(session);
    byStart.set(time,matches);
  }

  return lessons.map(({scheduleId,...lesson})=>{
    const time = `${lesson.date} ${lesson.start}`;
    const linked = byArboxId.get(scheduleId);
    if (linked) return {...lesson,match:studioStart(linked.starts_at)===time ? "linked" : "linked_time_changed"};
    if (lesson.cancelled) return {...lesson,match:"cancelled"};
    if (!scheduleId) return {...lesson,match:"missing_id"};

    const simultaneous = byStart.get(time) || [];
    const candidates = simultaneous.filter(session=>!session.arbox_session_id && titleKey(session.title)===titleKey(lesson.name));
    if (candidates.length>1 || (candidates.length && arboxCounts.get(`${time} ${titleKey(lesson.name)}`)>1)) {
      return {...lesson,match:"ambiguous"};
    }
    if (candidates.length===1) return {...lesson,match:"possible"};
    if (simultaneous.length) return {...lesson,match:"same_time"};
    return {...lesson,match:"unmatched"};
  });
}
