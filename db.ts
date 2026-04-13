import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "data.json");
const BACKUP_DIR = path.join(__dirname, "backups");

// ─── Types ──────────────────────────────────────────────────
export interface SocialLink {
    id: string;
    platform: string;
    url: string;
    label: string;
}

export interface PortfolioData {
    councillor: {
        name: string;
        party: string;
        ward: string;
        title: string;
        tagline: string;
        heroSubtitle: string;
        photoUrl: string;
    };
    about: {
        paragraphs: string[];
        values: string[];
    };
    initiatives: any[];
    committees: any[];
    news: any[];
    testimonials: any[];
    surgery: {
        location: string;
        time: string;
        dates: string[];
    };
    contact: {
        address: string[];
        phone: string;
        email: string;
        officeHours: string;
        socialLinks: SocialLink[];
    };
    adminPasswordHash: string;
    _meta: {
        version: number;
        lastModified: string;
        lastModifiedBy: string;
        createdAt: string;
        dataIntegrityHash: string;
    };
}

// ─── Default Data ────────────────────────────────────────────
const DEFAULT_DATA: PortfolioData = {
    councillor: {
        name: "Karthik Bonkur",
        party: "Labour",
        ward: "Hatfield South West",
        title: "Councillor",
        tagline: "Representing Hatfield South West",
        heroSubtitle:
            "Dedicated to building a stronger, fairer, and more connected community for every resident of Hatfield South West.",
        photoUrl: "",
    },
    about: {
        paragraphs: [
            "Councillor Karthik Bonkur is a dedicated Labour representative for the Hatfield South West ward on Welwyn Hatfield Borough Council.",
            "Since being elected, Karthik has focused on key issues affecting the Hatfield South West ward, including housing, green spaces, community safety, and ensuring that local services meet the needs of a diverse and growing community.",
        ],
        values: [
            "Community First",
            "Transparency & Accountability",
            "Inclusive Representation",
            "Sustainable Development",
        ],
    },
    initiatives: [],
    committees: [],
    news: [],
    testimonials: [],
    surgery: {
        location: "The Hilltop Community Centre",
        time: "11.30am - 1pm",
        dates: [],
    },
    contact: {
        address: ["3 Fern Dells", "Hatfield", "AL10 9HX"],
        phone: "07515909999",
        email: "karthik.bonkur@welhat.gov.uk",
        officeHours: "Monday - Friday, 9:00am - 5:00pm",
        socialLinks: [],
    },
    adminPasswordHash: "",
    _meta: {
        version: 1,
        lastModified: new Date().toISOString(),
        lastModifiedBy: "system",
        createdAt: new Date().toISOString(),
        dataIntegrityHash: "",
    },
};

// ─── Data Integrity ─────────────────────────────────────────
function computeIntegrityHash(data: any): string {
    const { _meta, ...content } = data;
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(content))
        .digest("hex");
}

// ─── Backup ─────────────────────────────────────────────────
function createBackup(): void {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        if (fs.existsSync(DATA_PATH)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const backupPath = path.join(BACKUP_DIR, `data-${timestamp}.json`);
            fs.copyFileSync(DATA_PATH, backupPath);

            // Keep only last 20 backups
            const backups = fs
                .readdirSync(BACKUP_DIR)
                .filter((f) => f.startsWith("data-"))
                .sort()
                .reverse();

            for (const old of backups.slice(20)) {
                fs.unlinkSync(path.join(BACKUP_DIR, old));
            }

            logger.info(`Backup created: ${backupPath}`);
        }
    } catch (err) {
        logger.error("Backup failed", { error: err });
    }
}

// ─── Initialize DB ──────────────────────────────────────────
export async function initDB(): Promise<void> {
    if (!fs.existsSync(DATA_PATH)) {
        const defaultPassword =
            process.env.ADMIN_DEFAULT_PASSWORD || "ChangeMe!Secur3#2025";

        // Hash with high cost factor
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(defaultPassword, salt);

        DEFAULT_DATA.adminPasswordHash = hash;
        DEFAULT_DATA._meta.dataIntegrityHash = computeIntegrityHash(DEFAULT_DATA);

        fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8");
        // Set restrictive file permissions (owner read/write only)
        try {
            fs.chmodSync(DATA_PATH, 0o600);
        } catch {
            // Windows doesn't support chmod
        }

        logger.info("✅ data.json initialized with default content.");
        logger.warn(
            `⚠️  Default admin password is set. Change it immediately via the admin panel!`
        );
    } else {
        // Verify data integrity on startup
        try {
            const data = readData();
            const currentHash = computeIntegrityHash(data);
            if (
                data._meta?.dataIntegrityHash &&
                data._meta.dataIntegrityHash !== currentHash
            ) {
                logger.error(
                    "🚨 DATA INTEGRITY CHECK FAILED! data.json may have been tampered with outside the application."
                );
            } else {
                logger.info("📂 data.json loaded. Integrity check passed ✅");
            }
        } catch {
            logger.error("Failed to read data.json on startup");
        }
    }
}

// ─── Read Data ──────────────────────────────────────────────
export function readData(): PortfolioData {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as PortfolioData;
}

// ─── Write Data (with backup + integrity) ───────────────────
export function writeData(data: PortfolioData, modifiedBy: string = "admin"): void {
    createBackup();

    data._meta = {
        ...data._meta,
        version: (data._meta?.version || 0) + 1,
        lastModified: new Date().toISOString(),
        lastModifiedBy: modifiedBy,
        dataIntegrityHash: computeIntegrityHash(data),
    };

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
    try {
        fs.chmodSync(DATA_PATH, 0o600);
    } catch {
        // Windows compatibility
    }
}

// ─── Get Public Data (strip sensitive fields) ───────────────
export function getPublicData(
    data: PortfolioData
): Omit<PortfolioData, "adminPasswordHash" | "_meta"> {
    const { adminPasswordHash, _meta, ...publicData } = data;
    return publicData;
}