import 'dotenv/config';
import app from './app';
import { openDatabase, getDbPath, type DatabaseInstance } from './db';

const PORT = Number(process.env.PORT) || 3000;

const dbPath = getDbPath();
const db: DatabaseInstance = openDatabase(dbPath);
app.set('db', db);

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app, server, db };
