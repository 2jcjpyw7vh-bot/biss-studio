import {recruitmentPay,shekels} from "../../lib/recruitment";

export default function RecruitmentPayment({terms,ids}) {
  if(!ids.length)return null;
  const pay=recruitmentPay(terms.slots,ids,terms.travelSingle,terms.travelMultiple);
  return <p className="safe">
    אימונים {shekels(pay.workouts)} · נסיעות {shekels(pay.travel)} ({pay.visits} הגעות) · <strong>סה״כ {shekels(pay.total)}</strong>
  </p>;
}
