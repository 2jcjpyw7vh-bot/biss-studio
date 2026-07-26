"use client";
import {useEffect,useState} from "react";
export default function ExerciseMedia({exercise,youtube}){
  const [videoUrl,setVideoUrl]=useState(exercise.videoUrl||"");
  const [loading,setLoading]=useState(!exercise.videoUrl);
  useEffect(()=>{
    if(exercise.videoUrl){setLoading(false);return}
    let live=true;
    fetch(`/api/exercise-video?exercise=${encodeURIComponent(exercise.en||exercise.he)}&id=${encodeURIComponent(exercise.id)}`)
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{if(live&&d.videoUrl)setVideoUrl(d.videoUrl)})
      .catch(()=>{})
      .finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[exercise.id,exercise.en,exercise.he,exercise.videoUrl]);
  return <div className="v26-media">
    <div className="v26-media-badge">BISS MOVEMENT</div>
    {videoUrl?<iframe src={videoUrl} title={`${exercise.he} - ${exercise.en}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{width:"100%",minHeight:"360px",border:"0",borderRadius:"22px"}}/>
    :exercise.imageUrl?<img src={exercise.imageUrl} alt={`${exercise.he} - ${exercise.en}`} style={{width:"100%",minHeight:"360px",objectFit:"cover",borderRadius:"22px"}}/>
    :<><div className="v26-media-mark">{loading?"…":"▶"}</div><div><strong>{exercise.he}</strong><span>{exercise.en}</span></div><a href={youtube} target="_blank" rel="noreferrer" className="v26-media-link">{loading?"מחפש סרטון הדגמה…":"פתח סרטון הדגמה ↗"}</a></>}
  </div>;
}
