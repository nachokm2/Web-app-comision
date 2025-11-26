import app from './app.js';
import config from './config/index.js';
import logger from './logger/index.js';

app.listen(config.port, () => {
  logger.info(`API escuchando en el puerto ${config.port}`);
});
