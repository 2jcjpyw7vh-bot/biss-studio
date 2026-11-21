import {matchesBodyRegion,UPPER_BODY,LOWER_BODY} from './workout-structure.js';
import {variedExerciseOrder} from './workout-variation.js';

// A variation is not a new movement family for the purpose of a short session.
export function exerciseFamily(exercise){
 const name=`${exercise.en||''} ${exercise.he||''}`.toLowerCase();
 const families=[['deadlift',/deadlift|דדליפט|romanian/],['squat',/squat|סקוואט|sit.to.stand|קימה מכיסא/],['lunge',/lunge|מכרע/],['row',/\brow\b|חתירה/],['bridge',/bridge|גשר|hip thrust/],['curl',/biceps? curl|כפיפת מרפק/],['chest-press',/chest press|bench press|לחיצת חזה/],['shoulder-press',/shoulder press|overhead press|לחיצת כתפ/],['push-up',/push.?up|press.up|שכיבת סמיכה|דחיפה מול קיר/],['plank',/plank|פלאנק/]];
 return families.find(([,pattern])=>pattern.test(name))?.[0]||`exercise:${exercise.id}`;
}
export function programPrescription(exercise,week=1,index=0){
 const name=`${exercise.en||''} ${exercise.he||''}`.toLowerCase();
 const staticHold=(exercise.pattern||'').toLowerCase()==='plank'||(/plank|פלאנק|wall sit|ישיבת קיר/.test(name)&&!/jack|tap|reach|rotation|טפיח|נגיע|סיבוב/.test(name));
 if(staticHold)return '15–30 שנ׳ החזקה × 2–3 סטים · מנוחה לפי איכות הביצוע';
 return `${week<=2?10+index%3:8+index%3} חזרות${exercise.eachSide?' לכל צד':''} × ${week<=2?'3':'3–4'} סטים`;
}
export function programRegions(selected=[]){
 const choices=[...new Set(selected)].filter(x=>x&&x!=='הכל'&&x!=='כל הגוף');
 if(!choices.length)return [UPPER_BODY,LOWER_BODY,'ליבה'];
 return choices.filter(region=>![UPPER_BODY,LOWER_BODY].some(broad=>region!==broad&&choices.includes(broad)&&matchesBodyRegion(region,[broad])));
}
export function selectProgramExercises({pool,regions=[],count=6,previous=[],random=Math.random}){
 const targets=programRegions(regions);
 const ordered=variedExerciseOrder(pool,previous,random);
 const items=[],usedIds=new Set(),usedFamilies=new Set(),warnings=[];
 const coverage=targets.map(region=>({region,requested:0,selected:0,available:pool.filter(x=>matchesBodyRegion(x.region,[region])).length}));
 // Fixed quotas prevent a large upper-body pool from swallowing a lower/core request.
 for(let slot=0;slot<count;slot++){
   const target=coverage[slot%coverage.length];target.requested++;
   const candidates=ordered.filter(x=>matchesBodyRegion(x.region,[target.region])&&!usedIds.has(x.id)&&!usedFamilies.has(exerciseFamily(x)));
   const patterns=new Set(items.map(x=>x.pattern).filter(Boolean));
   const chosen=candidates.find(x=>!patterns.has(x.pattern))||candidates[0];
   if(!chosen)continue;
   items.push(chosen);target.selected++;usedIds.add(chosen.id);usedFamilies.add(exerciseFamily(chosen));
 }
 for(const target of coverage)if(target.selected<target.requested)warnings.push(`${target.region}: נמצאו ${target.selected} מתוך ${target.requested} תרגילים נבדלים שנדרשו. הרחיבי ציוד או התאימי את הבחירה; לא הוחלף אזור גוף באופן אוטומטי.`);
 return {items,coverage,warnings,complete:items.length===count};
}
