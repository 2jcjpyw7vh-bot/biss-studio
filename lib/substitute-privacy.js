export function publicSubstituteOffer(offer={}){
  const session=offer.biss_sessions||{};
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
      playlist_url:offer.show_workout===true?(session.playlist_url||""):"",
    },
  };
}

