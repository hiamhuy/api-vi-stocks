const { sequelize } = require('./src/models');

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Database for cleanup');

    const [indexes] = await sequelize.query('SHOW INDEX FROM users');
    
    // Filter redundant indexes on email and phone
    const toDrop = indexes
      .map(idx => idx.Key_name)
      .filter(name => 
        (name.startsWith('email_') && /\d+$/.test(name)) || 
        (name.startsWith('phone_') && /\d+$/.test(name))
      );

    console.log(`🔍 Found ${toDrop.length} redundant indexes to drop...`);

    for (const indexName of toDrop) {
      try {
        console.log(`Dropping index: ${indexName}`);
        await sequelize.query(`ALTER TABLE users DROP INDEX ${indexName}`);
        console.log(`Dropped ${indexName}`);
      } catch (err) {
        console.error(`Failed to drop ${indexName}:`, err.message);
      }
    }

    console.log('Database cleanup completed.');
    console.log('Restarting the server should now work without ER_TOO_MANY_KEYS.');
    
  } catch (err) {
    console.error('Critical error during cleanup:', err);
  } finally {
    process.exit();
  }
}

cleanup();
