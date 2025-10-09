// server.js - Simple Express server with SQLite for translations

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve all files in current directory

// Initialize SQLite Database
const db = new sqlite3.Database('./translations.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Create table matching your schema
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS translations (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            LANG_CODE TEXT NOT NULL,
            LANGUAGE TEXT NOT NULL,
            CONTEXT TEXT,
            VALUE TEXT NOT NULL,
            TRANSLATION TEXT NOT NULL,
            CREATED_BY TEXT,
            CREATED_BY_ID INTEGER,
            CREATE_DATE DATETIME DEFAULT CURRENT_TIMESTAMP,
            MODIFIED_BY TEXT,
            MODIFIED_BY_ID INTEGER,
            MODIFIED_DATE DATETIME DEFAULT CURRENT_TIMESTAMP,
            STATUS TEXT DEFAULT 'Active',
            TRANS_TYPE INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Translations table ready');
        }
    });
}

// API endpoint to get all translations by language
app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang;
    
    db.all(
        'SELECT VALUE, TRANSLATION FROM translations WHERE LANG_CODE = ? AND STATUS = ?',
        [lang, 'Active'],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Convert to key-value object
            const translations = {};
            rows.forEach(row => {
                translations[row.VALUE] = row.TRANSLATION;
            });
            
            res.json(translations);
        }
    );
});

// API endpoint to get all translations (all languages)
app.get('/api/translations', (req, res) => {
    db.all(
        'SELECT * FROM translations WHERE STATUS = ? ORDER BY ID',
        ['Active'],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  - http://localhost:${PORT}/api/translations`);
    console.log(`  - http://localhost:${PORT}/api/translations/es`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\nDatabase connection closed');
        }
        process.exit(0);
    });
});