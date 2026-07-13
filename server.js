require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 10000;

// Security Hardening Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allows Bootstrap CDNs to render directly
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-local-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }
}));

// Neon Cloud PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true // Enforces strictly encrypted Neon SSL routes
    }
});

// Static Asset Pipeline Routing
app.use('/static', express.static(path.join(__dirname, 'static')));

// Database Table Seeding Logic for Neon Console Execution
async function seedDatabaseSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(64) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password VARCHAR(256) NOT NULL,
                role VARCHAR(20) DEFAULT 'customer'
            );
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(128) NOT NULL,
                sku VARCHAR(64) UNIQUE NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(64) NOT NULL,
                stock INT DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(120) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database schema validated successfully on Neon Cluster.");
    } catch (err) {
        console.error("Critical error building schemas on the cloud instance:", err);
    }
}
seedDatabaseSchema();

// --- BUSINESS LOGIC API ENDPOINTS ---

// Fetch Catalog Products
app.get('/api/products', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];
        
        if (category || search) {
            query += ' WHERE ';
            if (category) {
                query += 'category = $1';
                params.push(category);
            }
            if (search) {
                if (category) query += ' AND ';
                query += `name ILIKE $${params.length + 1}`;
                params.push(`%${search}%`);
            }
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to query catalog.' });
    }
});

// Process Incoming Contact Inquiries
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are strictly required.' });
    }
    try {
        await pool.query(
            'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)',
            [name, email, message]
        );
        res.status(200).json({ success: 'Inquiry cataloged successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Database storage execution failed.' });
    }
});

// --- CORE TEMPLATE ROUTING OVERLAYS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/index.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/products.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/contact.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'templates/auth/login.html')));

// Custom Fallback Catch-All Error Route Handling
app.use((req, res) => {
    res.status(404).send('<h1>404 Not Found</h1><p>The page requested could not be tracked.</p>');
});

app.listen(PORT, () => {
    console.log(`Server actively running on interface port: ${PORT}`);
});
