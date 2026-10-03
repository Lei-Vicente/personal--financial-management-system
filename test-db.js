import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkData() {
  const url = process.env.DATABASE_URL.replace(':5432/', ':6543/');
  console.log('Testing 6543 URL:', url.replace(/:[^:@]+@/, ':***@'));
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const users = await pool.query('SELECT id, email FROM users');
    console.log('Users in Supabase:', users.rows.length);
  } catch (err) {
    console.error('Error on 6543:', err.message);
  } finally {
    await pool.end();
  }
}

checkData();
