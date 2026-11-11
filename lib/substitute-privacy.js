import {boneDemos} from "./bone-strength.js";

export function publicSubstituteOffer(offer={}){
  const session=offer.biss_sessions||{};
  const workout=offer.show_workout===true?session.workout_payload:null;
  const demos=boneDemos(workout);
  const exercises=Array.isArray(workout?.exercises)
    ? workout.exercises.slice(0,20).filter(item=>item?.id&&item?.he).map(({id,he})=>({id,he}))
    : [];
  return {
    id:offer.id,
    status:offer.status,
    message:offer.message||"",
    expires_at:offer.expires_at,
    show_workout:offer.show_workout===true,
    biss_sessions:{
      id:session.id,
      title:session.title,
      starts_at:session.starts_at,
      group_id:session.group_id,
      biss_groups:session.biss_groups?{name:session.biss_groups.name}:null,
      workout_summary:offer.show_workout===true?(session.workout_summary||""):"",
      ...(demos.length?{bone_demos:demos}:{}),
      ...(exercises.length?{exercises}:{}),
      playlist_url:offer.show_workout===true?(session.playlist_url||""):"",
    },
  };
}
