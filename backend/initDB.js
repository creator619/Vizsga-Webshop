const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runSetup() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../mysql_setup.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL setup script...');
        await connection.query(sqlScript);
        console.log('Setup script executed successfully. Database webshop and tables created.');
    } catch (err) {
        console.error('Error executing script:', err.message);
    } finally {
        await connection.end();
    }
}

runSetup();
