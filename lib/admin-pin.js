import crypto from "crypto";
import {promisify} from "util";
import {supabaseAdmin} from "./supabase.js";
import {studioProfileFromRequest} from "./studio-auth.js";

const scrypt=promisify(crypto.scrypt);
const safeEqual=(a,b)=>{const A=Buffer.from(String(a||"")),B=Buffer.from(String(b||""));return A.length===B.length&&crypto.timingSafeEqual(A,B)};

export async function hashAdminPin(pin){
 const salt=crypto.randomBytes(16).toString("hex");
 const derived=await scrypt(String(pin),salt,64);
 return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPinHash(pin,stored){
 const[method,salt,expected]=String(stored||"").split("$");
 if(method!=="scrypt"||!salt||!expected)return false;
 const derived=await scrypt(String(pin),salt,64);
 return safeEqual(Buffer.from(derived).toString("hex"),expected);
}

export async function verifyAdminPin(req){
 const db=supabaseAdmin();
 if(db&&req.headers.get("authorization")){
  const {profile}=await studioProfileFromRequest(req,db);
  if(profile?.role==="manager")return true;
 }
 const candidate=req.headers.get("x-admin-pin")||"";
 if(!candidate)return false;
 if(db){
  const{data}=await db.from("biss_admin_settings").select("setting_value").eq("setting_key","admin_pin_hash").maybeSingle();
  if(data?.setting_value)return verifyPinHash(candidate,data.setting_value);
 }
 return Boolean(process.env.ADMIN_PIN)&&safeEqual(candidate,process.env.ADMIN_PIN);
}

export async function replaceAdminPin(db,pin,profileId){
 const setting_value=await hashAdminPin(pin);
 const{error}=await db.from("biss_admin_settings").upsert({setting_key:"admin_pin_hash",setting_value,updated_at:new Date().toISOString(),updated_by:profileId},{onConflict:"setting_key"});
 if(error)throw error;
}
