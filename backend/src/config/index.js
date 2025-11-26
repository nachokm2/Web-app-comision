import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'webapp_session',
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES || 60),
  logLevel: process.env.LOG_LEVEL || 'info',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*'
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL no está definido en las variables de entorno.');
}

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno.');
}

export default config;
