import {taskWorkoutTypes} from "./workout-task.js";
import {programPlaylistUrl,spotifyPlaylistUrl} from "./program-session.js";

export function studioPlaylistType(value) {
  return typeof value==="string"&&Object.hasOwn(taskWorkoutTypes,value)?value:"";
}

export function studioPlaylistUrl(value) {
  const normalized=programPlaylistUrl(value);
  if(!normalized)return "";
  const url=new URL(normalized);
  if(url.protocol!=="https:"||url.username||url.password)return "";
  return url.hostname==="open.spotify.com"?spotifyPlaylistUrl(normalized):url.href;
}

export function studioPlaylistEntry(value) {
  const workout_type=studioPlaylistType(value?.type);
  const url=studioPlaylistUrl(value?.url);
  const title=typeof value?.title==="string"?value.title.trim().slice(0,120):"";
  return workout_type&&url&&title?{workout_type,url,title}:null;
}

export function studioPlaylistsForType(db,type) {
  return db.from("biss_studio_playlists").select("id,title,url")
    .eq("workout_type",type).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50);
}
