const ignoredWords=new Set(["a","an","the","and","with","without","using","for","of","to","from","on","at","de","exercise","tutorial","technique","proper","form"]);
const words=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);

export function selectExerciseVideo(items,exercise) {
  const exerciseWords=words(exercise);
  const qualifiers=exerciseWords.filter(word=>word==="trx"||word==="pilates");
  const terms=[...new Set([...exerciseWords.filter(word=>!ignoredWords.has(word)).slice(-2),...qualifiers])];
  if(!terms.length)return null;
  const candidates=(Array.isArray(items)?items:[]).filter(item=>{
    const titleWords=new Set(words(item.snippet?.title));
    return /^[A-Za-z0-9_-]{11}$/.test(item.id?.videoId||"")&&terms.every(term=>titleWords.has(term));
  });
  return candidates.find(item=>/how to|proper form|tutorial|technique/i.test(item.snippet?.title||""))||candidates[0]||null;
}
