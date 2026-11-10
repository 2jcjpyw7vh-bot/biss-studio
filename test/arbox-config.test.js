import test from "node:test";
import assert from "node:assert/strict";
import {arboxConfiguration} from "../lib/arbox-config.js";

test("Arbox integration stays disabled without official credentials",()=>assert.equal(arboxConfiguration({}).configured,false));
test("Arbox integration rejects unofficial and insecure hosts",()=>{
 assert.equal(arboxConfiguration({ARBOX_API_V3_BASE_URL:"http://api.arboxapp.com",ARBOX_API_KEY:"x"}).configured,false);
 assert.equal(arboxConfiguration({ARBOX_API_V3_BASE_URL:"https://arbox.example.com",ARBOX_API_KEY:"x"}).configured,false);
});
test("Arbox integration accepts an approved HTTPS Arbox host without exposing the key",()=>{
 const result=arboxConfiguration({ARBOX_API_V3_BASE_URL:"https://api.arboxapp.com/v3",ARBOX_API_KEY:"secret"});
 assert.equal(result.configured,true);assert.equal(result.host,"api.arboxapp.com");assert.equal("apiKey" in result,false);
});

