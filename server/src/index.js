require('dotenv').config();
const app = require('./app');
const { openDatabase, getDbPath } = require('./db');

const PORT = Number(process.env.PORT) || 3000;

const dbPath = getDbPath();
const db = openDatabase(dbPath);
app.set('db', db);

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { app, server, db };
