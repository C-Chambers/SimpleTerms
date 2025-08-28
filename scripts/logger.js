// SimpleTerms Logger Utility
// Provides environment-aware logging that can be disabled in production

(function() {
    'use strict';
    
    // Check if we're in production mode
    // This can be set via environment variable or build process
    const IS_PRODUCTION = typeof SIMPLETERMS_ENV !== 'undefined' ? SIMPLETERMS_ENV === 'production' : true;
    
    // Log levels
    const LogLevel = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };
    
    // Current log level (only errors in production)
    const CURRENT_LOG_LEVEL = IS_PRODUCTION ? LogLevel.ERROR : LogLevel.DEBUG;
    
    class Logger {
        constructor(prefix = 'SimpleTerms') {
            this.prefix = prefix;
        }
        
        error(...args) {
            if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
                console.error(`[${this.prefix}]`, ...args);
            }
        }
        
        warn(...args) {
            if (CURRENT_LOG_LEVEL >= LogLevel.WARN) {
                console.warn(`[${this.prefix}]`, ...args);
            }
        }
        
        info(...args) {
            if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
                console.info(`[${this.prefix}]`, ...args);
            }
        }
        
        log(...args) {
            if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
                console.log(`[${this.prefix}]`, ...args);
            }
        }
        
        debug(...args) {
            if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
                console.log(`[${this.prefix}:DEBUG]`, ...args);
            }
        }
    }
    
    // Export for use in other scripts
    if (typeof window !== 'undefined') {
        window.SimpleTermsLogger = Logger;
    }
    
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Logger;
    }
})();