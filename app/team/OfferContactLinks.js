import {substituteContactLinks} from "../../lib/substitute-contact";

export default function OfferContactLinks({recipient,shareUrl}) {
  const contact=substituteContactLinks(recipient,shareUrl);
  return <>
    <a className="btn green" target="_blank" rel="noreferrer" href={contact.whatsapp}>
      {contact.number?"פתיחה ב־WhatsApp של המדריכה":"בחירת נמענת ב־WhatsApp"}
    </a>
    <a className="btn blue" href={contact.mail}>
      {contact.email?"פתיחת מייל למדריכה":"בחירת נמענת במייל"}
    </a>
  </>;
}
