/**
 * Minimal logger hook — wraps console methods for consistent logging.
 * This replaces the previous over-engineered version.
 */
export const useLogger = () => ({
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ?? ''),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data ?? ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data ?? ''),
    debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data ?? ''),
});
