import test from 'node:test';
import assert from 'node:assert/strict';
import {farmShopUrl} from '../lib/farm-shop.js';
test('farm shop accepts public Arbox links and rejects admin, lookalikes and credentials',()=>{
 assert.equal(farmShopUrl('https://example.arboxapp.com/store'),'https://example.arboxapp.com/store');
 for(const url of ['http://example.arboxapp.com/store','https://manage.arboxapp.com/settings','https://arboxapp.com.evil.example/store','https://user:password@example.arboxapp.com/store','https://example.arboxapp.com/store?api_key=secret','javascript:alert(1)'])assert.equal(farmShopUrl(url),'');
});
