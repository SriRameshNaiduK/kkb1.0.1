import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
        return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "councillor-portfolio" },
    transports: [
        // Console (always)
        new winston.transports.Console({
            format: consoleFormat,
        }),

        // All logs
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true,
        }),

        // Error logs only
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),

        // Security events
        new winston.transports.File({
            filename: path.join(logsDir, "security.log"),
            level: "warn",
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
            tailable: true,
        }),
    ],
    // Don't exit on uncaught exceptions
    exitOnError: false,
});

// Security-specific logger
export const securityLogger = {
    loginAttempt: (ip: string, success: boolean, userAgent?: string) => {
        const level = success ? "info" : "warn";
        logger.log(level, `Login attempt: ${success ? "SUCCESS" : "FAILED"}`, {
            event: "auth",
            ip,
            success,
            userAgent: userAgent?.substring(0, 100),
        });
    },

    loginLockout: (ip: string) => {
        logger.error("🔒 Account locked due to too many failed attempts", {
            event: "lockout",
            ip,
        });
    },

    contentModified: (ip: string, sections: string[]) => {
        logger.info("Content modified via admin panel", {
            event: "content_update",
            ip,
            sections,
        });
    },

    fileUploaded: (ip: string, filename: string, size: number) => {
        logger.info("File uploaded", {
            event: "upload",
            ip,
            filename,
            size,
        });
    },

    suspiciousActivity: (ip: string, details: string) => {
        logger.error(`🚨 Suspicious activity: ${details}`, {
            event: "suspicious",
            ip,
        });
    },

    passwordChanged: (ip: string) => {
        logger.warn("Admin password changed", {
            event: "password_change",
            ip,
        });
    },
};