import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const users = await pool.query('SELECT id, email FROM users');
    console.log('Users in Supabase:', users.rows);
    
    const accounts = await pool.query('SELECT id, name, user_id FROM accounts');
    console.log('Accounts in Supabase:', accounts.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkData();
