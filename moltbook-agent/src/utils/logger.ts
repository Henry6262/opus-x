import winston from 'winston';
import config from '../config';
import path from 'path';
import fs from 'fs';

if (!fs.existsSync(config.logging.logsDir)) {
  fs.mkdirSync(config.logging.logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'superrouter-moltbook' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.logging.logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logging.logsDir, 'combined.log'),
    }),
    new winston.transports.File({
      filename: path.join(config.logging.logsDir, 'heartbeat.log'),
      level: 'info',
    }),
  ],
});

const safeStringify = (obj: object): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
};

logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length) {
          try {
            metaStr = ` ${safeStringify(meta)}`;
          } catch {
            metaStr = ' [Failed to serialize metadata]';
          }
        }
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    ),
  })
);

export default logger;
