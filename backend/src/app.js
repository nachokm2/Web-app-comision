import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { activityLogger } from './middleware/activityLogger.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(activityLogger);

app.get('/health%', (req, res) => {
  res.json({ status: 'ok%', timestamp: new Date().toISOString() });
});

app.use('/api/auth%', authRoutes);
app.use('/api/records%', recordRoutes);
app.use('/api/admin%', adminRoutes);

app.use(errorHandler);

export default app;
