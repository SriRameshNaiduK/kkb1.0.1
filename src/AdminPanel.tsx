import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
    X,
    Lock,
    LogOut,
    Save,
    CheckCircle,
    AlertCircle,
    Loader2,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Upload,
    KeyRound,
    ShieldCheck,
    Info,
} from "lucide-react";
import { api, setCsrfToken, clearCsrfToken } from "./lib/api";

// ─── Types ───────────────────────────────────────────────────
interface Initiative {
    id: string;
    title: string;
    summary: string;
    details: string;
    icon: string;
    status: string;
}

interface Committee {
    id: string;
    name: string;
    role: string;
    description: string;
}

interface NewsItem {
    id: string;
    title: string;
    date: string;
    summary: string;
    content: string;
}

interface Testimonial {
    id: string;
    quote: string;
    author: string;
    role: string;
}

interface SocialLink {
    id: string;
    platform: string;
    url: string;
    label: string;
}

interface ContactInfo {
    address: string[];
    phone: string;
    email: string;
    officeHours: string;
    socialLinks: SocialLink[];
}

interface PortfolioContent {
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
    initiatives: Initiative[];
    committees: Committee[];
    news: NewsItem[];
    testimonials: Testimonial[];
    surgery: {
        location: string;
        time: string;
        dates: string[];
    };
    contact: ContactInfo;
}

interface AdminPanelProps {
    content: PortfolioContent;
    onClose: () => void;
    onUpdate: (content: PortfolioContent) => void;
}

// ─── Stable Input Components (OUTSIDE component to prevent remount) ───
function StableInput({
                         label,
                         value,
                         onChange,
                         type = "text",
                         placeholder = "",
                     }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none transition-all text-sm"
            />
        </div>
    );
}

function StableTextArea({
                            label,
                            value,
                            onChange,
                            rows = 3,
                        }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    rows?: number;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="w-full px-4 py-2.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none transition-all text-sm resize-vertical"
            />
        </div>
    );
}

// ─── Image Upload Component ──────────────────────────────────
function ImageUploader({
                           label,
                           currentUrl,
                           onUploaded,
                       }: {
    label: string;
    currentUrl: string;
    onUploaded: (url: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("Image must be under 5MB.");
            return;
        }

        setError("");
        setUploading(true);

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;

                const res = await api.post("/api/upload", {
                    image: base64,
                    filename: file.name,
                });

                if (res.ok) {
                    const data = await res.json();
                    onUploaded(data.url);
                } else {
                    const err = await res.json();
                    setError(err.error || "Upload failed.");
                }
                setUploading(false);
            };
            reader.onerror = () => {
                setError("Failed to read file.");
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch {
            setError("Upload failed. Please try again.");
            setUploading(false);
        }

        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                {label}
            </label>

            {currentUrl && (
                <div className="mb-3 relative inline-block">
                    <img
                        src={currentUrl}
                        alt="Preview"
                        className="w-32 h-32 rounded-xl object-cover border-2 border-navy-200"
                    />
                    <button
                        onClick={() => onUploaded("")}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3">
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-100 text-navy-700 rounded-lg text-sm font-medium hover:bg-navy-200 transition-colors disabled:opacity-50"
                >
                    {uploading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Upload size={16} />
                    )}
                    {uploading ? "Uploading..." : "Choose Image"}
                </button>

                <span className="text-navy-400 text-xs">or</span>
                <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => onUploaded(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 px-3 py-2 rounded-lg border border-navy-200 text-sm focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none"
                />
            </div>

            {error && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
}

// ─── Password Strength Meter ─────────────────────────────────
function PasswordStrengthMeter({ password }: { password: string }) {
    if (!password) return null;

    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
    const colors = [
        "bg-red-500",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-green-500",
        "bg-emerald-500",
    ];

    const index = Math.min(score, 4);

    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= index ? colors[index] : "bg-navy-200"
                        }`}
                    />
                ))}
            </div>
            <p className="text-xs text-navy-500">
                Strength: <span className="font-medium">{labels[index]}</span>
            </p>
        </div>
    );
}

// ─── Toast Notification ─────────────────────────────────────
function Toast({
                   message,
                   type,
                   onClose,
               }: {
    message: string;
    type: "success" | "error";
    onClose: () => void;
}) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[100] px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 font-medium ${
                type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
        >
            {type === "success" ? (
                <CheckCircle size={18} />
            ) : (
                <AlertCircle size={18} />
            )}
            {message}
        </motion.div>
    );
}

// ─── Admin Panel Component ────────────────────────────────────
export default function AdminPanel({
                                       content,
                                       onClose,
                                       onUpdate,
                                   }: AdminPanelProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const [editData, setEditData] = useState<PortfolioContent>(
        JSON.parse(JSON.stringify(content))
    );
    const [activeTab, setActiveTab] = useState("councillor");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    // Password change state
    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdErrors, setPwdErrors] = useState<string[]>([]);

    // Check existing auth
    useEffect(() => {
        api
            .get("/api/auth-check")
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) setIsAuthenticated(true);
            })
            .catch(() => {})
            .finally(() => setCheckingAuth(false));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError("");

        try {
            const res = await api.post("/api/login", { password });

            if (res.ok) {
                const data = await res.json();
                if (data.csrfToken) {
                    setCsrfToken(data.csrfToken);
                }
                setIsAuthenticated(true);
                setPassword("");
            } else {
                const data = await res.json();
                setLoginError(data.error || "Login failed.");
            }
        } catch {
            setLoginError("Network error. Please try again.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = async () => {
        await api.post("/api/logout");
        clearCsrfToken();
        setIsAuthenticated(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put("/api/content", editData);

            if (res.ok) {
                const result = await res.json();
                onUpdate(result.data);
                setToast({ message: "Content saved successfully!", type: "success" });
            } else {
                const err = await res.json();
                setToast({
                    message: err.error || "Failed to save.",
                    type: "error",
                });
            }
        } catch {
            setToast({ message: "Network error. Please try again.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdErrors([]);

        if (newPwd !== confirmPwd) {
            setPwdErrors(["New passwords do not match."]);
            return;
        }

        setChangingPwd(true);

        try {
            const res = await api.post("/api/change-password", {
                currentPassword: currentPwd,
                newPassword: newPwd,
            });

            if (res.ok) {
                setToast({
                    message: "Password changed. Please log in again.",
                    type: "success",
                });
                clearCsrfToken();
                setIsAuthenticated(false);
                setCurrentPwd("");
                setNewPwd("");
                setConfirmPwd("");
            } else {
                const data = await res.json();
                if (data.details) {
                    setPwdErrors(data.details);
                } else {
                    setPwdErrors([data.error || "Failed to change password."]);
                }
            }
        } catch {
            setPwdErrors(["Network error."]);
        } finally {
            setChangingPwd(false);
        }
    };

    // ─── Helper functions for immutable state updates ───────────
    const updateCouncillor = (field: string, value: string) => {
        setEditData((prev) => ({
            ...prev,
            councillor: { ...prev.councillor, [field]: value },
        }));
    };

    const updateContact = (field: string, value: any) => {
        setEditData((prev) => ({
            ...prev,
            contact: { ...prev.contact, [field]: value },
        }));
    };

    const updateSurgery = (field: string, value: any) => {
        setEditData((prev) => ({
            ...prev,
            surgery: { ...prev.surgery, [field]: value },
        }));
    };

    const updateAbout = (field: string, value: any) => {
        setEditData((prev) => ({
            ...prev,
            about: { ...prev.about, [field]: value },
        }));
    };

    const updateInitiative = (index: number, field: string, value: string) => {
        setEditData((prev) => {
            const updated = [...prev.initiatives];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, initiatives: updated };
        });
    };

    const updateCommittee = (index: number, field: string, value: string) => {
        setEditData((prev) => {
            const updated = [...prev.committees];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, committees: updated };
        });
    };

    const updateNewsItem = (index: number, field: string, value: string) => {
        setEditData((prev) => {
            const updated = [...prev.news];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, news: updated };
        });
    };

    const updateTestimonial = (index: number, field: string, value: string) => {
        setEditData((prev) => {
            const updated = [...prev.testimonials];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, testimonials: updated };
        });
    };

    const updateSocialLink = (index: number, field: string, value: string) => {
        setEditData((prev) => {
            const updated = [...prev.contact.socialLinks];
            updated[index] = { ...updated[index], [field]: value };
            return {
                ...prev,
                contact: { ...prev.contact, socialLinks: updated },
            };
        });
    };

    // ─── Tabs ──────────────────────────────────────────────────
    const tabs = [
        { id: "councillor", label: "👤 Profile" },
        { id: "about", label: "📝 About" },
        { id: "initiatives", label: "🎯 Initiatives" },
        { id: "committees", label: "🏛 Committees" },
        { id: "news", label: "📰 News" },
        { id: "testimonials", label: "💬 Testimonials" },
        { id: "surgery", label: "🗓 Surgeries" },
        { id: "contact", label: "📞 Contact" },
        { id: "social", label: "🔗 Social Media" },
        { id: "security", label: "🔒 Security" },
    ];

    // ─── Render Tab Content ────────────────────────────────────
    const renderTabContent = () => {
        switch (activeTab) {
            case "councillor":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-navy-900">
                            Councillor Profile
                        </h3>
                        <ImageUploader
                            label="Profile Photo"
                            currentUrl={editData.councillor.photoUrl}
                            onUploaded={(url) => updateCouncillor("photoUrl", url)}
                        />
                        <StableInput
                            label="Name"
                            value={editData.councillor.name}
                            onChange={(val) => updateCouncillor("name", val)}
                        />
                        <StableInput
                            label="Title"
                            value={editData.councillor.title}
                            onChange={(val) => updateCouncillor("title", val)}
                        />
                        <StableInput
                            label="Party"
                            value={editData.councillor.party}
                            onChange={(val) => updateCouncillor("party", val)}
                        />
                        <StableInput
                            label="Ward"
                            value={editData.councillor.ward}
                            onChange={(val) => updateCouncillor("ward", val)}
                        />
                        <StableInput
                            label="Tagline"
                            value={editData.councillor.tagline}
                            onChange={(val) => updateCouncillor("tagline", val)}
                        />
                        <StableTextArea
                            label="Hero Subtitle"
                            value={editData.councillor.heroSubtitle}
                            onChange={(val) => updateCouncillor("heroSubtitle", val)}
                        />
                    </div>
                );

            case "about":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-navy-900">About Section</h3>
                        {editData.about.paragraphs.map((p, i) => (
                            <div key={`para-${i}`} className="relative">
                                <StableTextArea
                                    label={`Paragraph ${i + 1}`}
                                    value={p}
                                    onChange={(val) => {
                                        const updated = [...editData.about.paragraphs];
                                        updated[i] = val;
                                        updateAbout("paragraphs", updated);
                                    }}
                                    rows={4}
                                />
                                {editData.about.paragraphs.length > 1 && (
                                    <button
                                        onClick={() => {
                                            const updated = editData.about.paragraphs.filter(
                                                (_, idx) => idx !== i
                                            );
                                            updateAbout("paragraphs", updated);
                                        }}
                                        className="absolute top-0 right-0 p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() =>
                                updateAbout("paragraphs", [
                                    ...editData.about.paragraphs,
                                    "",
                                ])
                            }
                            className="inline-flex items-center gap-1 text-sm text-civic-teal font-semibold hover:underline"
                        >
                            <Plus size={14} /> Add Paragraph
                        </button>

                        <div className="border-t border-navy-100 pt-4">
                            <h4 className="text-sm font-bold text-navy-700 mb-3">
                                Core Values
                            </h4>
                            {editData.about.values.map((v, i) => (
                                <div key={`val-${i}`} className="flex gap-2 mb-2">
                                    <input
                                        value={v}
                                        onChange={(e) => {
                                            const updated = [...editData.about.values];
                                            updated[i] = e.target.value;
                                            updateAbout("values", updated);
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg border border-navy-200 text-sm focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            const updated = editData.about.values.filter(
                                                (_, idx) => idx !== i
                                            );
                                            updateAbout("values", updated);
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() =>
                                    updateAbout("values", [...editData.about.values, ""])
                                }
                                className="inline-flex items-center gap-1 text-sm text-civic-teal font-semibold hover:underline"
                            >
                                <Plus size={14} /> Add Value
                            </button>
                        </div>
                    </div>
                );

            case "initiatives":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-navy-900">Initiatives</h3>
                            <button
                                onClick={() => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        initiatives: [
                                            ...prev.initiatives,
                                            {
                                                id: Date.now().toString(),
                                                title: "",
                                                summary: "",
                                                details: "",
                                                icon: "Target",
                                                status: "Planning",
                                            },
                                        ],
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {editData.initiatives.map((init, i) => (
                            <div
                                key={init.id}
                                className="bg-navy-50 rounded-xl p-4 space-y-3 relative"
                            >
                                <button
                                    onClick={() => {
                                        setEditData((prev) => ({
                                            ...prev,
                                            initiatives: prev.initiatives.filter(
                                                (_, idx) => idx !== i
                                            ),
                                        }));
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <StableInput
                                    label="Title"
                                    value={init.title}
                                    onChange={(val) => updateInitiative(i, "title", val)}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <StableInput
                                        label="Icon"
                                        value={init.icon}
                                        onChange={(val) => updateInitiative(i, "icon", val)}
                                        placeholder="e.g. Building2"
                                    />
                                    <StableInput
                                        label="Status"
                                        value={init.status}
                                        onChange={(val) => updateInitiative(i, "status", val)}
                                        placeholder="e.g. Active"
                                    />
                                </div>
                                <StableTextArea
                                    label="Summary"
                                    value={init.summary}
                                    onChange={(val) => updateInitiative(i, "summary", val)}
                                />
                                <StableTextArea
                                    label="Details"
                                    value={init.details}
                                    onChange={(val) => updateInitiative(i, "details", val)}
                                    rows={4}
                                />
                            </div>
                        ))}
                    </div>
                );

            case "committees":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-navy-900">Committees</h3>
                            <button
                                onClick={() => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        committees: [
                                            ...prev.committees,
                                            {
                                                id: Date.now().toString(),
                                                name: "",
                                                role: "Member",
                                                description: "",
                                            },
                                        ],
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {editData.committees.map((comm, i) => (
                            <div
                                key={comm.id}
                                className="bg-navy-50 rounded-xl p-4 space-y-3 relative"
                            >
                                <button
                                    onClick={() => {
                                        setEditData((prev) => ({
                                            ...prev,
                                            committees: prev.committees.filter(
                                                (_, idx) => idx !== i
                                            ),
                                        }));
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <StableInput
                                    label="Name"
                                    value={comm.name}
                                    onChange={(val) => updateCommittee(i, "name", val)}
                                />
                                <StableInput
                                    label="Role"
                                    value={comm.role}
                                    onChange={(val) => updateCommittee(i, "role", val)}
                                />
                                <StableTextArea
                                    label="Description"
                                    value={comm.description}
                                    onChange={(val) => updateCommittee(i, "description", val)}
                                />
                            </div>
                        ))}
                    </div>
                );

            case "news":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-navy-900">News</h3>
                            <button
                                onClick={() => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        news: [
                                            ...prev.news,
                                            {
                                                id: Date.now().toString(),
                                                title: "",
                                                date: new Date().toISOString().split("T")[0],
                                                summary: "",
                                                content: "",
                                            },
                                        ],
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {editData.news.map((item, i) => (
                            <div
                                key={item.id}
                                className="bg-navy-50 rounded-xl p-4 space-y-3 relative"
                            >
                                <button
                                    onClick={() => {
                                        setEditData((prev) => ({
                                            ...prev,
                                            news: prev.news.filter((_, idx) => idx !== i),
                                        }));
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <StableInput
                                    label="Title"
                                    value={item.title}
                                    onChange={(val) => updateNewsItem(i, "title", val)}
                                />
                                <StableInput
                                    label="Date"
                                    value={item.date}
                                    onChange={(val) => updateNewsItem(i, "date", val)}
                                    type="date"
                                />
                                <StableTextArea
                                    label="Summary"
                                    value={item.summary}
                                    onChange={(val) => updateNewsItem(i, "summary", val)}
                                />
                                <StableTextArea
                                    label="Full Content"
                                    value={item.content}
                                    onChange={(val) => updateNewsItem(i, "content", val)}
                                    rows={4}
                                />
                            </div>
                        ))}
                    </div>
                );

            case "testimonials":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-navy-900">Testimonials</h3>
                            <button
                                onClick={() => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        testimonials: [
                                            ...prev.testimonials,
                                            {
                                                id: Date.now().toString(),
                                                quote: "",
                                                author: "",
                                                role: "",
                                            },
                                        ],
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {editData.testimonials.map((test, i) => (
                            <div
                                key={test.id}
                                className="bg-navy-50 rounded-xl p-4 space-y-3 relative"
                            >
                                <button
                                    onClick={() => {
                                        setEditData((prev) => ({
                                            ...prev,
                                            testimonials: prev.testimonials.filter(
                                                (_, idx) => idx !== i
                                            ),
                                        }));
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <StableTextArea
                                    label="Quote"
                                    value={test.quote}
                                    onChange={(val) => updateTestimonial(i, "quote", val)}
                                    rows={3}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <StableInput
                                        label="Author"
                                        value={test.author}
                                        onChange={(val) => updateTestimonial(i, "author", val)}
                                    />
                                    <StableInput
                                        label="Role"
                                        value={test.role}
                                        onChange={(val) => updateTestimonial(i, "role", val)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case "surgery":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-navy-900">
                            Surgery Details
                        </h3>
                        <StableInput
                            label="Location"
                            value={editData.surgery.location}
                            onChange={(val) => updateSurgery("location", val)}
                        />
                        <StableInput
                            label="Time"
                            value={editData.surgery.time}
                            onChange={(val) => updateSurgery("time", val)}
                        />
                        <div>
                            <label className="block text-sm font-semibold text-navy-700 mb-2">
                                Dates
                            </label>
                            {editData.surgery.dates.map((d, i) => (
                                <div key={`surg-date-${i}`} className="flex gap-2 mb-2">
                                    <input
                                        value={d}
                                        onChange={(e) => {
                                            const updated = [...editData.surgery.dates];
                                            updated[i] = e.target.value;
                                            updateSurgery("dates", updated);
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg border border-navy-200 text-sm focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none"
                                        placeholder="DD/MM/YY"
                                    />
                                    <button
                                        onClick={() => {
                                            const updated = editData.surgery.dates.filter(
                                                (_, idx) => idx !== i
                                            );
                                            updateSurgery("dates", updated);
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() =>
                                    updateSurgery("dates", [...editData.surgery.dates, ""])
                                }
                                className="inline-flex items-center gap-1 text-sm text-civic-teal font-semibold hover:underline"
                            >
                                <Plus size={14} /> Add Date
                            </button>
                        </div>
                    </div>
                );

            case "contact":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-navy-900">
                            Contact Information
                        </h3>
                        <StableInput
                            label="Email"
                            value={editData.contact.email}
                            onChange={(val) => updateContact("email", val)}
                            type="email"
                        />
                        <StableInput
                            label="Phone"
                            value={editData.contact.phone}
                            onChange={(val) => updateContact("phone", val)}
                            type="tel"
                        />
                        <div>
                            <label className="block text-sm font-semibold text-navy-700 mb-2">
                                Address Lines
                            </label>
                            {editData.contact.address.map((line, i) => (
                                <div key={`addr-${i}`} className="flex gap-2 mb-2">
                                    <input
                                        value={line}
                                        onChange={(e) => {
                                            const updated = [...editData.contact.address];
                                            updated[i] = e.target.value;
                                            updateContact("address", updated);
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg border border-navy-200 text-sm focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none"
                                    />
                                    {editData.contact.address.length > 1 && (
                                        <button
                                            onClick={() => {
                                                const updated = editData.contact.address.filter(
                                                    (_, idx) => idx !== i
                                                );
                                                updateContact("address", updated);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() =>
                                    updateContact("address", [
                                        ...editData.contact.address,
                                        "",
                                    ])
                                }
                                className="inline-flex items-center gap-1 text-sm text-civic-teal font-semibold hover:underline"
                            >
                                <Plus size={14} /> Add Line
                            </button>
                        </div>
                        <StableInput
                            label="Office Hours"
                            value={editData.contact.officeHours}
                            onChange={(val) => updateContact("officeHours", val)}
                        />
                    </div>
                );

            case "social":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-navy-900">
                                    Social Media Links
                                </h3>
                                <p className="text-navy-500 text-xs mt-1">
                                    Icons and colours are auto-detected from the platform name.
                                    Supported: Twitter, LinkedIn, Facebook, Instagram, YouTube,
                                    GitHub, WhatsApp, Telegram, TikTok, Email, Website, Blog
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        contact: {
                                            ...prev.contact,
                                            socialLinks: [
                                                ...prev.contact.socialLinks,
                                                {
                                                    id: Date.now().toString(),
                                                    platform: "",
                                                    url: "",
                                                    label: "",
                                                },
                                            ],
                                        },
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors flex-shrink-0"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {editData.contact.socialLinks.map((link, i) => (
                            <div
                                key={link.id}
                                className="bg-navy-50 rounded-xl p-4 space-y-3 relative"
                            >
                                <button
                                    onClick={() => {
                                        setEditData((prev) => ({
                                            ...prev,
                                            contact: {
                                                ...prev.contact,
                                                socialLinks: prev.contact.socialLinks.filter(
                                                    (_, idx) => idx !== i
                                                ),
                                            },
                                        }));
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="grid grid-cols-3 gap-3">
                                    <StableInput
                                        label="Platform"
                                        value={link.platform}
                                        onChange={(val) => updateSocialLink(i, "platform", val)}
                                        placeholder="e.g. Twitter"
                                    />
                                    <StableInput
                                        label="Label (button text)"
                                        value={link.label}
                                        onChange={(val) => updateSocialLink(i, "label", val)}
                                        placeholder="e.g. Follow"
                                    />
                                    <StableInput
                                        label="URL"
                                        value={link.url}
                                        onChange={(val) => updateSocialLink(i, "url", val)}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case "security":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                                <ShieldCheck size={20} className="text-civic-teal" />
                                Security Settings
                            </h3>
                            <p className="text-navy-500 text-sm mt-1">
                                Manage your admin credentials and security preferences.
                            </p>
                        </div>

                        {/* Security Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <Info
                                    size={18}
                                    className="text-blue-600 mt-0.5 flex-shrink-0"
                                />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">
                                        Security Features Active
                                    </p>
                                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                                        <li>HTTP security headers (Helmet + CSP)</li>
                                        <li>Rate limiting on all endpoints</li>
                                        <li>Brute-force protection with account lockout</li>
                                        <li>CSRF token protection on all mutations</li>
                                        <li>Input sanitisation & XSS prevention</li>
                                        <li>JWT with short-lived access + refresh tokens</li>
                                        <li>File upload validation with magic byte checks</li>
                                        <li>Automatic data backups on every change</li>
                                        <li>Data integrity verification (SHA-256)</li>
                                        <li>Full audit logging</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="bg-navy-50 rounded-xl p-6 border border-navy-100">
                            <h4 className="text-md font-bold text-navy-900 flex items-center gap-2 mb-4">
                                <KeyRound size={18} className="text-civic-teal" />
                                Change Admin Password
                            </h4>

                            <form
                                onSubmit={handleChangePassword}
                                className="space-y-4 max-w-md"
                            >
                                <div>
                                    <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPwd}
                                        onChange={(e) => setCurrentPwd(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPwd}
                                        onChange={(e) => setNewPwd(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none text-sm"
                                        required
                                        minLength={12}
                                    />
                                    <PasswordStrengthMeter password={newPwd} />
                                    <p className="text-xs text-navy-400 mt-1">
                                        Min 12 chars, uppercase, lowercase, number, special
                                        character.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPwd}
                                        onChange={(e) => setConfirmPwd(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none text-sm ${
                                            confirmPwd && confirmPwd !== newPwd
                                                ? "border-red-400"
                                                : "border-navy-200"
                                        }`}
                                        required
                                    />
                                    {confirmPwd && confirmPwd !== newPwd && (
                                        <p className="text-red-500 text-xs mt-1">
                                            Passwords do not match.
                                        </p>
                                    )}
                                </div>

                                {pwdErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        {pwdErrors.map((err, i) => (
                                            <p
                                                key={i}
                                                className="text-red-700 text-sm flex items-center gap-1.5"
                                            >
                                                <AlertCircle size={14} />
                                                {err}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        changingPwd ||
                                        !currentPwd ||
                                        !newPwd ||
                                        !confirmPwd ||
                                        newPwd !== confirmPwd
                                    }
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-800 text-white rounded-lg font-semibold text-sm hover:bg-navy-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {changingPwd ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <KeyRound size={16} />
                                    )}
                                    {changingPwd ? "Changing..." : "Change Password"}
                                </button>
                            </form>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ─── Render ─────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 bg-navy-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-800 rounded-xl flex items-center justify-center">
                            <Lock size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-navy-900">Admin Panel</h2>
                            <p className="text-navy-500 text-xs">
                                Manage portfolio content securely
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAuthenticated && (
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
                            >
                                <LogOut size={14} />
                                Logout
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-navy-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-navy-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {checkingAuth ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-civic-teal" />
                        </div>
                    ) : !isAuthenticated ? (
                        /* Login Form */
                        <div className="flex items-center justify-center py-20 px-6">
                            <div className="w-full max-w-sm">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-navy-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Lock size={28} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-navy-900">
                                        Admin Access
                                    </h3>
                                    <p className="text-navy-500 text-sm mt-1">
                                        Enter the admin password to continue
                                    </p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="w-full px-4 py-3 pr-12 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-civic-teal/30 focus:border-civic-teal outline-none transition-all"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-navy-400 hover:text-navy-600"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}
                                        </button>
                                    </div>

                                    {loginError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-red-700 text-sm flex items-center gap-1.5">
                                                <AlertCircle size={14} />
                                                {loginError}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loginLoading || !password}
                                        className="w-full py-3 bg-navy-800 text-white rounded-xl font-semibold hover:bg-navy-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loginLoading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Lock size={18} />
                                        )}
                                        {loginLoading ? "Authenticating..." : "Login"}
                                    </button>
                                </form>

                                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-amber-800 text-xs flex items-start gap-1.5">
                                        <AlertCircle
                                            size={14}
                                            className="flex-shrink-0 mt-0.5"
                                        />
                                        <span>
                      This admin area is protected by rate limiting and
                      brute-force detection. After 5 failed attempts, access
                      will be temporarily locked for 15 minutes.
                    </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Authenticated Dashboard */
                        <div className="flex flex-col sm:flex-row h-full min-h-[400px]">
                            {/* Sidebar Tabs */}
                            <div className="sm:w-52 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-navy-100 bg-navy-50/30">
                                <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible p-2 gap-1">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-left ${
                                                activeTab === tab.id
                                                    ? "bg-civic-teal text-white shadow-sm"
                                                    : "text-navy-600 hover:bg-navy-100"
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {renderTabContent()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer — Save button (only when authenticated and NOT on security tab) */}
                {isAuthenticated && !checkingAuth && activeTab !== "security" && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-navy-100 bg-navy-50/50 flex-shrink-0">
                        <p className="text-navy-400 text-xs hidden sm:block">
                            All changes are sanitised, validated, and backed up automatically.
                        </p>
                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                onClick={() =>
                                    setEditData(JSON.parse(JSON.stringify(content)))
                                }
                                className="px-4 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
                            >
                                Reset Changes
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-civic-teal text-white rounded-lg font-semibold text-sm hover:bg-civic-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-civic-teal/20"
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}