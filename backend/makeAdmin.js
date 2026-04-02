const mysql = require('mysql2/promise');

async function makeAdmin() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'webshop'
    });

    try {
        await connection.query('UPDATE users SET is_admin = 1');
        console.log('All users are now admins!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

makeAdmin();
