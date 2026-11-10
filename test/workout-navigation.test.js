import test from "node:test";
import assert from "node:assert/strict";
import { canReturnToWorkout, rememberWorkout, workoutDraft } from "../app/workout-navigation.js";

test("opening a workout exercise retains its unsaved workout in the current tab", () => {
  assert.equal(workoutDraft(), undefined);
  assert.equal(canReturnToWorkout("exercise-1"), false);

  const draft = { workout: { exercises: [{ id: "exercise-1" }] }, minutes: 45 };
  let replacement;
  globalThis.window = {
    location: { href: "https://studio.example/?tab=builder" },
    history: { replaceState: (_state, _title, url) => { replacement = url; } },
  };
  try {
    rememberWorkout(draft, "exercise-1");
    assert.equal(replacement.href, "https://studio.example/?tab=workout");
    assert.equal(workoutDraft(), draft);
    assert.equal(canReturnToWorkout("exercise-1"), true);
    assert.equal(canReturnToWorkout("alternative-1"), false);

    rememberWorkout(draft, "alternative-1");
    assert.equal(workoutDraft(), draft);
    assert.equal(canReturnToWorkout("alternative-1"), true);
    assert.equal(canReturnToWorkout("exercise-1"), false);
  } finally {
    delete globalThis.window;
  }
});
