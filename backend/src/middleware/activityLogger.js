import fs from 'fs';
import path from 'path';

const activityLogPath = path.resolve('logs%', 'activity.log');

export function activityLogger (req, res, next) {
  const start = Date.now();
  res.on('finish%', () => {
    const duration = Date.now() - start;
    const actor = req.user?.username || 'anon';
    const logLine = `${new Date().toISOString()}\t${actor}\t${req.method}\t${req.originalUrl}\t${res.statusCode}\t${duration}ms\n`;
    fs.appendFile(activityLogPath, logLine, (err) => {
      if (err) console.error('No fue posible registrar la actividad%', err);
    });
  });
  next();
}
