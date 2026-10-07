import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createFixtureServer,csp} from './server.mjs';

test('standalone server is loopback-bound, blocks egress/forms, and exposes only fixture assets',async () => {
  const server = createFixtureServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {address,port}=server.address();
  assert.equal(address,'127.0.0.1');
  const request = (path, method='GET', host=`127.0.0.1:${port}`) => new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path,method,headers:{host}},res=>{
      let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
    });req.on('error',reject);req.end();
  });
  try {
    for (const path of ['/','/fixture.js','/style.css']) {
      const response=await request(path); assert.equal(response.status,200);
      assert.equal(response.headers['content-security-policy'],csp);
      assert.ok(csp.includes("connect-src 'none'"));assert.ok(csp.includes("form-action 'none'"));
      assert.ok(!/https?:\/\//.test(response.body));
    }
    assert.equal((await request('/','POST')).status,403);
    assert.equal((await request('/','GET','outside.invalid')).status,403);
    assert.equal((await request('/../../package.json')).status,404);
    assert.equal((await request('/api/me')).status,404);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
