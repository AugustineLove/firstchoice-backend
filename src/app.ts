import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './middleware/logger.middleware';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';
import { sanitizeInput, preventParamPollution } from './middleware/sanitize.middleware';
import authRoutes from './routes/auth.routes';
import allRoutes from './routes/allroutes';

const app = express();

app.use(cors());
app.use(helmet());

app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(sanitizeInput);
app.use(preventParamPollution);
app.use(logger);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.use('/auth', authLimiter, authRoutes); 
app.use(allRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default app;