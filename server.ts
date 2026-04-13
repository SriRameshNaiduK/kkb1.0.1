import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initDB, readData, writeData, getPublicData } from "./db.js";
import { logger, securityLogger } from "./logger.js";
import {
    generateNonce,
    securityHeaders,
    generalRateLimiter,
    authRateLimiter,
    uploadRateLimiter,
    parameterPollutionProtection,
    generateCsrfToken,
    csrfProtection,
    sanitizeRequest,
    detectSuspiciousInput,
    securityAuditLog,
} from "./security.js";
import {
    sanitizePortfolioContent,
    validateImageUpload,
    validatePassword,
} from "./validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET =
    process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString("hex");
const PORT = parseInt(process.env.PORT || "3000", 10);
const isProd = process.env.NODE_ENV === "production";

if (!process.env.JWT_SECRET) {
    logger.warn(
        "⚠️  JWT_SECRET not set in environment. Using random secret (tokens won't survive restarts)."
    );
}

// Ensure uploads directory
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Token Blacklist (in-memory, for logout) ────────────────
const tokenBlacklist = new Set<string>();

// Clean blacklist periodically (every hour)
setInterval(() => {
    tokenBlacklist.clear();
    logger.info("Token blacklist cleared.");
}, 60 * 60 * 1000);

// ─── Login Attempt Tracking ─────────────────────────────────
interface LoginAttempt {
    attempts: number;
    lastAttempt: number;
    lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

function isLockedOut(ip: string): boolean {
    const record = loginAttempts.get(ip);
    if (!record) return false;
    if (record.lockedUntil > Date.now()) return true;

    // Reset if lockout expired
    if (record.lockedUntil <= Date.now() && record.lockedUntil > 0) {
        loginAttempts.delete(ip);
        return false;
    }
    return false;
}

function recordFailedLogin(ip: string): void {
    const maxAttempts = parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || "5");
    const lockoutDuration =
        parseInt(process.env.ADMIN_LOCKOUT_DURATION_MINUTES || "15") * 60 * 1000;

    const record = loginAttempts.get(ip) || {
        attempts: 0,
        lastAttempt: 0,
        lockedUntil: 0,
    };

    record.attempts++;
    record.lastAttempt = Date.now();

    if (record.attempts >= maxAttempts) {
        record.lockedUntil = Date.now() + lockoutDuration;
        securityLogger.loginLockout(ip);
    }

    loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip: string): void {
    loginAttempts.delete(ip);
}

// ─── Start Server ───────────────────────────────────────────
async function startServer() {
    await initDB();

    const app = express();

    // Trust proxy (if behind nginx/cloudflare)
    if (isProd) {
        app.set("trust proxy", 1);
    }

    // ─── Global Middleware Stack ────────────────────────────
    app.use(generateNonce);
    app.use(securityHeaders());
    app.use(parameterPollutionProtection());
    app.use(generalRateLimiter());
    app.use(cookieParser());
    app.use(express.json({ limit: "2mb" }));
    app.use(express.urlencoded({ extended: false, limit: "1mb" }));
    app.use(sanitizeRequest);
    app.use(securityAuditLog);

    // Serve uploaded files with security headers
    app.use(
        "/uploads",
        (_req, res, next) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Disposition", "inline");
            res.setHeader("Cache-Control", "public, max-age=86400");
            next();
        },
        express.static(UPLOADS_DIR)
    );

    // ─── Auth Middleware ────────────────────────────────────
    function requireAuth(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: "Not authenticated." });
        }

        // Check blacklist
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({ error: "Session expired." });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

            // Verify token has required claims
            if (decoded.role !== "admin" || !decoded.jti) {
                return res.status(401).json({ error: "Invalid token." });
            }

            (req as any).admin = decoded;
            next();
        } catch (err: any) {
            if (err.name === "TokenExpiredError") {
                return res
                    .status(401)
                    .json({ error: "Session expired. Please login again." });
            }
            return res.status(401).json({ error: "Invalid token." });
        }
    }

    // ─── Public API Routes ─────────────────────────────────

    // Get portfolio content (public)
    app.get("/api/content", (_req, res) => {
        try {
            const data = readData();
            res.json(getPublicData(data));
        } catch (err) {
            logger.error("Error reading content", { error: err });
            res.status(500).json({ error: "Failed to load content." });
        }
    });

    // CSRF Token endpoint (public)
    app.get("/api/csrf-token", (req, res) => {
        const sessionId = req.cookies?.token || req.ip || "anonymous";
        const token = generateCsrfToken(sessionId);
        res.json({ csrfToken: token });
    });

    // ─── Auth Routes ───────────────────────────────────────

    // Login
    app.post(
        "/api/login",
        authRateLimiter(),
        detectSuspiciousInput,
        async (req, res) => {
            const ip = req.ip || "unknown";

            try {
                // Check lockout
                if (isLockedOut(ip)) {
                    const record = loginAttempts.get(ip);
                    const remainingMs = (record?.lockedUntil || 0) - Date.now();
                    const remainingMin = Math.ceil(remainingMs / 60000);

                    securityLogger.loginAttempt(ip, false, req.headers["user-agent"]);

                    return res.status(429).json({
                        error: `Account locked. Try again in ${remainingMin} minute(s).`,
                    });
                }

                const { password } = req.body;
                if (!password || typeof password !== "string") {
                    return res.status(400).json({ error: "Password is required." });
                }

                // Prevent timing attacks with constant-time comparison via bcrypt
                const data = readData();
                const isValid = await bcrypt.compare(password, data.adminPasswordHash);

                if (!isValid) {
                    recordFailedLogin(ip);
                    securityLogger.loginAttempt(ip, false, req.headers["user-agent"]);

                    // Generic message to prevent user enumeration
                    return res.status(401).json({ error: "Invalid credentials." });
                }

                // Success — clear failed attempts
                clearLoginAttempts(ip);
                securityLogger.loginAttempt(ip, true, req.headers["user-agent"]);

                // Generate tokens with unique ID for revocation
                const jti = crypto.randomUUID();
                const accessToken = jwt.sign({ role: "admin", jti }, JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRY || "15m",
                });

                const refreshToken = jwt.sign(
                    { role: "admin", jti: crypto.randomUUID(), type: "refresh" },
                    JWT_REFRESH_SECRET,
                    { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
                );

                // Set secure cookies
                const cookieOptions: express.CookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: "strict",
                    path: "/",
                };

                res.cookie("token", accessToken, {
                    ...cookieOptions,
                    maxAge: 15 * 60 * 1000, // 15 min
                });

                res.cookie("refreshToken", refreshToken, {
                    ...cookieOptions,
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                });

                // Generate CSRF token for this session
                const csrfToken = generateCsrfToken(accessToken);

                return res.json({
                    message: "Login successful.",
                    csrfToken,
                });
            } catch (err) {
                logger.error("Login error", { error: err, ip });
                return res.status(500).json({ error: "Authentication failed." });
            }
        }
    );

    // Token refresh
    app.post("/api/refresh", (req, res) => {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ error: "No refresh token." });
        }

        try {
            const decoded = jwt.verify(
                refreshToken,
                JWT_REFRESH_SECRET
            ) as jwt.JwtPayload;
            if (decoded.type !== "refresh") {
                return res.status(401).json({ error: "Invalid token type." });
            }

            // Blacklist old access token
            const oldToken = req.cookies?.token;
            if (oldToken) tokenBlacklist.add(oldToken);

            // Issue new access token
            const jti = crypto.randomUUID();
            const newAccessToken = jwt.sign({ role: "admin", jti }, JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRY || "15m",
            });

            res.cookie("token", newAccessToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: "strict",
                path: "/",
                maxAge: 15 * 60 * 1000,
            });

            const csrfToken = generateCsrfToken(newAccessToken);
            return res.json({ message: "Token refreshed.", csrfToken });
        } catch {
            return res.status(401).json({ error: "Invalid refresh token." });
        }
    });

    // Logout
    app.post("/api/logout", (req, res) => {
        // Blacklist current tokens
        const token = req.cookies?.token;
        if (token) tokenBlacklist.add(token);

        res.clearCookie("token", { path: "/" });
        res.clearCookie("refreshToken", { path: "/" });

        logger.info("Admin logged out", { ip: req.ip });
        res.json({ message: "Logged out successfully." });
    });

    // Auth check
    app.get("/api/auth-check", (req, res) => {
        const token = req.cookies?.token;
        if (!token || tokenBlacklist.has(token)) {
            return res.status(401).json({ authenticated: false });
        }
        try {
            jwt.verify(token, JWT_SECRET);
            return res.json({ authenticated: true });
        } catch {
            return res.status(401).json({ authenticated: false });
        }
    });

    // ─── Protected Routes ──────────────────────────────────

    // Update content
    app.put(
        "/api/content",
        requireAuth,
        csrfProtection,
        detectSuspiciousInput,
        (req, res) => {
            try {
                const currentData = readData();

                // Sanitize all input
                const sanitizedContent = sanitizePortfolioContent(req.body);

                const newData = {
                    ...currentData,
                    ...sanitizedContent,
                    adminPasswordHash: currentData.adminPasswordHash,
                    _meta: currentData._meta,
                };

                writeData(newData, req.ip || "admin");

                securityLogger.contentModified(
                    req.ip || "unknown",
                    Object.keys(req.body)
                );

                res.json({
                    message: "Content updated successfully.",
                    data: getPublicData(newData),
                });
            } catch (err) {
                logger.error("Content update error", { error: err });
                res.status(500).json({ error: "Failed to update content." });
            }
        }
    );

    // Change password
    app.post(
        "/api/change-password",
        requireAuth,
        csrfProtection,
        async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({
                        error: "Current and new password are required.",
                    });
                }

                if (
                    typeof currentPassword !== "string" ||
                    typeof newPassword !== "string"
                ) {
                    return res.status(400).json({ error: "Invalid input." });
                }

                const data = readData();
                const isValid = await bcrypt.compare(
                    currentPassword,
                    data.adminPasswordHash
                );

                if (!isValid) {
                    securityLogger.suspiciousActivity(
                        req.ip || "unknown",
                        "Failed password change attempt — wrong current password"
                    );
                    return res
                        .status(401)
                        .json({ error: "Current password is incorrect." });
                }

                // Validate new password strength
                const validation = validatePassword(newPassword);
                if (!validation.isValid) {
                    return res.status(400).json({
                        error: "Password does not meet requirements.",
                        details: validation.errors,
                    });
                }

                // Hash new password with high cost factor
                const salt = await bcrypt.genSalt(12);
                const hash = await bcrypt.hash(newPassword, salt);
                data.adminPasswordHash = hash;
                writeData(data, req.ip || "admin");

                // Invalidate all existing sessions
                const currentToken = req.cookies?.token;
                if (currentToken) tokenBlacklist.add(currentToken);

                res.clearCookie("token", { path: "/" });
                res.clearCookie("refreshToken", { path: "/" });

                securityLogger.passwordChanged(req.ip || "unknown");

                return res.json({
                    message: "Password changed successfully. Please log in again.",
                });
            } catch (err) {
                logger.error("Password change error", { error: err });
                return res.status(500).json({ error: "Failed to change password." });
            }
        }
    );

    // Image upload
    app.post(
        "/api/upload",
        requireAuth,
        csrfProtection,
        uploadRateLimiter(),
        (req, res) => {
            try {
                const { image, filename } = req.body;

                if (!image || !filename) {
                    return res
                        .status(400)
                        .json({ error: "Image data and filename are required." });
                }

                if (typeof image !== "string" || typeof filename !== "string") {
                    return res.status(400).json({ error: "Invalid input types." });
                }

                // Validate image
                const validation = validateImageUpload(image, filename);
                if (!validation.isValid) {
                    return res.status(400).json({ error: validation.error });
                }

                const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
                if (!matches) {
                    return res.status(400).json({ error: "Invalid image format." });
                }

                const ext = matches[1];
                const data = matches[2];
                const buffer = Buffer.from(data, "base64");

                // Generate secure random filename (prevents path traversal)
                const safeName = `${crypto.randomUUID()}.${ext}`;
                const filePath = path.join(UPLOADS_DIR, safeName);

                // Ensure file stays within uploads directory
                const resolvedPath = path.resolve(filePath);
                if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
                    securityLogger.suspiciousActivity(
                        req.ip || "unknown",
                        "Path traversal attempt in upload"
                    );
                    return res.status(400).json({ error: "Invalid filename." });
                }

                fs.writeFileSync(filePath, buffer);

                const url = `/uploads/${safeName}`;
                securityLogger.fileUploaded(
                    req.ip || "unknown",
                    safeName,
                    buffer.length
                );

                return res.json({ url, message: "Image uploaded successfully." });
            } catch (err) {
                logger.error("Upload error", { error: err });
                return res.status(500).json({ error: "Failed to upload image." });
            }
        }
    );

    // Security info (for admin dashboard)
    app.get("/api/security-info", requireAuth, (req, res) => {
        try {
            const data = readData();
            res.json({
                lastModified: data._meta?.lastModified,
                version: data._meta?.version,
                lastModifiedBy: data._meta?.lastModifiedBy,
                createdAt: data._meta?.createdAt,
            });
        } catch (err) {
            logger.error("Security info error", { error: err });
            res.status(500).json({ error: "Failed to load security info." });
        }
    });

    // ─── Catch-all for undefined API routes ────────────────
    app.all("/api/*", (_req, res) => {
        res.status(404).json({ error: "API endpoint not found." });
    });

    // ─── Vite / Static ────────────────────────────────────

    if (!isProd) {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
        logger.info("⚡ Vite dev middleware attached.");
    } else {
        const distPath = path.join(__dirname, "dist");
        app.use(
            express.static(distPath, {
                maxAge: "1d",
                etag: true,
                lastModified: true,
            })
        );
        app.get("*", (_req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
        logger.info("📦 Serving production build from /dist.");
    }

    // ─── Global Error Handler ─────────────────────────────
    app.use(
        (
            err: Error,
            req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            logger.error("Unhandled error", {
                error: err.message,
                stack: isProd ? undefined : err.stack,
                path: req.path,
                ip: req.ip,
            });

            // Never leak stack traces in production
            res.status(500).json({
                error: isProd ? "An internal error occurred." : err.message,
            });
        }
    );

    // ─── Start Listening ──────────────────────────────────
    app.listen(PORT, () => {
        logger.info(`\n🚀 Server running at http://localhost:${PORT}`);
        logger.info(`📋 Environment: ${isProd ? "PRODUCTION" : "DEVELOPMENT"}`);
        logger.info(
            `🔒 Security middleware: helmet, rate-limit, hpp, csrf, sanitizer`
        );
        logger.info(`📝 Audit logs: ./logs/`);

        if (!isProd) {
            logger.warn(
                "⚠️  Running in development mode. Some security features are relaxed."
            );
        }

        if (!process.env.JWT_SECRET) {
            logger.warn(
                "⚠️  JWT_SECRET is not configured. Set it in .env for production!"
            );
        }

        if (!process.env.ADMIN_DEFAULT_PASSWORD) {
            logger.warn(
                "⚠️  ADMIN_DEFAULT_PASSWORD not set. Using default. Change immediately!"
            );
        }
    });

    // ─── Graceful Shutdown ──────────────────────────────────
    const shutdown = (signal: string) => {
        logger.info(`\n${signal} received. Shutting down gracefully...`);
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // ─── Unhandled Rejections / Exceptions ──────────────────
    process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled Promise Rejection", { reason });
    });

    process.on("uncaughtException", (error) => {
        logger.error("Uncaught Exception", {
            error: error.message,
            stack: error.stack,
        });
        // Give logger time to flush before exiting
        setTimeout(() => process.exit(1), 1000);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});