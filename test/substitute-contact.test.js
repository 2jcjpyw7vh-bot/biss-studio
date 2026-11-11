import test from "node:test";
import assert from "node:assert/strict";
import {substituteContactLinks,whatsappNumber} from "../lib/substitute-contact.js";

test("WhatsApp destinations support Israeli local and international formats",()=>{
 for(const phone of ["050-123-4567","+972 (50) 123-4567","00972 50 1234567","972501234567"]){
  assert.equal(whatsappNumber(phone),"972501234567");
 }
 assert.equal(whatsappNumber("+1 (202) 555-0100"),"12025550100");
 assert.equal(whatsappNumber("0501234567 ext 2"),"");
 assert.equal(whatsappNumber("0501234567,0502222222"),"");
});

test("offer links prefill exactly one recipient when a contact is valid",()=>{
 const url="https://studio.example/substitute/token";
 const contact=substituteContactLinks({phone:"0501234567",email:"coach+studio@example.com"},url);
 assert.equal(new URL(contact.whatsapp).pathname,"/972501234567");
 assert.match(new URL(contact.whatsapp).searchParams.get("text"),/https:\/\/studio\.example/);
 assert.match(contact.mail,/^mailto:coach%2Bstudio@example\.com\?/);
 assert.equal(new URL(contact.mail).searchParams.get("body"),new URL(contact.whatsapp).searchParams.get("text"));
 assert.match(new URL(contact.mail).searchParams.get("body"),/^היי,\n\n.*BISS Studio/);
 const missing=substituteContactLinks({email:"one@example.com,two@example.com"},url);
 assert.match(missing.mail,/^mailto:\?/);
 assert.equal(new URL(missing.whatsapp).pathname,"/");
});
