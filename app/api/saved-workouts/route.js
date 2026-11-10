import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { studioProfileFromRequest } from "../../../lib/studio-auth";
import { canAccessInstructorArea } from "../../../lib/studio-permissions";
import { studioWorkoutFields } from "../../../lib/studio-workout-payload";

export const dynamic = "force-dynamic";
const reply = (body, status = 200) => NextResponse.json(body, {status, headers:{"Cache-Control":"no-store"}});

async function withLibrary(req, action) {
  const db = supabaseAdmin();
  if (!db) return reply({error:"שירות Studio אינו מחובר"}, 503);
  const {profile, error, status} = await studioProfileFromRequest(req, db);
  if (error) return reply({error}, status);
  if (!canAccessInstructorArea(profile)) return reply({error:"הספרייה האישית מיועדת לצוות ההדרכה"}, 403);
  return action(db.from("biss_saved_workouts"), profile.id);
}

export async function GET(req) {
  return withLibrary(req, async (library, owner) => {
    const {data, error} = await library.select("id,workout_payload,saved_at").eq("owner_id", owner).order("saved_at", {ascending:false});
    if (error) return reply({error:"לא ניתן לטעון אימונים שנשמרו"}, 503);
    return reply({workouts:data});
  });
}

export async function POST(req) {
  return withLibrary(req, async (library, owner) => {
    const body = await req.json().catch(() => null);
    const fields = studioWorkoutFields(body?.workout);
    if (!fields || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
      return reply({error:"לא התקבל אימון תקין לשמירה"}, 400);
    }
    const {error} = await library.upsert({owner_id:owner, id:body.id, workout_payload:fields.workout_payload}, {onConflict:"owner_id,id"});
    if (error) return reply({error:"האימון לא נשמר. אפשר לנסות שוב."}, 503);
    return reply({id:body.id});
  });
}
