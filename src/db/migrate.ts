import { pool } from './pool';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    const migrations = [
      '000__create__initial_config.sql',
      '001__create__user_schema.sql',
      '001__seed__default_user.sql',
      '002__create__video_schema.sql'
    ];
    
    for (const migration of migrations) {
      const sql = readFileSync(join(process.cwd(), 'sql', migration), 'utf8'); 
      await client.query(sql);
      console.log(`Migration ${migration} completed`);
    }
  } catch (error) {
    console.error(`Migration failed: `, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations when this file is executed directly
runMigrations()
  .then(() => {
    console.log('All migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed: ', error);
    process.exit(1);
  });