"use client";

import {createContext,useContext,useEffect,useState} from "react";
import {supabaseBrowser} from "../lib/supabase-browser";

const StudioSessionContext=createContext({user:null,status:"loading",message:""});

export function useStudioSession(){return useContext(StudioSessionContext);}

export default function StudioSession({children}){
  const [session,setSession]=useState(undefined);
  const [user,setUser]=useState(null);
  const [status,setStatus]=useState("loading");
  const [message,setMessage]=useState("");
  const [attempt,setAttempt]=useState(0);
  const client=supabaseBrowser();

  useEffect(()=>{
    if(!client){setStatus("unavailable");return;}
    let active=true;
    client.auth.getSession().then(({data,error})=>{
      if(!active)return;
      if(error){setStatus("error");setMessage("לא ניתן לבדוק את החיבור כרגע.");return;}
      setSession(data.session);
    }).catch(()=>{if(active){setStatus("error");setMessage("לא ניתן לבדוק את החיבור כרגע.");}});
    const {data}=client.auth.onAuthStateChange((_event,nextSession)=>{
      if(active)setSession(nextSession);
    });
    return()=>{active=false;data.subscription.unsubscribe();};
  },[client]);

  useEffect(()=>{
    if(session===undefined)return;
    const controller=new AbortController();
    setUser(null);
    setMessage("");
    if(!session){setStatus("signed-out");return;}
    setStatus("loading");
    async function load(){
      const response=await fetch("/api/me",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store",signal:controller.signal});
      const result=await response.json();
      if(controller.signal.aborted)return;
      if(!response.ok)throw Error(result.error||"לא ניתן לאמת את החשבון כרגע.");
      setUser(result.user);
      setStatus("connected");
    }
    load().catch(error=>{if(!controller.signal.aborted){setStatus("error");setMessage(error.message||"לא ניתן לאמת את החיבור כרגע.");}});
    return()=>controller.abort();
  },[session===undefined,session?.access_token,attempt]);

  async function signOut(){
    const {error}=await client.auth.signOut({scope:"local"});
    if(error){setMessage("היציאה נכשלה. אפשר לנסות שוב.");return false;}
    setUser(null);
    setSession(null);
    setStatus("signed-out");
    return true;
  }

  return <StudioSessionContext.Provider value={{user,status,message,signOut,retry:()=>setAttempt(value=>value+1)}}>{children}</StudioSessionContext.Provider>;
}
