import Link from "next/link";
import {sessionPlaylist} from "../../lib/program-session";

export function ProgramPlaylist({program, session}) {
  const {musicUrl, musicTitle} = sessionPlaylist(program, session);
  if (!musicUrl) return null;
  return <a className="btn" href={musicUrl} target="_blank" rel="noreferrer">פתיחת פלייליסט · {musicTitle}</a>;
}

export default function ProgramSessionDetails({program, session}) {
  return <>
    <ProgramPlaylist program={program} session={session}/>
    {session.items?.map((item, index) => <div className="workout-item" key={index}>
      <strong>{item.he}</strong>
      <div>{item.prescription}</div>
      {item.cue && <div className="small">{item.cue}</div>}
      {item.id && <Link className="btn" href={`/exercise/${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer">פתיחת תרגיל</Link>}
    </div>)}
  </>;
}
