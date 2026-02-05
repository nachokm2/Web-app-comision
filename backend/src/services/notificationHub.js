import { randomUUID } from 'crypto';
import logger from '../logger/index.js';

let ioInstance = null;

function allowedOriginsFromConfig (originSetting) {
  if (!originSetting) return [];
  if (Array.isArray(originSetting)) return originSetting;
  return originSetting
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildEventId (prefix = 'event') {
  try {
    return `${prefix}-${randomUUID()}`;
  } catch (error) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function initNotificationHub (io, originSetting) {
  ioInstance = io;
  const allowedOrigins = allowedOriginsFromConfig(originSetting);

  io.engine.on('connection_error', (err) => {
    logger.warn('Fallo de conexión a Socket.IO', err);
  });

  io.on('connection', (socket) => {
    logger.info(`Cliente conectado al hub de notificaciones: ${socket.id}`);
    if (allowedOrigins.length && typeof logger.debug === 'function') {
      logger.debug(`Socket habilitado para orígenes: ${allowedOrigins.join(', ')}`);
    }
    socket.on('disconnect', (reason) => {
      logger.info(`Cliente desconectado del hub (${socket.id}) motivo: ${reason}`);
    });
  });
}

export function emitRecordEvent (type, record = null, description = '') {
  if (!ioInstance) {
    return null;
  }
  const payload = {
    id: buildEventId(type),
    type,
    record,
    description,
    timestamp: new Date().toISOString()
  };
  ioInstance.emit('record-event', payload);
  logger.info(`Evento ${type} emitido para la comisión ${record?.id ?? 'desconocida'}`);
  return payload.id;
}
