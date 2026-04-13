import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import crypto from "crypto";
import { logger } from "./logger.js";

// ─── CSP Nonce Generator ────────────────────────────────────
export function generateNonce(_req: Request, res: Response, next: NextFunction) {
    res.locals.cspNonce = crypto.randomBytes(32).toString("base64");
    next();
}

// ─── Helmet Security Headers ─────────────────────────────────
export function securityHeaders() {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    ((_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`) as any,
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // Needed for Tailwind + Framer Motion inline styles
                    "https://fonts.googleapis.com",
                ],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false, // Allow loading external fonts
        crossOriginOpenerPolicy: { policy: "same-origin" },
        crossOriginResourcePolicy: { policy: "same-site" },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: "deny" },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: { permittedPolicies: "none" },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        xssFilter: true,
    });
}

// ─── General Rate Limiter ─────────────────────────────────────
export function generalRateLimiter() {
    return rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 min
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: "Too many requests. Please try again later.",
            retryAfter: "15 minutes",
        },
        keyGenerator: (req) => {
            // Use X-Forwarded-For if behind a proxy, otherwise IP
            return (
                (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
                req.ip ||
                "unknown"
            );
        },
        handler: (req, res) => {
            logger.warn("Rate limit exceeded", {
                ip: req.ip,
                path: req.path,
                userAgent: req.headers["user-agent"],
            });
            res.status(429).json({
                error: "Too many requests. Please try again later.",
            });
        },
    });
}

// ─── Auth Rate Limiter (stricter) ────────────────────────────
export function authRateLimiter() {
    return rateLimit({
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000"),
        max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "5"),
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error:
                "Too many authentication attempts. Account temporarily locked. Try again later.",
        },
        keyGenerator: (req) => {
            return (
                (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
                req.ip ||
                "unknown"
            );
        },
        handler: (req, res) => {
            logger.warn("Auth rate limit exceeded — possible brute force", {
                ip: req.ip,
                path: req.path,
                userAgent: req.headers["user-agent"],
            });
            res.status(429).json({
                error:
                    "Too many authentication attempts. Please try again in 15 minutes.",
            });
        },
    });
}

// ─── Upload Rate Limiter ─────────────────────────────────────
export function uploadRateLimiter() {
    return rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 uploads per hour
        message: { error: "Upload limit reached. Try again later." },
    });
}

// ─── HPP (HTTP Parameter Pollution) ──────────────────────────
export function parameterPollutionProtection() {
    return hpp();
}

// ─── CSRF Token Management ───────────────────────────────────
const csrfSecret =
    process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");

export function generateCsrfToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const hash = crypto
        .createHmac("sha256", csrfSecret)
        .update(`${sessionId}:${timestamp}`)
        .digest("hex");
    return `${timestamp}.${hash}`;
}

export function validateCsrfToken(
    token: string,
    sessionId: string
): boolean {
    try {
        const [timestamp, hash] = token.split(".");
        if (!timestamp || !hash) return false;

        // Token expires after 2 hours
        const age = Date.now() - parseInt(timestamp);
        if (age > 2 * 60 * 60 * 1000) return false;

        const expectedHash = crypto
            .createHmac("sha256", csrfSecret)
            .update(`${sessionId}:${timestamp}`)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(hash),
            Buffer.from(expectedHash)
        );
    } catch {
        return false;
    }
}

// ─── CSRF Middleware ─────────────────────────────────────────
export function csrfProtection(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Skip for GET, HEAD, OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    const token = req.headers["x-csrf-token"] as string;
    const sessionId = req.cookies?.token || req.ip || "anonymous";

    if (!token || !validateCsrfToken(token, sessionId)) {
        logger.warn("CSRF validation failed", {
            ip: req.ip,
            path: req.path,
            method: req.method,
        });
        return res.status(403).json({ error: "Invalid or missing security token." });
    }

    next();
}

// ─── Request Sanitizer ───────────────────────────────────────
export function sanitizeRequest(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    // Remove null bytes
    const sanitize = (obj: any): any => {
        if (typeof obj === "string") {
            return obj.replace(/\0/g, "");
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === "object") {
            const cleaned: any = {};
            for (const key of Object.keys(obj)) {
                // Prevent prototype pollution
                if (key === "__proto__" || key === "constructor" || key === "prototype") {
                    continue;
                }
                cleaned[key] = sanitize(obj[key]);
            }
            return cleaned;
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query) as any;
    if (req.params) req.params = sanitize(req.params);

    next();
}

// ─── Request Size Enforcer ──────────────────────────────────
export function enforceContentLength(maxBytes: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers["content-length"] || "0");
        if (contentLength > maxBytes) {
            logger.warn("Request too large", {
                ip: req.ip,
                size: contentLength,
                max: maxBytes,
            });
            return res.status(413).json({ error: "Request payload too large." });
        }
        next();
    };
}

// ─── Suspicious Pattern Detection ───────────────────────────
const SUSPICIOUS_PATTERNS = [
    /(<script[\s>])/gi,
    /(javascript:)/gi,
    /(on\w+\s*=)/gi,
    /(eval\s*\()/gi,
    /(document\.(cookie|domain|write))/gi,
    /(window\.(location|open))/gi,
    /(\.\.\/)/, // Path traversal
    /(\/etc\/passwd)/gi,
    /(union\s+select)/gi,
    /(insert\s+into)/gi,
    /(drop\s+table)/gi,
    /(;\s*rm\s+-)/gi, // Command injection
];

export function detectSuspiciousInput(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const bodyStr = JSON.stringify(req.body || {});
    const queryStr = JSON.stringify(req.query || {});
    const combined = bodyStr + queryStr;

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(combined)) {
            logger.error("🚨 Suspicious input detected!", {
                ip: req.ip,
                path: req.path,
                method: req.method,
                pattern: pattern.toString(),
                userAgent: req.headers["user-agent"],
            });
            return res.status(400).json({ error: "Invalid input detected." });
        }
    }

    next();
}

// ─── Security Event Logger ──────────────────────────────────
export function securityAuditLog(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    if (req.path.startsWith("/api/")) {
        logger.info("API Request", {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.headers["user-agent"]?.substring(0, 100),
            timestamp: new Date().toISOString(),
        });
    }
    next();
}