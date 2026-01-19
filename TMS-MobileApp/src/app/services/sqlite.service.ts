import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection
} from '@capacitor-community/sqlite';

export interface Credentials {
  id?: number;
  email: string;
  password: string;
  lastLogin: string;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private initialized = false;
  private dbName = 'transport_app';

  async initializeDatabase() {
    if (this.initialized) return;

    if (Capacitor.getPlatform() === 'web') {
      await CapacitorSQLite.initWebStore();
    }

    this.db = await this.sqlite.createConnection(
      this.dbName,
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();
    await this.createTable();
    this.initialized = true;
  }

  private async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        last_login TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.db.execute(sql);
  }

  async saveCredentials(email: string, password: string): Promise<void> {
    console.log(email,password);
    await this.initializeDatabase();

    const sql = `
      INSERT INTO user_credentials (email, password, last_login)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        password = excluded.password,
        last_login = excluded.last_login;
    `;

    await this.db.run(sql, [email.trim(), password.trim()]);
  }

  async getLastCredentials(): Promise<Credentials | null> {
    await this.initializeDatabase();

    const res = await this.db.query(
      'SELECT * FROM user_credentials ORDER BY last_login DESC LIMIT 1'
    );

    if (!res.values?.length) return null;

    const u = res.values[0];
    return {
      id: u.id,
      email: u.email,
      password: u.password,
      lastLogin: u.last_login
    };
  }

  async validateCredentials(email: string, password: string): Promise<boolean> {
    await this.initializeDatabase();

    const res = await this.db.query(
      'SELECT 1 FROM user_credentials WHERE email = ? AND password = ? LIMIT 1',
      [email.trim(), password.trim()]
    );

    return (res.values?.length ?? 0) > 0;
  }

  async clearAll(): Promise<void> {
    await this.initializeDatabase();
    await this.db.run('DELETE FROM user_credentials');
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}
