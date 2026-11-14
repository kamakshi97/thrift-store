const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const vm = require('node:vm');

test('dashboard uses both services and reports failures', async (t) => {
  let received;
  let receivedItem;
  let users = [{ id: 1, email: 'test@example.com', full_name: '<Stylist & Co>', role: 'Manager' }];
  let items = [{ id: 2, name: '<Jacket>', category: 'Coats', color: 'Blue & White', stock: 5 }];
  const userService = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(users));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      received = { path: req.url, body: JSON.parse(body) };
      res.setHeader('Content-Type', 'application/json');
      if (received.body.email === 'duplicate@example.com') {
        res.writeHead(400).end(JSON.stringify({ detail: 'Email already registered' }));
      } else if (req.url === '/users/999') {
        res.writeHead(404).end(JSON.stringify({ detail: 'User not found' }));
      } else {
        if (req.method === 'PUT') users = [{ id: 1, ...received.body }];
        res.writeHead(200).end('{}');
      }
    });
  });
  const inventoryService = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      res.end(JSON.stringify(items));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      receivedItem = { path: req.url, body: JSON.parse(body) };
      if (req.url === '/items/999') {
        res.writeHead(404).end(JSON.stringify({ detail: 'Item not found' }));
        return;
      }
      if (req.method === 'PUT') items = [{ id: 2, ...receivedItem.body }];
      res.end('{}');
    });
  });
  await new Promise(resolve => userService.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => inventoryService.listen(0, '127.0.0.1', resolve));
  t.after(() => userService.close());
  t.after(() => inventoryService.close());
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${userService.address().port}`;
  process.env.INVENTORY_SERVICE_URL = `http://127.0.0.1:${inventoryService.address().port}`;

  const app = require('./server');
  const frontend = await new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  t.after(() => frontend.close());
  const url = `http://127.0.0.1:${frontend.address().port}/submit-user`;
  const submit = email => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, full_name: 'Test Stylist', role: 'Manager' }),
    redirect: 'manual'
  });

  const success = await submit('test@example.com');
  assert.equal(success.status, 302);
  assert.equal(success.headers.get('location'), '/?userAdded=1');
  assert.deepEqual(received, {
    path: '/users',
    body: { email: 'test@example.com', full_name: 'Test Stylist', role: 'Manager' }
  });

  const page = await fetch(`http://127.0.0.1:${frontend.address().port}${success.headers.get('location')}`);
  const html = await page.text();
  assert.match(html, /&lt;Stylist &amp; Co&gt;/);
  assert.match(html, /&lt;Jacket&gt;/);
  assert.match(html, /Blue &amp; White \(Stock: 5\)/);
  assert.doesNotMatch(html, /<Stylist & Co>|<Jacket>/);
  assert.match(html, /action="\/edit-user\/1"/);
  assert.match(html, /value="&lt;Stylist &amp; Co&gt;"/);
  assert.match(html, /value="Manager" selected/);
  assert.match(html, /action="\/edit-item\/2"/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const alerts = [];
  let replacement;
  const window = {
    location: { href: page.url },
    history: { replaceState: (state, title, url) => { replacement = url.href; } },
    alert: message => alerts.push(message)
  };
  vm.runInNewContext(script, { window, URL });
  assert.deepEqual(alerts, ['User added successfully!']);
  assert.equal(replacement, `http://127.0.0.1:${frontend.address().port}/`);
  window.location.href = replacement;
  vm.runInNewContext(script, { window, URL });
  assert.equal(alerts.length, 1);

  const item = await fetch(`http://127.0.0.1:${frontend.address().port}/submit-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name: 'Jacket', category: 'Coats', color: 'Blue', stock: '5' }),
    redirect: 'manual'
  });
  assert.equal(item.status, 302);
  assert.equal(item.headers.get('location'), '/?itemAdded=1');
  assert.deepEqual(receivedItem, {
    path: '/items',
    body: { name: 'Jacket', category: 'Coats', color: 'Blue', stock: '5' }
  });
  window.location.href = `http://127.0.0.1:${frontend.address().port}${item.headers.get('location')}`;
  vm.runInNewContext(script, { window, URL });
  assert.deepEqual(alerts, ['User added successfully!', 'Item added successfully!']);

  const edit = (path, body) => fetch(`http://127.0.0.1:${frontend.address().port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    redirect: 'manual'
  });
  const userEdit = await edit('/edit-user/1', {
    email: 'updated@example.com', full_name: 'Updated Stylist', role: 'Member'
  });
  assert.equal(userEdit.status, 302);
  assert.equal(userEdit.headers.get('location'), '/?userUpdated=1');
  assert.deepEqual(received, {
    path: '/users/1',
    body: { email: 'updated@example.com', full_name: 'Updated Stylist', role: 'Member' }
  });
  const itemEdit = await edit('/edit-item/2', {
    name: 'Updated Item', category: 'Dresses', color: 'Green', stock: '0'
  });
  assert.equal(itemEdit.status, 302);
  assert.equal(itemEdit.headers.get('location'), '/?itemUpdated=1');
  assert.deepEqual(receivedItem, {
    path: '/items/2',
    body: { name: 'Updated Item', category: 'Dresses', color: 'Green', stock: '0' }
  });
  const editedHtml = await (await fetch(`http://127.0.0.1:${frontend.address().port}/`)).text();
  assert.match(editedHtml, /Updated Stylist/);
  assert.match(editedHtml, /Updated Item/);
  assert.match(editedHtml, /Stock: 0/);
  for (const [flag, message] of [
    ['userUpdated', 'User updated successfully!'],
    ['itemUpdated', 'Item updated successfully!']
  ]) {
    window.location.href = `http://127.0.0.1:${frontend.address().port}/?${flag}=1`;
    vm.runInNewContext(script, { window, URL });
    assert.equal(alerts.at(-1), message);
    const count = alerts.length;
    window.location.href = replacement;
    vm.runInNewContext(script, { window, URL });
    assert.equal(alerts.length, count);
  }
  const duplicateEdit = await edit('/edit-user/1', {
    email: 'duplicate@example.com', full_name: 'Rejected', role: 'Member'
  });
  assert.equal(duplicateEdit.status, 400);
  assert.equal(await duplicateEdit.text(), 'Email already registered');
  for (const [path, body, message] of [
    ['/edit-user/999', { email: 'missing@example.com', full_name: 'Missing' }, 'User not found'],
    ['/edit-item/999', { name: 'Missing', category: 'Coats', color: 'Blue', stock: '1' }, 'Item not found']
  ]) {
    const missing = await edit(path, body);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), message);
  }

  users = [];
  items = [];
  const emptyPage = await (await fetch(`http://127.0.0.1:${frontend.address().port}/`)).text();
  assert.match(emptyPage, /No stylists registered yet/);
  assert.match(emptyPage, /No clothing items yet/);

  const duplicate = await submit('duplicate@example.com');
  assert.equal(duplicate.status, 400);
  assert.equal(await duplicate.text(), 'Email already registered');

  await new Promise(resolve => userService.close(resolve));
  const unavailable = await submit('test@example.com');
  assert.equal(unavailable.status, 502);
  assert.equal(await unavailable.text(), 'Could not create user');

  items = [{ name: 'Available item', category: 'Coats', color: 'Blue', stock: 1 }];
  const partialPage = await (await fetch(`http://127.0.0.1:${frontend.address().port}/`)).text();
  assert.match(partialPage, /Unable to load stylists/);
  assert.match(partialPage, /Available item/);

  await new Promise(resolve => inventoryService.close(resolve));
  const failedItem = await fetch(`http://127.0.0.1:${frontend.address().port}/submit-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name: 'Jacket', category: 'Coats', color: 'Blue', stock: '5' })
  });
  assert.equal(failedItem.status, 502);
  assert.equal(await failedItem.text(), 'Could not create item');
  for (const [path, message] of [
    ['/edit-user/1', 'Could not update user'],
    ['/edit-item/2', 'Could not update item']
  ]) {
    const failedEdit = await edit(path, {});
    assert.equal(failedEdit.status, 502);
    assert.equal(await failedEdit.text(), message);
  }
  const unavailablePage = await (await fetch(`http://127.0.0.1:${frontend.address().port}/`)).text();
  assert.match(unavailablePage, /Unable to load stylists/);
  assert.match(unavailablePage, /Unable to load inventory/);
});
