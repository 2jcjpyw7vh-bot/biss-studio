import {loginTarget} from './studio-login.js';
export function resendWait(sentAt,now=Date.now()){
 return Number.isFinite(sentAt)&&sentAt>0?Math.max(0,Math.min(60,Math.ceil((sentAt+60000-now)/1000))):0;
}
export function pendingLoginKey(target){return `biss:pending-login:v1:${loginTarget(target)}`;}
export function pendingLoginRequest(raw,target,now=Date.now()){
 try{const value=JSON.parse(raw);if(!value||value.target!==loginTarget(target)||typeof value.email!=='string'||!/^\S+@\S+\.\S+$/.test(value.email)||!Number.isFinite(value.sentAt)||value.sentAt>now+60000||now-value.sentAt>15*60000)return null;return {email:value.email,target:value.target,sentAt:value.sentAt};}catch{return null;}
}
export function loginFlowError(error,operation){
 if(error?.status===429||['over_request_rate_limit','over_email_send_rate_limit'].includes(error?.code))return 'נשלחו יותר מדי בקשות כרגע. המתיני כמה דקות לפני ניסיון נוסף. אם כבר הגיע מייל, אין צורך לבקש שוב ושוב.';
 return operation==='verify'?'הקוד לא אושר. בדקי שהעתקת את כל הספרות מהמייל האחרון שנשלח לכתובת שמופיעה כאן. קוד ישן או שכבר נוצל לא יאפשר כניסה.':'שליחת הקוד לא הושלמה. בדקי את הכתובת ונסי שוב מאוחר יותר.';
}
