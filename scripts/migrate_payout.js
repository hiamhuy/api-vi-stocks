const { sequelize } = require('./src/models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // Add payoutRate column if it doesn't exist
    const [results] = await sequelize.query("SHOW COLUMNS FROM sessions LIKE 'payoutRate'");
    if (results.length === 0) {
      console.log('Adding payoutRate column to sessions table...');
      await sequelize.query('ALTER TABLE sessions ADD COLUMN payoutRate DECIMAL(5, 2) DEFAULT 0.85 AFTER totalPutAmount');
      console.log('Column added successfully');
    } else {
      console.log('Column payoutRate already exists');
    }
    
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
