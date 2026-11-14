const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://127.0.0.1:8002';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:8001';
const STYLIST_TYPES = ['Personal stylist', 'Celebrity stylist', 'Hair and makeup stylist'];
const EDIT_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

async function loadList(url) {
  const response = await axios.get(url, { timeout: 5000 });
  if (!Array.isArray(response.data)) {
    throw new Error('Service returned an invalid list');
  }
  return response.data;
}

// Serve a modern, attractive UI dashboard
app.get('/', async (req, res) => {
  const [usersResult, itemsResult] = await Promise.allSettled([
    loadList(`${USER_SERVICE_URL}/users`),
    loadList(`${INVENTORY_SERVICE_URL}/items`)
  ]);
  if (usersResult.status === 'rejected') {
    console.error('Failed to load users:', usersResult.reason.message);
  }
  if (itemsResult.status === 'rejected') {
    console.error('Failed to load inventory:', itemsResult.reason.message);
  }
  const usersHtml = usersResult.status === 'rejected'
    ? '<li>Unable to load stylists. Please try again later.</li>'
    : usersResult.value.length === 0
      ? '<li>No stylists registered yet.</li>'
      : usersResult.value.map(user =>
        `<li><strong>${escapeHtml(user.full_name)}</strong><br><span>${escapeHtml(user.role)}</span>
          <details>
            <summary aria-label="Edit stylist" title="Edit stylist">${EDIT_ICON}</summary>
            <form action="/edit-user/${escapeHtml(user.id)}" method="POST">
              <label>Email Address:
                <input type="email" name="email" required value="${escapeHtml(user.email)}">
              </label>
              <label>Full Name:
                <input type="text" name="full_name" required value="${escapeHtml(user.full_name)}">
              </label>
              <label>Type:
                <select name="role">
                  ${[...STYLIST_TYPES, ...(!STYLIST_TYPES.includes(user.role) ? [user.role] : [])].map(role =>
                    `<option value="${escapeHtml(role)}"${role === user.role ? ' selected' : ''}>${escapeHtml(role)}</option>`
                  ).join('')}
                </select>
              </label>
              <button type="submit">Save stylist</button>
            </form>
          </details>
        </li>`
      ).join('');
  const itemsHtml = itemsResult.status === 'rejected'
    ? '<li>Unable to load inventory. Please try again later.</li>'
    : itemsResult.value.length === 0
      ? '<li>No clothing items yet.</li>'
      : itemsResult.value.map(item =>
        `<li><strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.category)} • ${escapeHtml(item.color)} (Stock: ${escapeHtml(item.stock)})</span>
          <details>
            <summary aria-label="Edit item" title="Edit item">${EDIT_ICON}</summary>
            <form action="/edit-item/${escapeHtml(item.id)}" method="POST">
              <label>Item Name:
                <input type="text" name="name" required value="${escapeHtml(item.name)}">
              </label>
              <label>Category:
                <input type="text" name="category" required value="${escapeHtml(item.category)}">
              </label>
              <label>Color:
                <input type="text" name="color" required value="${escapeHtml(item.color)}">
              </label>
              <label>Stock:
                <input type="number" name="stock" required value="${escapeHtml(item.stock)}">
              </label>
              <button type="submit">Save item</button>
            </form>
          </details>
        </li>`
      ).join('');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>StyleHub - An inventory for thrift store</title>
        <style>
            :root {
                --bg-color: #f3f8f6;
                --card-bg: #ffffff;
                --accent-primary: #087f6b;
                --accent-hover: #066553;
                --text-main: #20332e;
                --text-muted: #536960;
                --border-color: #d5e5dd;
            }
            body {
                background-color: var(--bg-color);
                color: var(--text-main);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 30px;
            }
            header {
                text-align: center;
                margin-bottom: 40px;
            }
            h1 {
                color: var(--accent-primary);
                font-size: 2.5rem;
                margin-bottom: 5px;
            }
            .subtitle {
                color: var(--text-muted);
                font-size: 1.1rem;
            }
            .container {
                display: flex;
                gap: 25px;
                justify-content: center;
                flex-wrap: wrap;
                max-width: 1400px;
                margin: 0 auto;
            }
            .card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 25px;
                width: 23%;
                min-width: 260px;
                box-shadow: 0 10px 15px -3px rgba(32, 51, 46, 0.08);
                box-sizing: border-box;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .card:hover {
                transform: translateY(-3px);
                box-shadow: 0 20px 25px -5px rgba(32, 51, 46, 0.12);
            }
            h3 {
                border-bottom: 2px solid var(--border-color);
                padding-bottom: 12px;
                margin-top: 0;
                color: var(--text-main);
                font-size: 1.25rem;
            }
            label {
                display: block;
                margin-top: 12px;
                font-size: 0.9rem;
                color: var(--text-muted);
            }
            input, select {
                width: 100%;
                padding: 10px;
                margin-top: 5px;
                background: #f8fbfa;
                border: 1px solid var(--border-color);
                color: var(--text-main);
                border-radius: 6px;
                box-sizing: border-box;
                font-size: 0.95rem;
            }
            input:focus, select:focus {
                outline: none;
                border-color: var(--accent-primary);
            }
            button {
                background: var(--accent-primary);
                color: white;
                border: none;
                padding: 12px;
                width: 100%;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
                margin-top: 20px;
                transition: opacity 0.2s;
            }
            button:hover {
                background: var(--accent-hover);
            }
            details {
                margin: 0;
            }
            summary {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                list-style: none;
                color: var(--accent-primary);
                cursor: pointer;
            }
            summary::-webkit-details-marker {
                display: none;
            }
            summary:hover {
                background: var(--bg-color);
            }
            details[open] {
                margin-top: 12px;
            }
            summary:focus-visible {
                outline: 2px solid var(--accent-primary);
                outline-offset: 3px;
            }
            ul {
                padding-left: 20px;
                margin-top: 15px;
            }
            li {
                position: relative;
                padding-right: 28px;
                margin-bottom: 16px;
                overflow-wrap: anywhere;
                color: var(--text-muted);
                font-size: 0.95rem;
            }
            li strong {
                color: var(--text-main);
            }
        </style>
    </head>
    <body>
        <header>
            <h1>StyleHub</h1>
            <div class="subtitle">An inventory for thrift store</div>
        </header>

        <div class="container">
            <!-- Column 1: Create Stylist -->
            <div class="card">
                <h3>Create Stylist</h3>
                <form action="/submit-user" method="POST">
                    <label>Email Address:</label>
                    <input type="email" name="email" required placeholder="coolgirl@stylehub.com">

                    <label>Full Name:</label>
                    <input type="text" name="full_name" required placeholder="Kansu Shetty">

                    <label>Type:</label>
                    <select name="role">
                        ${STYLIST_TYPES.map(type =>
                          `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`
                        ).join('')}
                    </select>

                    <button type="submit">Register Stylist</button>
                </form>
            </div>

            <!-- Column 2: Active Stylists List -->
            <div class="card">
                <h3>Active Stylists</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Registered staff directory from database.</p>
                <ul>
                    ${usersHtml}
                </ul>
            </div>

            <!-- Column 3: Add Clothing Item -->
            <div class="card">
                <h3>Add Clothing Item</h3>
                <form action="/submit-item" method="POST">
                    <label>Item Name:</label>
                    <input type="text" name="name" required placeholder="Silk saree">

                    <label>Category:</label>
                    <input type="text" name="category" required placeholder="Sarees">

                    <label>Color:</label>
                    <input type="text" name="color" required placeholder="Gold">

                    <label>Stock:</label>
                    <input type="number" name="stock" required value="">

                    <button type="submit">Add to Inventory</button>
                </form>
            </div>

            <!-- Column 4: Clothing Inventory List -->
            <div class="card">
                <h3>Clothing Inventory</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Live stock items tracked via microservices.</p>
                <ul>
                    ${itemsHtml}
                </ul>
            </div>
        </div>
        <script>
            const pageUrl = new URL(window.location.href);
            if (pageUrl.searchParams.get('userAdded') === '1') {
                pageUrl.searchParams.delete('userAdded');
                window.history.replaceState(null, '', pageUrl);
                window.alert('User added successfully!');
            }
            if (pageUrl.searchParams.get('itemAdded') === '1') {
                pageUrl.searchParams.delete('itemAdded');
                window.history.replaceState(null, '', pageUrl);
                window.alert('Item added successfully!');
            }
            if (pageUrl.searchParams.get('userUpdated') === '1') {
                pageUrl.searchParams.delete('userUpdated');
                window.history.replaceState(null, '', pageUrl);
                window.alert('User updated successfully!');
            }
            if (pageUrl.searchParams.get('itemUpdated') === '1') {
                pageUrl.searchParams.delete('itemUpdated');
                window.history.replaceState(null, '', pageUrl);
                window.alert('Item updated successfully!');
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/edit-user/:userId', async (req, res) => {
  try {
    await axios.put(`${USER_SERVICE_URL}/users/${encodeURIComponent(req.params.userId)}`, {
      email: req.body.email,
      full_name: req.body.full_name,
      role: req.body.role
    }, { timeout: 5000 });
    res.redirect('/?userUpdated=1');
  } catch (error) {
    console.error('Failed to update user:', error.message);
    const status = error.response?.status || 502;
    const detail = error.response?.data?.detail;
    res.status(status).type('text').send(
      typeof detail === 'string' ? detail : 'Could not update user'
    );
  }
});

app.post('/edit-item/:itemId', async (req, res) => {
  try {
    await axios.put(`${INVENTORY_SERVICE_URL}/items/${encodeURIComponent(req.params.itemId)}`, {
      name: req.body.name,
      category: req.body.category,
      color: req.body.color,
      stock: req.body.stock
    }, { timeout: 5000 });
    res.redirect('/?itemUpdated=1');
  } catch (error) {
    console.error('Failed to update item:', error.message);
    const status = error.response?.status || 502;
    const detail = error.response?.data?.detail;
    res.status(status).type('text').send(
      typeof detail === 'string' ? detail : 'Could not update item'
    );
  }
});

app.post('/submit-item', async (req, res) => {
  try {
    await axios.post(`${INVENTORY_SERVICE_URL}/items`, {
      name: req.body.name,
      category: req.body.category,
      color: req.body.color,
      stock: req.body.stock
    });
    res.redirect('/?itemAdded=1');
  } catch (error) {
    console.error('Failed to create item:', error.message);
    const status = error.response?.status || 502;
    const detail = error.response?.data?.detail;
    res.status(status).type('text').send(
      typeof detail === 'string' ? detail : 'Could not create item'
    );
  }
});

app.post('/submit-user', async (req, res) => {
  try {
    await axios.post(`${USER_SERVICE_URL}/users`, {
      email: req.body.email,
      full_name: req.body.full_name,
      role: req.body.role
    });
    res.redirect('/?userAdded=1');
  } catch (error) {
    console.error('Failed to create user:', error.message);
    const status = error.response?.status || 502;
    const detail = error.response?.data?.detail;
    res.status(status).type('text').send(
      typeof detail === 'string' ? detail : 'Could not create user'
    );
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Frontend service running on port ${PORT}`);
  });
}

module.exports = app;