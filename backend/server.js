const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Kapcsolati medence (Pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE ---

// Felhasználó hitelesítése JWT alapján
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Nincs hitelesítési token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Érvénytelen vagy lejárt token' });
  }
}

// Admin jogosultság ellenőrzése
async function isAdmin(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Nincs admin jogosultságod' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba az ellenőrzéskor' });
  }
}

// --- AUTH API ROUTES ---

// Regisztráció
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Hiányzó adatok' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    res.status(201).json({ message: 'Sikeres regisztráció!', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ez az e-mail már foglalt' });
    res.status(500).json({ error: 'Hiba a regisztráció során' });
  }
});

// Bejelentkezés
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Hiányzó adatok' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Hibás e-mail vagy jelszó' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a bejelentkezés során' });
  }
});

// --- API ROUTES ---

// 1. TERMÉKEK (Products)
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Termék nem található' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { name, price, image, category_id, description, stock, size_stocks } = req.body;
    const [result] = await pool.query(
      'INSERT INTO products (name, price, image, category_id, description, stock, size_stocks) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, price, image, category_id, description, stock, JSON.stringify(size_stocks || {})]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { name, price, image, category_id, description, stock, size_stocks } = req.body;
    await pool.query(
      'UPDATE products SET name=?, price=?, image=?, category_id=?, description=?, stock=?, size_stocks=? WHERE id=?',
      [name, price, image, category_id, description, stock, JSON.stringify(size_stocks || {}), req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateUser, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Termék törölve' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. KATEGÓRIÁK (Categories)
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. RENDELÉSEK (Orders)
app.post('/api/orders', authenticateUser, async (req, res) => {
  const { items, shipping_method, payment_method, customer_name, customer_phone, customer_address, user_email } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let totalPrice = 0;
    const orderItems = [];

    // 1. Árak ellenőrzése és készlet validálása
    for (const item of items) {
      const [products] = await connection.query('SELECT price, name, stock, size_stocks FROM products WHERE id = ?', [item.id]);
      const product = products[0];

      if (!product) throw new Error(`Termék nem található: ${item.id}`);
      
      totalPrice += product.price * item.quantity;
      orderItems.push({
        product_id: item.id,
        product_name: product.name,
        size: item.size,
        price: product.price,
        quantity: item.quantity
      });

      // Készlet levonása
      let newStock = product.stock - item.quantity;
      let newSizeStocks = product.size_stocks || {};
      if (item.size && newSizeStocks[item.size] !== undefined) {
        newSizeStocks[item.size] -= item.quantity;
      }

      await connection.query('UPDATE products SET stock = ?, size_stocks = ? WHERE id = ?', [newStock, JSON.stringify(newSizeStocks), item.id]);
    }

    // 2. Szállítási díj számítása
    let shippingFee = 0;
    if (totalPrice < 10000) {
      shippingFee = shipping_method === 'home' ? 1500 : 990;
    }
    totalPrice += shippingFee;

    // 3. Rendelés mentése
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, user_email, total_price, shipping_method, payment_method, customer_name, customer_phone, customer_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, user_email, totalPrice, shipping_method, payment_method, customer_name, customer_phone, customer_address]
    );
    const orderId = orderResult.insertId;

    // 4. Rendelt tételek mentése
    for (const oi of orderItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, product_name, size, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, oi.product_id, oi.product_name, oi.size, oi.price, oi.quantity]
      );
    }

    await connection.commit();
    res.json({ id: orderId });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/orders/my', authenticateUser, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    
    for (let order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.order_items = items;
    }
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authenticateUser, isAdmin, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    
    for (let order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.order_items = items;
    }
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', authenticateUser, isAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ id: req.params.id, status: req.body.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. ADMIN STATS
app.get('/api/admin/stats', authenticateUser, isAdmin, async (req, res) => {
  try {
    const [data] = await pool.query('SELECT total_price, user_email FROM orders');

    const totalRevenue = data.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const totalOrders = data.length;
    const totalCustomers = new Set(data.map(o => o.user_email)).size;

    res.json({ totalRevenue, totalOrders, totalCustomers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PROFIL (Profile)
app.get('/api/profile', authenticateUser, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, phone, address, is_admin FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Profil nem található' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', authenticateUser, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await pool.query(
      'UPDATE users SET name=?, phone=?, address=? WHERE id=?',
      [name, phone, address, req.user.id]
    );
    res.json({ message: 'Profil frissítve' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Szerver fut a http://localhost:${PORT} címen`);
  
  // Teszteljük az adatbázis kapcsolatot indításkor
  try {
    await pool.query('SELECT 1');
    console.log('Sikeres adatbázis kapcsolat!');
  } catch (err) {
    console.error('HIVA: Nem sikerült csatlakozni az adatbázishoz!', err.message);
  }
});
