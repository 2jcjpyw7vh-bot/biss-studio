import {activitySourceMatches} from './activity-operations.js';
export function activityVisitState(job,source){
 if(job?.status!=='ready')return 'waiting';
 if(source?.error)return 'unverified';
 return activitySourceMatches(job,source?.lessons?.find(row=>row.scheduleId===job.arbox_schedule_id))?'ready':'changed';
}
