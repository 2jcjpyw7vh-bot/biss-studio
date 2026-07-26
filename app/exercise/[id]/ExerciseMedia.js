"use client";

import {useEffect,useState} from "react";

export default function ExerciseMedia({exercise,youtube}){
  const [autoVideo,setAutoVideo]=useState("");
  const videoUrl=exercise.videoUrl||autoVideo;
  const imageUrl=exercise.imageUrl||"";

  useEffect(()=>{
    if(exercise.videoUrl)return;

    let cancelled=false;

    fetch(`/api/exercise-video?exercise=${encodeURIComponent(exercise.en||exercise.he)}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(!cancelled&&d?.videoUrl){
          setAutoVideo(d.videoUrl);
        }
      })
      .catch(()=>{});

    return()=>{
      cancelled=true;
    };
  },[exercise.videoUrl,exercise.en,exercise.he]);

  return (
    <div className="v26-media v27-media">
      <div className="v26-media-badge">BISS MOVEMENT</div>

      {videoUrl ? (
        <iframe
          src={videoUrl}
          title={`${exercise.he} - ${exercise.en}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width:"100%",
            minHeight:"360px",
            border:"0",
            borderRadius:"22px"
          }}
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={`${exercise.he} - ${exercise.en}`}
          style={{
            width:"100%",
            minHeight:"360px",
            objectFit:"cover",
            borderRadius:"22px"
          }}
        />
      ) : (
        <>
          <div className="v26-media-mark">▶</div>

          <div>
            <strong>{exercise.he}</strong>
            <span>{exercise.en}</span>
          </div>

          <a
            href={youtube}
            target="_blank"
            rel="noreferrer"
            className="v26-media-link"
          >
            פתח סרטון הדגמה ↗
          </a>
        </>
      )}
    </div>
  );
}
