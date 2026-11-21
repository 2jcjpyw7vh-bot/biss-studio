"use client";
import {programDraftKey,readProgramDraft,programReturnPath} from '../lib/program-draft';
let memory;
export function rememberProgram(value,session){
 const record={...value,at:Date.now()};memory=record;
 const key=programDraftKey(value.owner,value.taskId);
 try{if(key)sessionStorage.setItem(key,JSON.stringify(record));}catch{/* Browser cache can be disabled; keep memory fallback. */}
 window.history.replaceState(null,'',programReturnPath(value.taskId,session));
}
export function recalledProgram(context){
 const key=programDraftKey(context.owner,context.taskId);
 if(!key)return null;
 try{const value=readProgramDraft(sessionStorage.getItem(key),context);if(value)return value;}catch{}
 return readProgramDraft(JSON.stringify(memory),context);
}
