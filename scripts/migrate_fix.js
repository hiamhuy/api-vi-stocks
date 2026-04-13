const sequelize = require('./src/config/database');

async function migrate() {
  try {
    console.log('--- Database Migration ---');
    
    // Add 'symbol' column to 'sessions' table
    await sequelize.query("ALTER TABLE `sessions` ADD COLUMN `symbol` VARCHAR(50) DEFAULT 'BTCUSDT' AFTER `status`;");
    console.log('Added column "symbol" to "sessions" table.');
    
    // Also update any other tables if necessary
    // In this case, Session is the main one and trade.controller.js & admin.controller.js use it.
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    if (err.parent && err.parent.errno === 1060) {
      console.log('Column "symbol" already exists. Skipping.');
      process.exit(0);
    }
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
