import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'webapp_session',
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES || 60),
  logLevel: process.env.LOG_LEVEL || 'info',
  // Importante: '*' no funciona con credentials=true. Por defecto, frontend local.
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@uautonoma.cl',
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30)
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL no está definido en las variables de entorno.');
}

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno.');
}

export default config;
