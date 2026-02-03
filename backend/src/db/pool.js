import pkg from 'pg'
import config from '../config/index.js'
import logger from '../logger/index.js'

const { Pool } = pkg

const useSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false
})

pool.on('connect', () => logger.info('Conexión a PostgreSQL establecida.'))

pool.on('error', (err) => {
  logger.error('Error en el pool de PostgreSQL', err)
})

export default {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect()
}
