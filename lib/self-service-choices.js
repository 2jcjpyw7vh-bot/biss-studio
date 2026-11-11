export function approvedSessionChoices(sessions, areasByExercise={}) {
  return (Array.isArray(sessions)?sessions:[]).flatMap((session,index)=>{
    const items=Array.isArray(session?.items)?session.items.filter(item=>item?.he):[];
    if(!items.length)return [];
    const areas=[...new Set(items.map(item=>item.region||areasByExercise[item.id]).filter(Boolean))];
    const equipment=[...new Set(items.map(item=>item.equipment).filter(Boolean))];
    return [{index,session,areas,equipment}];
  });
}

export function matchingApprovedSessions(choices,area,equipment) {
  return choices.filter(choice=>(!area||choice.areas.includes(area))&&
    (!equipment||choice.equipment.includes(equipment)));
}
