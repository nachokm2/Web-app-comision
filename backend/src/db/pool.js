import pkg from 'pg';
import config from '../config/index.js';
import logger from '../logger/index.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => logger.info('Conexión a PostgreSQL establecida.'));

pool.on('error', (err) => {
  logger.error('Error en el pool de PostgreSQL', err);
});

export default {
  query: (text, params) => pool.query(text, params)
};
