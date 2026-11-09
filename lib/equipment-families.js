export const EQUIPMENT_FAMILIES={
  dumbbells:{label:"משקולות יד",aliases:["משקולות יד"]},
  kettlebells:{label:"קטלבל",aliases:["קטלבל"]},
  barbells:{label:"מוט משקולת",aliases:["מוט משקולת","בר"]},
  bands:{label:"גומיות",aliases:["גומיות התנגדות","גומיות עם ידיות","גומיות ירכיים"]},
  balls:{label:"כדורים",aliases:["כדורי משקולת 1 ק״ג","כדורי פיזיו","אוברבול"]},
  balance:{label:"ציוד שיווי משקל",aliases:["בוסו","פיתה שיווי משקל"]},
  pilates:{label:"ציוד פילאטיס",aliases:["קוביות פילאטיס","מזרני פילאטיס"]},
  recovery:{label:"ציוד התאוששות",aliases:["גלילי פילאטיס"]},
  cardio:{label:"ציוד אירובי",aliases:["מדרגה"]},
  anchors:{label:"נקודות עיגון",aliases:["נקודת עגינה","נקודת עיגון"]},
  other:{label:"אחר",aliases:[]}
};

export const EQUIPMENT_CATEGORY_OPTIONS=Object.entries(EQUIPMENT_FAMILIES).map(([value,family])=>({value,label:family.label}));

const normalized=value=>String(value||"").trim().toLowerCase();

export function equipmentFamily(itemOrLabel,inventory=[]){
  if(itemOrLabel&&typeof itemOrLabel==="object"&&itemOrLabel.category)return itemOrLabel.category;
  const label=normalized(typeof itemOrLabel==="string"?itemOrLabel:itemOrLabel?.name_he);
  const item=inventory.find(x=>normalized(x.name_he)===label);
  if(item?.category)return item.category;
  for(const [key,family] of Object.entries(EQUIPMENT_FAMILIES)){
    if(family.aliases.some(alias=>label.includes(normalized(alias))))return key;
  }
  return label==="ללא ציוד"?"bodyweight":"other";
}

export function exerciseEquipmentLabel(label,inventory=[]){
  const family=equipmentFamily(label,inventory);
  return EQUIPMENT_FAMILIES[family]?.label||label;
}

export function equipmentCapacity(label,inventory=[]){
  if(label==="ללא ציוד")return Number.POSITIVE_INFINITY;
  const family=equipmentFamily(label,inventory);
  const familyItems=inventory.filter(item=>item.active!==false&&equipmentFamily(item,inventory)===family);
  if(familyItems.length)return familyItems.reduce((sum,item)=>sum+Number(item.quantity||0),0);
  const exact=inventory.find(item=>item.active!==false&&normalized(item.name_he)===normalized(label));
  return exact?Number(exact.quantity||0):0;
}

export function availableExerciseEquipment(exercises=[],inventory=[]){
  const activeFamilies=new Set(inventory.filter(x=>x.active!==false&&Number(x.quantity||0)>0).map(x=>equipmentFamily(x,inventory)));
  const labels=new Set(["ללא ציוד"]);
  for(const exercise of exercises){
    const family=equipmentFamily(exercise.equipment,inventory);
    if(family==="bodyweight"||activeFamilies.has(family))labels.add(exerciseEquipmentLabel(exercise.equipment,inventory));
  }
  return [...labels];
}

