import test from "node:test";
import assert from "node:assert/strict";
import {studioPlaylistEntry,studioPlaylistType,studioPlaylistUrl} from "../lib/studio-playlists.js";

test("shared playlists validate the type and normalize duplicate Spotify share links",()=>{
  const url="https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk";
  assert.deepEqual(studioPlaylistEntry({type:"bone-strength",title:"  אימון בוקר  ",url:url+"?si=123"}),{
    workout_type:"bone-strength",title:"אימון בוקר",url
  });
  assert.equal(studioPlaylistEntry({type:"bone-strength",title:" ",url}),null);
  assert.equal(studioPlaylistEntry({type:"toString",title:"x",url}),null);
  assert.equal(studioPlaylistType(""),"");
  assert.equal(studioPlaylistUrl("https://music.example.com/playlist/123"),"https://music.example.com/playlist/123");
  assert.equal(studioPlaylistUrl("javascript:alert(1)"),"");
  assert.equal(studioPlaylistUrl("https://user:pass@music.example.com/playlist/123"),"");
});
