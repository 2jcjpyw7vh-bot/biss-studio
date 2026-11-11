export function intervalTimerPosition({work,rest,sets},elapsedMs) {
  const workMs=work*1000;
  const cycle=(work+rest)*1000;
  const total=cycle*(sets-1)+workMs;
  const elapsed=Math.max(0,elapsedMs);
  if(elapsed>=total)return {phase:"done",set:sets,seconds:0,phaseAge:elapsed-total};
  const set=Math.floor(elapsed/cycle)+1;
  const offset=elapsed%cycle;
  const working=offset<workMs;
  return {
    phase:working?"work":"rest",
    set,
    seconds:Math.ceil(((working?workMs:cycle)-offset)/1000),
    phaseAge:working?offset:offset-workMs
  };
}
