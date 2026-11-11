import {stationRotationText} from "../lib/station-rotation";

export default function StationRotation({rotation}) {
  const text=stationRotationText(rotation);
  return text?<p className="safe">{text}</p>:null;
}
