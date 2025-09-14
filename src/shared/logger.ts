import { Logger } from './types';

const isDevelopment = process.env.NODE_ENV === 'development';

class AppLogger implements Logger {
  info(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }
}

export const logger = new AppLogger();
