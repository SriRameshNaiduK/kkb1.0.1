import DOMPurify from "isomorphic-dompurify";

// ─── Sanitize HTML/XSS from strings ────────────────────────
export function sanitizeString(input: string): string {
    if (typeof input !== "string") return "";

    // Strip all HTML tags
    let clean = DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // No HTML allowed
        ALLOWED_ATTR: [],
    });

    // Remove null bytes
    clean = clean.replace(/\0/g, "");

    // Trim excessive whitespace
    clean = clean.replace(/\s{10,}/g, " ").trim();

    return clean;
}

// ─── Sanitize URL ───────────────────────────────────────────
export function sanitizeUrl(input: string): string {
    if (typeof input !== "string") return "";

    const trimmed = input.trim();

    // Allow only http, https, mailto, tel protocols
    const allowedProtocols = [
        "http://",
        "https://",
        "mailto:",
        "tel:",
    ];

    const hasAllowedProtocol = allowedProtocols.some((p) =>
        trimmed.toLowerCase().startsWith(p)
    );

    if (!hasAllowedProtocol && trimmed.length > 0) {
        // If no protocol, assume https
        if (trimmed.includes("@")) return `mailto:${trimmed}`;
        return `https://${trimmed}`;
    }

    // Block javascript: protocol
    if (trimmed.toLowerCase().startsWith("javascript:")) return "";
    if (trimmed.toLowerCase().startsWith("data:")) return "";
    if (trimmed.toLowerCase().startsWith("vbscript:")) return "";

    return trimmed;
}

// ─── Validate Email ─────────────────────────────────────────
export function isValidEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email) && email.length <= 254;
}

// ─── Validate Phone ─────────────────────────────────────────
export function isValidPhone(phone: string): boolean {
    const re = /^[+]?[\d\s()-]{7,20}$/;
    return re.test(phone);
}

// ─── Password Strength Validator ────────────────────────────
export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: "weak" | "fair" | "strong" | "very-strong";
}

export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 12) {
        errors.push("Must be at least 12 characters long.");
    }
    if (password.length > 128) {
        errors.push("Must be no more than 128 characters.");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Must contain at least one lowercase letter.");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Must contain at least one number.");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push("Must contain at least one special character.");
    }

    // Common password check
    const commonPasswords = [
        "password123",
        "admin123",
        "123456789",
        "qwerty",
        "password1",
        "letmein",
        "welcome1",
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push("This password is too common.");
    }

    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 20) score++;

    let strength: PasswordValidation["strength"] = "weak";
    if (score >= 5) strength = "very-strong";
    else if (score >= 4) strength = "strong";
    else if (score >= 3) strength = "fair";

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
}

// ─── Sanitize Portfolio Content ─────────────────────────────
export function sanitizePortfolioContent(data: any): any {
    if (!data || typeof data !== "object") return data;

    const sanitized = { ...data };

    // Councillor
    if (sanitized.councillor) {
        sanitized.councillor = {
            ...sanitized.councillor,
            name: sanitizeString(sanitized.councillor.name || "").substring(0, 100),
            party: sanitizeString(sanitized.councillor.party || "").substring(0, 50),
            ward: sanitizeString(sanitized.councillor.ward || "").substring(0, 100),
            title: sanitizeString(sanitized.councillor.title || "").substring(0, 50),
            tagline: sanitizeString(sanitized.councillor.tagline || "").substring(
                0,
                200
            ),
            heroSubtitle: sanitizeString(
                sanitized.councillor.heroSubtitle || ""
            ).substring(0, 500),
            photoUrl: sanitizeUrl(sanitized.councillor.photoUrl || ""),
        };
    }

    // About
    if (sanitized.about) {
        sanitized.about = {
            paragraphs: (sanitized.about.paragraphs || [])
                .slice(0, 10)
                .map((p: string) => sanitizeString(p).substring(0, 2000)),
            values: (sanitized.about.values || [])
                .slice(0, 20)
                .map((v: string) => sanitizeString(v).substring(0, 100)),
        };
    }

    // Initiatives
    if (sanitized.initiatives) {
        sanitized.initiatives = (sanitized.initiatives || [])
            .slice(0, 20)
            .map((init: any) => ({
                id: sanitizeString(String(init.id || "")).substring(0, 50),
                title: sanitizeString(init.title || "").substring(0, 200),
                summary: sanitizeString(init.summary || "").substring(0, 500),
                details: sanitizeString(init.details || "").substring(0, 5000),
                icon: sanitizeString(init.icon || "Target").substring(0, 30),
                status: sanitizeString(init.status || "Planning").substring(0, 30),
            }));
    }

    // Committees
    if (sanitized.committees) {
        sanitized.committees = (sanitized.committees || [])
            .slice(0, 20)
            .map((comm: any) => ({
                id: sanitizeString(String(comm.id || "")).substring(0, 50),
                name: sanitizeString(comm.name || "").substring(0, 200),
                role: sanitizeString(comm.role || "").substring(0, 100),
                description: sanitizeString(comm.description || "").substring(0, 1000),
            }));
    }

    // News
    if (sanitized.news) {
        sanitized.news = (sanitized.news || []).slice(0, 50).map((item: any) => ({
            id: sanitizeString(String(item.id || "")).substring(0, 50),
            title: sanitizeString(item.title || "").substring(0, 300),
            date: sanitizeString(item.date || "").substring(0, 20),
            summary: sanitizeString(item.summary || "").substring(0, 500),
            content: sanitizeString(item.content || "").substring(0, 5000),
        }));
    }

    // Testimonials
    if (sanitized.testimonials) {
        sanitized.testimonials = (sanitized.testimonials || [])
            .slice(0, 30)
            .map((test: any) => ({
                id: sanitizeString(String(test.id || "")).substring(0, 50),
                quote: sanitizeString(test.quote || "").substring(0, 1000),
                author: sanitizeString(test.author || "").substring(0, 100),
                role: sanitizeString(test.role || "").substring(0, 100),
            }));
    }

    // Surgery
    if (sanitized.surgery) {
        sanitized.surgery = {
            location: sanitizeString(sanitized.surgery.location || "").substring(
                0,
                200
            ),
            time: sanitizeString(sanitized.surgery.time || "").substring(0, 50),
            dates: (sanitized.surgery.dates || [])
                .slice(0, 50)
                .map((d: string) => sanitizeString(d).substring(0, 20)),
        };
    }

    // Contact
    if (sanitized.contact) {
        sanitized.contact = {
            address: (sanitized.contact.address || [])
                .slice(0, 5)
                .map((a: string) => sanitizeString(a).substring(0, 200)),
            phone: sanitizeString(sanitized.contact.phone || "").substring(0, 20),
            email: sanitizeString(sanitized.contact.email || "").substring(0, 254),
            officeHours: sanitizeString(
                sanitized.contact.officeHours || ""
            ).substring(0, 200),
            socialLinks: (sanitized.contact.socialLinks || [])
                .slice(0, 15)
                .map((link: any) => ({
                    id: sanitizeString(String(link.id || "")).substring(0, 50),
                    platform: sanitizeString(link.platform || "").substring(0, 50),
                    url: sanitizeUrl(link.url || ""),
                    label: sanitizeString(link.label || "").substring(0, 50),
                })),
        };
    }

    return sanitized;
}

// ─── Validate Image Upload ──────────────────────────────────
export interface ImageValidation {
    isValid: boolean;
    error?: string;
}

export function validateImageUpload(
    base64Data: string,
    filename: string
): ImageValidation {
    // Check data URL format
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
        return { isValid: false, error: "Invalid image data format." };
    }

    const mimeType = `image/${matches[1]}`;
    const allowedTypes = (
        process.env.ALLOWED_IMAGE_TYPES ||
        "image/jpeg,image/png,image/webp,image/gif"
    ).split(",");

    if (!allowedTypes.includes(mimeType)) {
        return {
            isValid: false,
            error: `Invalid image type: ${mimeType}. Allowed: ${allowedTypes.join(", ")}`,
        };
    }

    // Decode and check size
    const buffer = Buffer.from(matches[2], "base64");
    const maxSize =
        (parseInt(process.env.MAX_UPLOAD_SIZE_MB || "5") || 5) * 1024 * 1024;

    if (buffer.length > maxSize) {
        return {
            isValid: false,
            error: `Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Max: ${maxSize / 1024 / 1024}MB.`,
        };
    }

    // Validate magic bytes (file signature)
    const magicBytes: Record<string, number[]> = {
        "image/jpeg": [0xff, 0xd8, 0xff],
        "image/png": [0x89, 0x50, 0x4e, 0x47],
        "image/gif": [0x47, 0x49, 0x46],
        "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
    };

    const expectedBytes = magicBytes[mimeType];
    if (expectedBytes) {
        const fileBytes = Array.from(buffer.slice(0, expectedBytes.length));
        const isValidSignature = expectedBytes.every(
            (byte, i) => fileBytes[i] === byte
        );
        if (!isValidSignature) {
            return {
                isValid: false,
                error: "File content does not match its declared type.",
            };
        }
    }

    // Validate filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (safeFilename.length > 255) {
        return { isValid: false, error: "Filename too long." };
    }

    return { isValid: true };
}