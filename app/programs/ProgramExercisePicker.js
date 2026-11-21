"use client";
import {useState} from 'react';
import {matchesBodyRegion,UPPER_BODY,LOWER_BODY} from '../../lib/workout-structure';
import {exerciseFamily,programPrescription} from '../../lib/program-selection';
export default function ProgramExercisePicker({item,items,library,onPick}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[region,setRegion]=useState(''),[equipment,setEquipment]=useState('');
 const candidates=library.filter(x=>x.id!==item.id&&x.goal==='חיזוק'&&matchesBodyRegion(x.region,region?[region]:[])&&(!equipment||x.equipment===equipment)&&`${x.he} ${x.en}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="program-picker"><button className="btn" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'סגירת בחירת חלופה':'בחירת חלופה מהספרייה'}</button>{open&&<div className="safe"><div className="filters"><label className="field">חיפוש תרגיל<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="field">אזור גוף<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">כל האזורים</option>{[UPPER_BODY,LOWER_BODY,...new Set(library.map(x=>x.region))].map(x=><option key={x}>{x}</option>)}</select></label><label className="field">ציוד<select value={equipment} onChange={e=>setEquipment(e.target.value)}><option value="">כל הציוד הזמין</option>{[...new Set(library.map(x=>x.equipment))].map(x=><option key={x}>{x}</option>)}</select></label></div><p className="small">מוצגים תרגילי חיזוק עם ציוד זמין לכמות המתאמנים. בדקי התאמה אישית, עומס וחזרות לאחר ההחלפה. השינוי דורש שמירה מחדש של התוכנית.</p><p role="status">{candidates.length} חלופות מתאימות לחיפוש</p>{candidates.slice(0,12).map(x=>{
 const duplicate=items.some(other=>other.id!==item.id&&exerciseFamily(other)===exerciseFamily(x));
 return <div className="program-picker-option" key={x.id}><strong>{x.he}</strong><span>{x.region} · {x.equipment}</span>{duplicate&&<p className="notice">כבר קיימת באימון וריאציה מאותה משפחת תרגיל.</p>}<button className="btn" type="button" disabled={items.some(other=>other.id===x.id)} onClick={()=>{onPick({...x,prescription:programPrescription(x)});setOpen(false);}}>בחירת {x.he}</button></div>;
 })}{candidates.length>12&&<p>אפשר לצמצם את הרשימה בחיפוש או בסינון.</p>}</div>}</div>;
}
