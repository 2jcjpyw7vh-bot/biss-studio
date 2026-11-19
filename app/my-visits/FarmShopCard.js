import {farmShopUrl} from '../../lib/farm-shop';
export default function FarmShopCard({url}){
 const href=farmShopUrl(url);
 return <section className="farm-shop-card" aria-labelledby="farm-shop-heading"><div><div className="eyebrow">ממש כאן, במשק</div><h2 id="farm-shop-heading">עוד קצת ביסס לביקור שלך</h2><p>יין, מוצרי המשק ופעילויות עונתיות — אפשר לבחור גם במהלך הביקור. קטיף פרחים יופיע בחנות כשהוא זמין.</p><p className="small">מה שכלול בהזמנה מופיע בכרטיס הביקור. תוספות נרכשות בנפרד בחנות.</p></div>
  <div className="farm-shop-action">{href?<a className="btn primary" href={href} target="_blank" rel="noopener noreferrer">לחנות המשק בארבוקס ↗</a>:<><button className="btn" disabled>חנות המשק — הקישור בהכנה</button><p className="small">אפשר לפנות לצוות לרכישה. ההזמנה האישית נשארת כאן.</p></>}</div>
 </section>;
}
