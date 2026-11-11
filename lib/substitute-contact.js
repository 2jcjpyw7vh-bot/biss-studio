import {studioShareMessage} from "./studio-share-message.js";

export function whatsappNumber(value) {
  const raw=String(value||"").trim();
  if(!/^\+?[\d\s().-]+$/.test(raw))return "";
  let digits=raw.replace(/\D/g,"");
  if(!raw.startsWith("+")){
    if(digits.startsWith("00"))digits=digits.slice(2);
    else if(/^0\d{8,9}$/.test(digits))digits=`972${digits.slice(1)}`;
    else if(!digits.startsWith("972"))return "";
  }
  if(digits.startsWith("972")&&!/^972[1-9]\d{7,8}$/.test(digits))return "";
  return /^[1-9]\d{7,14}$/.test(digits)?digits:"";
}

export function substituteContactLinks(person,shareUrl) {
  const number=whatsappNumber(person?.phone);
  const address=String(person?.email||"").trim();
  const email=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)
    ? encodeURIComponent(address).replace("%40","@") : "";
  const subject="הצעת אימון מ־BISS Studio";
  const message=studioShareMessage("substitute","",shareUrl);
  return {
    number,email,
    whatsapp:`https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    mail:`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
  };
}
