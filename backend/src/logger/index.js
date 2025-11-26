import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';

const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    }),
    new transports.File({ filename: path.join(logsDir, 'application.log') })
  ]
});

export default logger;
