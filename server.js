require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 10000;

// ==============================================================================
// 1. Security & Parsing Middlewares
// ==============================================================================
app.use(helmet({
    contentSecurityPolicy: false // Allows Bootstrap and FontAwesome CDNs to load seamlessly
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup for User/Staff Authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'prowear-solutions-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14 // 14 Days cookie lifecycle
    }
}));

// ==============================================================================
// 2. Static Asset Pipeline & Folder Routing (FIXED)
// ==============================================================================
// Serves static files directly from the root-level 'static' folder.
// This allows URLs like /css/style.css and /js/main.js to resolve perfectly.
app.use(express.static(path.join(__dirname, 'static')));

// ==============================================================================
// 3. Neon Cloud PostgreSQL Connection Pool
// ==============================================================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true // Enforces production-grade encrypted Neon SSL channels
    }
});

// Database Table Instantiation Logic
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
        console.error("Critical error building schemas on Neon instance:", err);
    }
}
seedDatabaseSchema();

// ==============================================================================
// 4. API Endpoints (Business Logic)
// ==============================================================================

// Fetch Catalog Products with Optional Filters
app.get('/api/products', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];
        let conditions = [];
        
        if (category) {
            conditions.push(`category = $${params.length + 1}`);
            params.push(category);
        }
        if (search) {
            conditions.push(`name ILIKE $${params.length + 1}`);
            params.push(`%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY id DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to query catalog.' });
    }
});

// Process Incoming B2B Contact Inquiries & Custom Branding Requests
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
        console.error(err);
        res.status(500).json({ error: 'Database storage execution failed.' });
    }
});

// ==============================================================================
// 5. Explicit HTML Layout Routing
// ==============================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/index.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/products.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'templates/core/contact.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'templates/auth/login.html')));

// Custom 404 Catch-All Routing Exception Middleware
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; padding: 50px; font-family: sans-serif;">
            <h1 style="font-size: 3rem; color: #dc3545;">404 Not Found</h1>
            <p style="color: #6c757d;">The page requested could not be tracked.</p>
            <a href="/" style="color: #0d6efd; text-decoration: none; font-weight: bold;">Return to Storefront</a>
        </div>
    `);
});

// ==============================================================================
// 6. Server Initialization
// ==============================================================================
app.listen(PORT, () => {
    console.log(`Server is actively running on interface port: ${PORT}`);
});
