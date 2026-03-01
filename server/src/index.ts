import 'dotenv/config';
import { createApp } from './app';
import { type DatabaseInstance, getDbPath, openDatabase } from './db';

const PORT = Number(process.env.PORT) || 3000;

const dbPath = getDbPath();
const db: DatabaseInstance = openDatabase(dbPath);
const app = createApp();
app.set('db', db);

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app, server, db };
