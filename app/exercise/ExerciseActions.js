"use client";

export default function ExerciseActions({exercise}){
  const getUrl=()=>window.location.href;
  const text=()=>`${exercise.he} (${exercise.en}) · BISS\n${getUrl()}`;
  async function copy(){await navigator.clipboard.writeText(getUrl());alert("קישור התרגיל הועתק")}
  function whatsapp(){window.open(`https://wa.me/?text=${encodeURIComponent(text())}`,"_blank","noopener,noreferrer")}
  function email(){window.location.href=`mailto:?subject=${encodeURIComponent(exercise.he+" | BISS")}&body=${encodeURIComponent(text())}`}
  return <div className="row exercise-actions">
    <button className="btn green" onClick={whatsapp}>WhatsApp</button>
    <button className="btn blue" onClick={email}>מייל</button>
    <button className="btn" onClick={copy}>העתקת קישור</button>
  </div>;
}
