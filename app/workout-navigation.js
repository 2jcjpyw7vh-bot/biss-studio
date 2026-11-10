"use client";

let departure;

export function rememberWorkout(draft, exerciseId) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", "workout");
  window.history.replaceState(null, "", url);
  departure = { draft, exerciseId };
}

export function workoutDraft() {
  return departure?.draft;
}

export function canReturnToWorkout(exerciseId) {
  return departure?.exerciseId === exerciseId;
}
