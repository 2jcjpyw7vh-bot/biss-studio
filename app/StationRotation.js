import {stationPlaces,stationRotationText} from "../lib/station-rotation";

export default function StationRotation({workout}) {
  const places=stationPlaces(workout.stationRotation);
  if(!places.length)return null;
  const participants=Number(workout.meta?.match(/(?:^|·)\s*(\d+)\s+משתתפ/)?.[1])||null;
  return <details className="safe">
    <summary><strong>שיבוץ פתיחה וסדר מעבר</strong> · {places.length} מקומות</summary>
    <p className="small">{stationRotationText(workout.stationRotation)}</p>
    <ol>
      {places.map(({station,label},index)=><li key={label}>
        <strong>תחנה <bdi>{label}</bdi></strong> · {workout.exercises?.[station-1]?.he || "תרגיל בתחנה"}
        {participants!==null&&<div className="small">{index<participants?`משתתפת ${index+1} מתחילה כאן`:"פנוי בתחילת האימון"}</div>}
      </li>)}
    </ol>
  </details>;
}
