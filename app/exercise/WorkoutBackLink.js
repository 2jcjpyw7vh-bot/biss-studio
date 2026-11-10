"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { canReturnToWorkout } from "../workout-navigation";

export default function WorkoutBackLink({ exerciseId }) {
  const router = useRouter();

  return <Link className="btn v26-back-btn" href="/?tab=workout" replace onNavigate={event => {
    if (canReturnToWorkout(exerciseId)) {
      event.preventDefault();
      router.back();
    }
  }}>← חזרה לאימון</Link>;
}
