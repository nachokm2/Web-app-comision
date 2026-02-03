import app from './app.js'
import config from './config/index.js'
import logger from './logger/index.js'
import { ensurePasswordResetTable } from './services/passwordResetService.js'
async function startServer () {
  try {
    await ensurePasswordResetTable()
    app.listen(config.port, () => {
      logger.info(`API escuchando en el puerto ${config.port}`)
    })
  } catch (error) {
    logger.error('No fue posible iniciar el servidor', error)
    process.exit(1)
  }
}

startServer()
