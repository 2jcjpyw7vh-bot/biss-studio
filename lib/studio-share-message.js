const invitation = {
  workout:"מצורף אימון מ־BISS Studio. בקישור מחכים התרגילים וההנחיות לאימון.",
  program:"התוכנית שלך מ־BISS Studio מוכנה. בקישור אפשר לעבור על האימונים לפי הסדר.",
  homework:"הכנו לך תרגול להמשך בבית. בקישור מחכים התרגילים וההנחיות.",
  exercise:"מצורף תרגיל מספריית BISS Studio, עם דגשים והדגמה כשיש סרטון.",
  substitute:"נשמח לבדוק אם מתאים לך להחליף ב־BISS Studio. בקישור אפשר לראות את מועד האימון ולהשיב להצעה.",
  recruitment:"נשמח להכיר מדריכות שמעוניינות להצטרף אלינו להחלפות. בקישור אפשר לראות את המועדים והתנאים ולהגיש מועמדות."
};

export function studioShareMessage(type, title, url) {
  return [
    "היי,",
    invitation[type],
    title,
    url,
    "צוות BISS Studio"
  ].filter(Boolean).join("\n\n");
}
