import {workoutTimeline} from "../lib/workout-structure";

export default function WorkoutTiming({workout}) {
  const timing = workoutTimeline(workout);
  if (!timing) return null;
  const parts = [
    ["חימום",timing.warm],
    ["חלק מרכזי",timing.main],
    ["מעבר בין בלוקים",timing.transition],
    ["פינישר",timing.finisher],
    ["שחרור",timing.cool]
  ];
  return <p className="small" aria-label="חלוקת זמן האימון">
    {parts.filter(([,minutes])=>minutes>0).map(([label,minutes])=>`${label} ${minutes} דק׳`).join(" · ")}
  </p>;
}
