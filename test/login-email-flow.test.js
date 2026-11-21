import test from 'node:test';import assert from 'node:assert/strict';
import {resendWait,pendingLoginKey,pendingLoginRequest,loginFlowError} from '../lib/login-email-flow.js';
test('email resend countdown prevents rapid repeated requests and expires',()=>{
 const now=1000000;assert.equal(resendWait(now,now),60);assert.equal(resendWait(now,now+1001),59);assert.equal(resendWait(now,now+60000),0);assert.equal(resendWait(0,now),0);
});
test('pending email step restores only the same bounded destination and recent request',()=>{
 const value={email:'coach@example.com',target:'my-sessions',sentAt:1000000};const raw=JSON.stringify(value);
 assert.deepEqual(pendingLoginRequest(raw,'my-sessions',1000001),value);
 assert.equal(pendingLoginRequest(raw,'arbox',1000001),null);
 assert.equal(pendingLoginRequest(raw,'my-sessions',2000000),null);
 assert.equal(pendingLoginRequest('invalid','my-sessions'),null);
 assert.equal(pendingLoginKey('https://evil.example'),pendingLoginKey(''));
});
test('provider throttling is never mislabeled as an incorrect code',()=>{
 assert.match(loginFlowError({status:429},'verify'),/יותר מדי בקשות/);
 assert.match(loginFlowError({code:'over_email_send_rate_limit'},'send'),/יותר מדי בקשות/);
 assert.match(loginFlowError({code:'otp_expired'},'verify'),/מהמייל האחרון/);
});
