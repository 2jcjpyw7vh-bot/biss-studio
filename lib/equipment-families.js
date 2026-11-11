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
export const anchorEquipmentKey=value=>normalized(value).replace(/עגינה/g,"עיגון").replace(/\s*[-–־]\s*/g," - ").replace(/\s+/g," ");
const longLoopBand="גומיות לופ ארוכות";

export function equipmentFamily(itemOrLabel,inventory=[]){
  const label=normalized(typeof itemOrLabel==="string"?itemOrLabel:itemOrLabel?.name_he);
  if(/^נקוד(?:ת|ות) עיגון(?:\s|$)/.test(anchorEquipmentKey(label)))return "anchors";
  if(label===longLoopBand)return "other";
  if(itemOrLabel&&typeof itemOrLabel==="object"&&itemOrLabel.category)return itemOrLabel.category;
  const item=inventory.find(x=>normalized(x.name_he)===label);
  if(item?.category)return item.category;
  for(const [key,family] of Object.entries(EQUIPMENT_FAMILIES)){
    if(family.aliases.some(alias=>label.includes(normalized(alias))))return key;
  }
  return label==="ללא ציוד"?"bodyweight":"other";
}

export function exerciseEquipmentLabel(label,inventory=[]){
  const family=equipmentFamily(label,inventory);
  if(family==="other"||family==="anchors")return label;
  return EQUIPMENT_FAMILIES[family]?.label||label;
}

export function equipmentCapacity(label,inventory=[]){
  if(label==="ללא ציוד")return Number.POSITIVE_INFINITY;
  const family=equipmentFamily(label,inventory);
  return inventory.reduce((sum,item)=>{
    const matches=family==="anchors"?anchorEquipmentKey(item.name_he)===anchorEquipmentKey(label):
      family==="other"?normalized(item.name_he)===normalized(label):equipmentFamily(item,inventory)===family;
    return item.active!==false&&matches?sum+Number(item.quantity||0):sum;
  },0);
}

export function availableExerciseEquipment(exercises=[],inventory=[]){
  const labels=new Set(["ללא ציוד"]);
  for(const exercise of exercises){
    if(equipmentCapacity(exercise.equipment,inventory)>0)labels.add(exerciseEquipmentLabel(exercise.equipment,inventory));
  }
  return [...labels];
}

