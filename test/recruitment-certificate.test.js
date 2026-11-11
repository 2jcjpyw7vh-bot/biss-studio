import test from "node:test";
import assert from "node:assert/strict";
import {certificateExtension,certificateFormat} from "../lib/recruitment-certificate.js";

test("only supported certificate signatures get a download type",()=>{
  assert.equal(certificateFormat(Buffer.from("%PDF-1.7")).mime,"application/pdf");
  assert.equal(certificateFormat(Uint8Array.of(255,216,255)).mime,"image/jpeg");
  assert.equal(certificateFormat(Uint8Array.of(137,80,78,71,13,10,26,10)).mime,"image/png");
  assert.equal(certificateFormat(Buffer.from("<svg>")),null);
  assert.equal(certificateFormat(Uint8Array.of(137,80,78,71)),null);
  assert.equal(certificateExtension("application/pdf"),"pdf");
  assert.equal(certificateExtension("text/html"),undefined);
});
