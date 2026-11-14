const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve a modern, attractive UI dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>StyleHub - Sustainable Fashion & Inventory Platform</title>
        <style>
            :root {
                --bg-color: #0f172a;
                --card-bg: #1e293b;
                --accent-primary: #10b981;
                --accent-hover: #059669;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --border-color: #334155;
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
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                box-sizing: border-box;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .card:hover {
                transform: translateY(-3px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
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
                background: #0f172a;
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                opacity: 0.9;
            }
            ul {
                padding-left: 20px;
                margin-top: 15px;
            }
            li {
                margin-bottom: 8px;
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
            <h1>✨ StyleHub</h1>
            <div class="subtitle">Cloud-Native Sustainable Fashion Inventory & Stylist Coordination Platform</div>
        </header>

        <div class="container">
            <!-- Column 1: Create Stylist -->
            <div class="card">
                <h3>👤 Create Stylist</h3>
                <form action="/submit-user" method="POST">
                    <label>Email Address:</label>
                    <input type="email" name="email" required placeholder="jane@stylehub.com">

                    <label>Full Name:</label>
                    <input type="text" name="full_name" required placeholder="Jane Doe">

                    <label>Role:</label>
                    <select name="role">
                        <option value="Member">Member</option>
                        <option value="Manager">Manager</option>
                    </select>

                    <button type="submit">Register Stylist</button>
                </form>
            </div>

            <!-- Column 2: Active Stylists List -->
            <div class="card">
                <h3>👥 Active Stylists</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Registered staff directory from database.</p>
                <ul>
                    <li><strong>Jane Doe</strong> <br><span style="font-size:0.8rem; color:#10b981;">Manager</span></li>
                    <li><strong>Alex Smith</strong> <br><span style="font-size:0.8rem; color:#94a3b8;">Member</span></li>
                </ul>
            </div>

            <!-- Column 3: Add Clothing Item -->
            <div class="card">
                <h3>👗 Add Clothing Item</h3>
                <form action="/submit-item" method="POST">
                    <label>Item Name:</label>
                    <input type="text" name="name" required placeholder="Vintage Denim Jacket">

                    <label>Category:</label>
                    <input type="text" name="category" required placeholder="Outerwear">

                    <label>Color:</label>
                    <input type="text" name="color" required placeholder="Indigo Blue">

                    <label>Initial Stock:</label>
                    <input type="number" name="stock" required value="15">

                    <button type="submit">Add to Inventory</button>
                </form>
            </div>

            <!-- Column 4: Clothing Inventory List -->
            <div class="card">
                <h3>📦 Clothing Inventory</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Live stock items tracked via microservices.</p>
                <ul>
                    <li><strong>Vintage Denim</strong> <br><span style="font-size:0.8rem; color:var(--text-muted);">Outerwear • Indigo (Stock: 15)</span></li>
                    <li><strong>Silk Wrap Dress</strong> <br><span style="font-size:0.8rem; color:var(--text-muted);">Dresses • Emerald (Stock: 8)</span></li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Frontend service running on port ${PORT}`);
});