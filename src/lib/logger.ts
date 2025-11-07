// Simple logger utility for consistent logging

const isDev =
  typeof process !== "undefined"
    ? process.env.NODE_ENV !== "production"
    : true;

class Logger {
  info(...args: any[]) {
    if (isDev) {
      console.info("[INFO]", ...args);
    }
  }

  warn(...args: any[]) {
    if (isDev) {
      console.warn("[WARN]", ...args);
    }
  }

  error(...args: any[]) {
    if (isDev) {
      console.error("[ERROR]", ...args);
    }
  }

  debug(...args: any[]) {
    if (isDev) {
      console.debug("[DEBUG]", ...args);
    }
  }
}

// Export a singleton
const logger = new Logger();
export default logger;

