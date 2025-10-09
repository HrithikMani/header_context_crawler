// setup-db.js - Script to create database and insert all translations

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./translations.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create table matching your schema
db.serialize(() => {
    console.log('Setting up translations table...');
    
    // Drop table if exists to start fresh
    db.run(`DROP TABLE IF EXISTS translations`, (err) => {
        if (err) {
            console.error('Error dropping table:', err);
        } else {
            console.log('✓ Cleared old data');
        }
    });
    
    // Create fresh table
    db.run(`
        CREATE TABLE translations (
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
            process.exit(1);
        }
        console.log('✓ Table created');
    });

    // Read and execute SQL file
    console.log('Reading insert queries...');
    const sql = fs.readFileSync('./insert_translations.sql', 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} insert statements`);
    console.log('Inserting translations...');
    
    let successCount = 0;
    let errorCount = 0;
    let processedCount = 0;
    
    const stmt = db.prepare(`
        INSERT INTO translations 
        (LANG_CODE, LANGUAGE, CONTEXT, VALUE, TRANSLATION, CREATED_BY, CREATED_BY_ID, STATUS, TRANS_TYPE) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Parse each INSERT statement
    statements.forEach((statement, index) => {
        // Match the INSERT statement pattern (handle escaped quotes)
        const match = statement.match(/INSERT INTO translations \(LANG_CODE, LANGUAGE, CONTEXT, VALUE, TRANSLATION, CREATED_BY, CREATED_BY_ID, STATUS, TRANS_TYPE\)\s+VALUES \('([^']+)', '([^']+)', '([^']*)', '([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)', '([^']*)', (\d+), '([^']+)', (\d+)\)/);
        
        if (match) {
            const [, langCode, language, context, value, translation, createdBy, createdById, status, transType] = match;
            
            // Unescape single quotes in value and translation
            const cleanValue = value.replace(/''/g, "'");
            const cleanTranslation = translation.replace(/''/g, "'");
            
            stmt.run(
                langCode, 
                language, 
                context, 
                cleanValue, 
                cleanTranslation, 
                createdBy, 
                parseInt(createdById), 
                status, 
                parseInt(transType),
                (err) => {
                    processedCount++;
                    
                    if (err) {
                        console.error(`✗ Error inserting [${langCode}] "${cleanValue}":`, err.message);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                    
                    // Check if this is the last statement
                    if (processedCount === statements.length) {
                        stmt.finalize(() => {
                            console.log(`\n✓ Database setup complete!`);
                            console.log(`  Success: ${successCount}`);
                            console.log(`  Errors: ${errorCount}`);
                            
                            // Show sample translations by language
                            db.all(`
                                SELECT ID, LANG_CODE, VALUE, TRANSLATION 
                                FROM translations 
                                ORDER BY LANG_CODE, ID 
                                LIMIT 10
                            `, [], (err, rows) => {
                                if (!err && rows.length > 0) {
                                    console.log('\nSample translations (first 10):');
                                    rows.forEach(row => {
                                        const preview = row.TRANSLATION.length > 40 
                                            ? row.TRANSLATION.substring(0, 40) + '...' 
                                            : row.TRANSLATION;
                                        console.log(`  [${row.ID}] ${row.LANG_CODE}: "${row.VALUE}" → "${preview}"`);
                                    });
                                }
                                
                                // Show count by language
                                db.all(`
                                    SELECT LANG_CODE, COUNT(*) as count 
                                    FROM translations 
                                    GROUP BY LANG_CODE
                                    ORDER BY LANG_CODE
                                `, [], (err, rows) => {
                                    if (!err) {
                                        console.log('\nTranslations by language:');
                                        rows.forEach(row => {
                                            console.log(`  ${row.LANG_CODE}: ${row.count} translations`);
                                        });
                                    }
                                    
                                    // Show total
                                    db.get(`SELECT COUNT(*) as total FROM translations`, [], (err, row) => {
                                        if (!err) {
                                            console.log(`\nTotal: ${row.total} translations in database`);
                                        }
                                        
                                        db.close(() => {
                                            console.log('\n✅ Database ready! Run "npm start" to start the server.');
                                            process.exit(0);
                                        });
                                    });
                                });
                            });
                        });
                    }
                }
            );
        } else {
            processedCount++;
            // Try to parse if statement doesn't match (for debugging)
            if (statement.trim().startsWith('INSERT INTO translations')) {
                console.warn(`⚠ Could not parse statement ${index + 1}`);
                console.warn(`Statement: ${statement.substring(0, 100)}...`);
            }
            
            // Check if all processed
            if (processedCount === statements.length) {
                stmt.finalize(() => {
                    console.log(`\n✓ Database setup complete!`);
                    console.log(`  Success: ${successCount}`);
                    console.log(`  Errors: ${errorCount}`);
                    
                    db.close(() => {
                        console.log('\n✅ Database ready! Run "npm start" to start the server.');
                        process.exit(0);
                    });
                });
            }
        }
    });
});