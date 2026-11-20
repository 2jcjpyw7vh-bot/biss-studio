import {activityContactLinks} from '../lib/activity-contact';
export default function ActivityContactCard({contact,visit,direction='customer',title}){
 if(!contact)return null;
 const links=activityContactLinks(contact,visit,direction);
 return <section className="card activity-contact-card"><h3>{title||contact.label||'איש קשר להזמנה'}</h3><strong>{contact.name}</strong>{contact.phone&&<p><bdi>{contact.phone}</bdi></p>}<div className="row">{links.whatsapp&&<a className="btn green" href={links.whatsapp} target="_blank" rel="noreferrer">שליחת הודעה בוואטסאפ</a>}{links.tel&&<a className="btn" href={links.tel}>שיחת טלפון</a>}{!links.whatsapp&&links.mail&&<a className="btn" href={links.mail}>שליחת מייל</a>}</div>{links.whatsapp&&<p className="small">וואטסאפ ייפתח עם פרטי הפעילות בהודעה. שם לוחצים על שליחה.</p>}{!links.whatsapp&&!links.mail&&<p className="small">פרטי הקשר טרם הושלמו. יש לפנות לצוות הסטודיו.</p>}</section>;
}
