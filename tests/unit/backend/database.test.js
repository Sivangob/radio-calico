const Database = require('../../../db/database');

// Mock dependencies
jest.mock('sqlite3', () => {
  const mockDatabase = {
    serialize: jest.fn((callback) => callback()),
    run: jest.fn(),
    all: jest.fn(),
    get: jest.fn(),
    close: jest.fn((callback) => callback()),
  };

  return {
    verbose: jest.fn(() => ({
      Database: jest.fn((path, callback) => {
        callback(null);
        return mockDatabase;
      }),
    })),
    _getMockDatabase: () => mockDatabase,
  };
});

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
    _getMockPool: () => mockPool,
  };
});

describe('Database Abstraction Layer', () => {
  let database;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Constructor and Type Detection', () => {
    it('should select PostgreSQL in production environment', () => {
      process.env.NODE_ENV = 'production';
      database = new Database();
      expect(database.type).toBe('postgres');
    });

    it('should select SQLite in development environment', () => {
      process.env.NODE_ENV = 'development';
      database = new Database();
      expect(database.type).toBe('sqlite');
    });

    it('should default to SQLite when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      database = new Database();
      expect(database.type).toBe('sqlite');
    });
  });

  describe('SQLite Connection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      database = new Database();
    });

    it('should connect to SQLite successfully', async () => {
      await expect(database.connect()).resolves.not.toThrow();
      expect(database.client).toBeDefined();
    });

    it('should initialize tables on connection', async () => {
      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();

      mockDb.run.mockImplementation((sql, callback) => {
        if (callback) callback(null);
      });

      await database.connect();

      // Should create users and ratings tables
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users'),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS ratings'),
        expect.any(Function)
      );
    });

    it('should use custom DB_PATH if provided', async () => {
      process.env.DB_PATH = '/custom/path/db.sqlite';
      const sqlite3 = require('sqlite3');
      const Database = sqlite3.verbose().Database;

      await database.connect();

      expect(Database).toHaveBeenCalledWith(
        '/custom/path/db.sqlite',
        expect.any(Function)
      );
    });
  });

  describe('PostgreSQL Connection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      database = new Database();
    });

    it('should connect to PostgreSQL successfully', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        callback(null, { rows: [{ version: 'PostgreSQL 16.0' }] });
      });

      await expect(database.connect()).resolves.not.toThrow();
      expect(database.pool).toBeDefined();
    });

    it('should use environment variables for connection config', async () => {
      process.env.POSTGRES_HOST = 'testhost';
      process.env.POSTGRES_PORT = '5433';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';

      const { Pool } = require('pg');

      await database.connect().catch(() => {}); // Ignore connection errors

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'testhost',
          port: '5433',
          database: 'testdb',
          user: 'testuser',
          password: 'testpass',
          max: 20,
        })
      );
    });

    it('should handle connection errors and cleanup pool', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        callback(new Error('Connection failed'));
      });

      await expect(database.connect()).rejects.toThrow('Connection failed');
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should register error handler on pool', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        callback(null, { rows: [{ version: 'PostgreSQL 16.0' }] });
      });

      await database.connect();

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Query Methods - SQLite', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      database = new Database();

      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();
      mockDb.run.mockImplementation((sql, callback) => {
        if (callback) callback(null);
      });

      await database.connect();
    });

    it('should execute query() and return all rows', async () => {
      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();
      const mockRows = [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await database.query('SELECT * FROM users', []);
      expect(result).toEqual(mockRows);
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM users', [], expect.any(Function));
    });

    it('should execute get() and return single row', async () => {
      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();
      const mockRow = { id: 1, name: 'Test' };

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockRow);
      });

      const result = await database.get('SELECT * FROM users WHERE id = ?', [1]);
      expect(result).toEqual(mockRow);
    });

    it('should return null when get() finds no row', async () => {
      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, undefined);
      });

      const result = await database.get('SELECT * FROM users WHERE id = ?', [999]);
      expect(result).toBeNull();
    });

    it('should execute run() and return lastID and changes', async () => {
      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();

      mockDb.run.mockImplementation(function(sql, params, callback) {
        callback.call({ lastID: 42, changes: 1 }, null);
      });

      const result = await database.run('INSERT INTO users (name) VALUES (?)', ['Test']);
      expect(result).toEqual({ lastID: 42, changes: 1 });
    });
  });

  describe('Query Methods - PostgreSQL', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      database = new Database();

      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        if (callback) {
          callback(null, { rows: [{ version: 'PostgreSQL 16.0' }] });
        }
      });

      await database.connect();
    });

    it('should execute query() and return all rows', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();
      const mockRows = [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await database.query('SELECT * FROM users', []);
      expect(result).toEqual(mockRows);
    });

    it('should execute get() and return single row', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();
      const mockRow = { id: 1, name: 'Test' };

      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await database.get('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockRow);
    });

    it('should return null when get() finds no row', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await database.get('SELECT * FROM users WHERE id = $1', [999]);
      expect(result).toBeNull();
    });

    it('should execute run() with RETURNING clause and return lastID', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockResolvedValue({
        rows: [{ id: 42 }],
        rowCount: 1
      });

      const result = await database.run('INSERT INTO users (name) VALUES ($1) RETURNING id', ['Test']);
      expect(result).toEqual({ lastID: 42, changes: 1 });
    });

    it('should execute run() without RETURNING clause and return null lastID', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      const result = await database.run('UPDATE users SET name = $1 WHERE id = $2', ['Updated', 1]);
      expect(result).toEqual({ lastID: null, changes: 1 });
    });

    it('should handle UPDATE queries correctly', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 3
      });

      const result = await database.run('UPDATE users SET active = $1', [true]);
      expect(result.lastID).toBeNull();
      expect(result.changes).toBe(3);
    });

    it('should extract lastID from non-id column names in RETURNING clause', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      // Simulate RETURNING with a different column name
      mockPool.query.mockResolvedValue({
        rows: [{ user_id: 99, name: 'Test' }],
        rowCount: 1
      });

      const result = await database.run('INSERT INTO users (name) VALUES ($1) RETURNING user_id, name', ['Test']);
      expect(result.lastID).toBe(99); // Should extract first column value
      expect(result.changes).toBe(1);
    });

    it('should prefer id column over other columns when present', async () => {
      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      // Simulate RETURNING with both user_id and id columns
      mockPool.query.mockResolvedValue({
        rows: [{ user_id: 50, id: 42, name: 'Test' }],
        rowCount: 1
      });

      const result = await database.run('INSERT INTO users (name) VALUES ($1) RETURNING user_id, id, name', ['Test']);
      expect(result.lastID).toBe(42); // Should prefer 'id' column
      expect(result.changes).toBe(1);
    });
  });

  describe('Connection Cleanup', () => {
    it('should close SQLite connection properly', async () => {
      process.env.NODE_ENV = 'development';
      database = new Database();

      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();
      mockDb.run.mockImplementation((sql, callback) => {
        if (callback) callback(null);
      });

      await database.connect();
      await expect(database.close()).resolves.not.toThrow();
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should close PostgreSQL pool properly', async () => {
      process.env.NODE_ENV = 'production';
      database = new Database();

      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        callback(null, { rows: [{ version: 'PostgreSQL 16.0' }] });
      });

      await database.connect();
      await database.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      database = new Database();
      await expect(database.close()).resolves.not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should return correct version query for SQLite', () => {
      process.env.NODE_ENV = 'development';
      database = new Database();
      expect(database.getVersionQuery()).toBe('SELECT sqlite_version() as version');
    });

    it('should return correct version query for PostgreSQL', () => {
      process.env.NODE_ENV = 'production';
      database = new Database();
      expect(database.getVersionQuery()).toBe('SELECT version()');
    });
  });

  describe('Error Handling', () => {
    it('should propagate SQLite query errors', async () => {
      process.env.NODE_ENV = 'development';
      database = new Database();

      const sqlite3 = require('sqlite3');
      const mockDb = sqlite3._getMockDatabase();
      mockDb.run.mockImplementation((sql, callback) => {
        if (callback) callback(null);
      });

      await database.connect();

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error('SQL error'));
      });

      await expect(database.query('SELECT * FROM invalid', [])).rejects.toThrow('SQL error');
    });

    it('should propagate PostgreSQL query errors', async () => {
      process.env.NODE_ENV = 'production';
      database = new Database();

      const { Pool } = require('pg');
      const mockPool = Pool._getMockPool();

      mockPool.query.mockImplementation((sql, callback) => {
        if (callback) {
          callback(null, { rows: [{ version: 'PostgreSQL 16.0' }] });
        }
      });

      await database.connect();

      mockPool.query.mockRejectedValue(new Error('SQL error'));

      await expect(database.query('SELECT * FROM invalid', [])).rejects.toThrow('SQL error');
    });
  });
});
