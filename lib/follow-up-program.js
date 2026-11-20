import {studioPlaylistType} from './studio-playlists.js';
import {programPlaylistUrl} from './program-session.js';
import {taskBrief} from './workout-task-notice.js';
const clean=(v,n=300)=>String(v||'').trim().slice(0,n);
export const safeProgram=value=>({type:studioPlaylistType(value?.type),title:clean(value?.title,180),meta:clean(value?.meta,400),musicUrl:programPlaylistUrl(value?.musicUrl),musicTitle:clean(value?.musicTitle,120),sessions:Array.isArray(value?.sessions)?value.sessions.slice(0,60).map(session=>({type:studioPlaylistType(session?.type),name:clean(session?.name,120),progression:clean(session?.progression,80),musicUrl:programPlaylistUrl(session?.musicUrl),musicTitle:clean(session?.musicTitle,120),items:Array.isArray(session?.items)?session.items.slice(0,20).map(item=>({id:clean(item?.id,100),he:clean(item?.he,120),en:clean(item?.en,120),equipment:clean(item?.equipment,120),region:clean(item?.region,80),prescription:clean(item?.prescription,180),cue:clean(item?.cue,300)})):[]})):[]});
export function followUpDraftError(profile,task,program){
 if(!profile||profile.status!=='active'||!['manager','instructor'].includes(profile.role)||profile.id!==task?.instructor_id)return 'רק המדריכה המשויכת יכולה לשמור את טיוטת התוכנית.';
 if(!taskBrief(task.frame))return 'נדרש תדריך מאומת לסדרת ששת המפגשים.';
 if(!Array.isArray(program?.sessions)||program.sessions.length!==5||program.sessions.some(s=>!s.items?.length||s.items.some(i=>!i.he)))return 'תוכנית ההמשך צריכה לכלול 5 אימונים, עם תרגילים בכל אימון.';
 return '';
}
export function followUpApprovalError(task,customerId,coachId,confirmed,now=Date.now()){
 const brief=taskBrief(task?.frame);
 if(!brief||brief.customerId!==customerId||task.instructor_id!==coachId||!task.frame.follow_up?.program)return 'התוכנית אינה תואמת ללקוח ולמדריכה של המשימה.';
 const end=Date.parse(task.starts_at)+Number(task.frame.duration)*60000;
 if(!confirmed||!Number.isFinite(end)||end>now)return 'אפשר לפרסם את התוכנית רק לאחר סיום מפגש ההתאמה ואישור המנהל שהוא הושלם.';
 return '';
}
