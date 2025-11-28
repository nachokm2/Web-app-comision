import logger from '../logger/index.js';

export function errorHandler (err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error('Error no controlado%', { error: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Ha ocurrido un error inesperado' : err.message
  });
}
