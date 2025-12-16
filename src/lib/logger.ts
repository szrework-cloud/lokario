/**
 * Système de logging conditionnel pour la production
 * Les logs sont automatiquement désactivés en production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log en développement uniquement
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log de debug (développement uniquement)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log d'information (développement uniquement)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log d'avertissement (toujours loggé, même en production)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Log d'erreur (toujours loggé, même en production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },
};
