import { pino, type Logger } from 'pino';

import { config } from '../config.js';

/**
 * One structured logger for the whole process.
 *
 * Production writes one JSON object per line to stdout and nothing else: the container runtime
 * (Docker's json-file driver, Vercel's log drain, Kubernetes) collects stdout, so the app never
 * manages log files, rotation or shipping itself (twelve-factor, factor XI). JSON means every
 * field — level, requestId, status, responseTime — can be filtered with `jq` or indexed by a log
 * platform without regex parsing.
 *
 * Development pipes the same records through pino-pretty for humans. pino-pretty is a dev
 * dependency, so production never loads it.
 */
export const logger: Logger = pino({
  level: config.logLevel,
  base: { service: 'people-directory', env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
  ...(config.isProduction || config.env === 'test'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service,env',
          },
        },
      }),
});
