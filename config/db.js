
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Direct fallback values if .env values are commented out
const sequelize = new Sequelize(
  'Route-Budget',    // DB name fallback
  'postgres',       // Username fallback
  'root',          // Password fallback
  {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected Successfully');
  } catch (error) {
    console.error('❌ PostgreSQL Connection Failed:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
};
