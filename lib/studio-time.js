const israelTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone:"Asia/Jerusalem", year:"numeric", month:"2-digit", day:"2-digit",
  hour:"2-digit", minute:"2-digit", hourCycle:"h23",
});

export function studioLocalTimeToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) return null;
  const nominal = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(nominal)) return null;
  const format = time=>israelTime.format(time).replace(" ","T");
  const samples = [nominal-43200000,nominal+43200000];
  const candidates = [...new Set(samples.map(sample=>{
    const offset = Date.parse(`${format(sample)}:00Z`)-sample;
    return nominal-offset;
  }))].filter(time=>format(time)===value);
  return candidates.length===1 ? new Date(candidates[0]).toISOString() : null;
}
