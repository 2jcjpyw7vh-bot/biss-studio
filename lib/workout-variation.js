export function variedExerciseOrder(items,previous=[],random=Math.random){
  const shuffled=[...items];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const prior=new Set(previous.map(item=>item.id));
  return shuffled.sort((a,b)=>Number(prior.has(a.id))-Number(prior.has(b.id)));
}
export function repeatedExerciseSet(current,previous){
  if(!current?.length||current.length!==previous?.length)return false;
  const ids=new Set(previous.map(item=>item.id));
  return current.every(item=>ids.has(item.id));
}
