-- ==========================================
-- MYSQL ADATBÁZIS STRUKTÚRA ÉS BEÁLLÍTÁSOK
-- ==========================================

-- Adatbázis létrehozása (ha még nincs)
CREATE DATABASE IF NOT EXISTS webshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE webshop;

-- 1. Kategóriák tábla
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- Alapértelmezett kategóriák feltöltése
INSERT IGNORE INTO categories (name) VALUES ('Ing'), ('Zakó'), ('Nadrág'), ('Cipő');

-- 2. Termékek tábla
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  image VARCHAR(255),
  category_id INT,
  description TEXT,
  stock INT DEFAULT 10,
  size_stocks JSON,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Mintatermékek betöltése
INSERT IGNORE INTO products (id, name, price, image, category_id, description, stock, size_stocks) VALUES
(1, 'Fehér elegáns ing', 8990, 'shirt1.jpg', 1, 'Prémium minőségű pamut ing, alkalmi és hétköznapi viseletre is.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(2, 'Kék lezser ing', 7990, 'shirt2.jpg', 1, 'Kényelmes viselet, ideális hétvégi programokhoz.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(3, 'Kockás flanel ing', 9990, 'shirt3.jpg', 1, 'Meleg és stílusos, tökéletes választás hűvösebb napokra.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(4, 'Fekete zakó', 24990, 'jacket1.jpg', 2, 'Modern szabású, karcsúsított zakó elegáns eseményekre.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(5, 'Szürke sportzakó', 21990, 'jacket2.jpg', 2, 'Elegáns, mégis könnyed megjelenést biztosít.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(6, 'Sötétkék blézer', 26990, 'jacket3.jpg', 2, 'Klasszikus darab, amely minden ruhatár alapja.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(7, 'Kék farmer nadrág', 12990, 'pants1.jpg', 3, 'Kényelmes, strapabíró farmer nadrág mindennapi használatra.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(8, 'Bézs chino nadrág', 11990, 'pants2.jpg', 3, 'Elegáns és kényelmes, tökéletes irodai viselet.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(9, 'Fekete szövetnadrág', 14990, 'pants3.jpg', 3, 'Hivatalos eseményekre ajánlott, prémium anyagból.', 10, '{"S": 2, "M": 3, "L": 3, "XL": 2}'),
(10, 'Férfi bőr cipő', 19990, 'shoes1.jpg', 4, 'Valódi bőrből készült, kényelmes talpbetéttel rendelkező cipő.', 10, '{"40": 2, "41": 3, "42": 3, "43": 2}'),
(11, 'Fehér sportcipő', 15990, 'shoes2.jpg', 4, 'Trendi és kényelmes, mindennapi rohangáláshoz.', 10, '{"40": 2, "41": 3, "42": 3, "43": 2}'),
(12, 'Futócipő', 18990, 'shoes3.jpg', 4, 'Könnyű szerkezet, kiváló ütéscsillapítás sportoláshoz.', 10, '{"40": 2, "41": 3, "42": 3, "43": 2}');

-- 3. Felhasználók tábla (Supabase Auth helyett)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alapértelmezett admin (jelszó: admin123 - bcrypt hash-elve kell majd, de ide most csak a szerkezet kell)
-- A register route fogja megfelelően kezelni.

-- 4. Rendelések tábla
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_email VARCHAR(255),
  total_price INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_method VARCHAR(100),
  payment_method VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Rendelt tételek tábla
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  product_name VARCHAR(255) NOT NULL,
  size VARCHAR(50),
  price INT NOT NULL,
  quantity INT DEFAULT 1,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
