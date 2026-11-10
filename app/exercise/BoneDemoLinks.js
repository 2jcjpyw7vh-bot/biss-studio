import Link from "next/link";

export default function BoneDemoLinks({demos}) {
  if (!demos?.length) return null;
  return <div className="safe">
    <strong>הדגמות חיזוק עצם</strong>
    <ul>{demos.map(({id, he})=><li key={id}><Link href={`/exercise/${encodeURIComponent(id)}`}>{he}</Link></li>)}</ul>
  </div>;
}
