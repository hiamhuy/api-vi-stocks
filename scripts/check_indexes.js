const { sequelize } = require('./src/models');

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const [results] = await sequelize.query('SHOW INDEX FROM users');
    console.log('Current Indexes:');
    results.forEach(r => console.log(`- ${r.Key_name} (${r.Column_name})`));

    // If there are many indexes with the same column, we should drop them.
    // However, ER_TOO_MANY_KEYS is very specific.
    // Let's try to remove the unique constraint from the email column manually if there's a mess.
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

fix();
