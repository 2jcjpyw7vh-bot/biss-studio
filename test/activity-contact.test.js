import test from 'node:test';
import assert from 'node:assert/strict';
import {activityContact,assignedActivityContact,activityCustomerContacts,activityContactLinks} from '../lib/activity-contact.js';
const operator={id:'op',full_name:'Operator',role:'operator',status:'active',phone:'0540000000',email:'op@example.com',health:'private',auth_user_id:'private'};
const payer={id:'payer',full_name:'Payer',role:'trainee',status:'active',phone:'0520000000',email:'payer@example.com',health:'private'};
const visit={id:'visit',customer_id:'payer',status:'confirmed',title:'DJ visit',starts_at:'2026-11-22T10:00:00Z'};
const job={visit_id:'visit',assigned_id:'op',customer_id:'payer',kind:'dj',status:'draft'};
test('a customer receives only the current assigned active operational contact, without private fields',()=>{
 assert.deepEqual(Object.keys(assignedActivityContact(job,visit,operator)).sort(),['email','name','phone']);
 assert.equal(assignedActivityContact({...job,assigned_id:'replacement'},visit,operator),null);
 assert.equal(assignedActivityContact({...job,status:'cancelled'},visit,operator),null);
 assert.equal(assignedActivityContact(job,{...visit,status:'cancelled'},operator),null);
 assert.equal(assignedActivityContact(job,visit,{...operator,status:'inactive'}),null);
 assert.equal(assignedActivityContact({...job,kind:'self_workout'},visit,operator),null);
 assert.equal(assignedActivityContact(job,{...visit,id:'other'},operator),null);
});
test('an operator gets linked payer and accepted participants only, never another booking or an unaccepted guest',()=>{
 const guest={...payer,id:'guest',full_name:'Guest',phone:''};
 const rows=[{visit_id:'visit',user_id:'guest',status:'accepted',contact_phone:'972530000000'},{visit_id:'other',user_id:'other',status:'accepted'},{visit_id:'visit',user_id:'invited',status:'invited'}];
 const contacts=activityCustomerContacts(operator,job,visit,payer,rows,[guest]);
 assert.equal(contacts.length,2);assert.equal(contacts[1].phone,'972530000000');
 assert.equal(JSON.stringify(contacts).includes('private'),false);
 assert.deepEqual(activityCustomerContacts({...operator,id:'other'},job,visit,payer,rows,[guest]),[]);
 assert.deepEqual(activityCustomerContacts(operator,job,{...visit,customer_id:'new-payer'},payer,rows,[guest]),[]);
 assert.deepEqual(activityCustomerContacts(operator,{...job,status:'cancelled'},visit,payer,rows,[guest]),[]);
 assert.equal(activityCustomerContacts(operator,job,visit,payer,rows,[{...guest,status:'inactive'}]).length,1);
});
test('contact links target exactly the stored recipient with activity context and no financial/health data',()=>{
 const contact=activityContact(operator),links=activityContactLinks(contact,visit);
 const url=new URL(links.whatsapp);assert.equal(url.pathname,'/972540000000');
 assert.match(url.searchParams.get('text'),/DJ visit/);assert.match(url.searchParams.get('text'),/22/);
 assert.equal(links.tel,'tel:+972540000000');
 assert.equal(activityContact({...operator,phone:'javascript:alert(1)'}).phone,'');
 assert.equal(activityContact({...operator,status:'inactive'}),null);
 assert.equal(activityContactLinks({...contact,phone:'bad',email:'a\nb@example.com'},visit).mail,'');
 const mail=activityContactLinks({...contact,email:'a?subject=x@example.com'},visit).mail;
 assert.match(mail,/a%3Fsubject%3Dx@example.com\?subject=/);
});
