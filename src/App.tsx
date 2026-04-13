import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
    Menu,
    X,
    ChevronDown,
    Mail,
    Phone,
    MapPin,
    Clock,
    ExternalLink,
    Twitter,
    Linkedin,
    Facebook,
    Instagram,
    Youtube,
    Github,
    Globe,
    MessageCircle,
    Calendar,
    ArrowRight,
    ArrowLeft,
    Quote,
    Building2,
    TreePine,
    Shield,
    Home,
    GraduationCap,
    Bike,
    Users,
    ChevronUp,
    Settings,
    Sparkles,
    Heart,
    Target,
    Landmark,
    Send,
    Rss,
    type LucideIcon,
} from "lucide-react";
import AdminPanel from "./AdminPanel";
import { api, initSecurity } from "./lib/api";

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

interface Surgery {
    location: string;
    time: string;
    dates: string[];
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
    surgery: Surgery;
    contact: ContactInfo;
}

// ─── Icon Map ─────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
    Building2,
    TreePine,
    Shield,
    Home,
    GraduationCap,
    Bike,
    Users,
    Target,
    Landmark,
    Sparkles,
    Heart,
};

// ─── Social Platform Config ──────────────────────────────────
interface SocialPlatformConfig {
    icon: LucideIcon;
    bgColor: string;
    hoverColor: string;
}

// TikTok placeholder (Lucide doesn't have TikTok)
function MusicNote(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="8" cy="18" r="4" />
            <path d="M12 18V2l7 4" />
        </svg>
    );
}

function getSocialPlatformConfig(platform: string): SocialPlatformConfig {
    const normalized = platform.toLowerCase().trim();

    const configs: Record<string, SocialPlatformConfig> = {
        twitter: {
            icon: Twitter,
            bgColor: "bg-[#1DA1F2]",
            hoverColor: "hover:bg-[#1a8cd8]",
        },
        x: {
            icon: Twitter,
            bgColor: "bg-[#000000]",
            hoverColor: "hover:bg-[#333333]",
        },
        linkedin: {
            icon: Linkedin,
            bgColor: "bg-[#0A66C2]",
            hoverColor: "hover:bg-[#004182]",
        },
        facebook: {
            icon: Facebook,
            bgColor: "bg-[#1877F2]",
            hoverColor: "hover:bg-[#0d65d9]",
        },
        instagram: {
            icon: Instagram,
            bgColor: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#dc2743]",
            hoverColor: "hover:opacity-90",
        },
        youtube: {
            icon: Youtube,
            bgColor: "bg-[#FF0000]",
            hoverColor: "hover:bg-[#cc0000]",
        },
        github: {
            icon: Github,
            bgColor: "bg-[#333333]",
            hoverColor: "hover:bg-[#24292e]",
        },
        whatsapp: {
            icon: MessageCircle,
            bgColor: "bg-[#25D366]",
            hoverColor: "hover:bg-[#1da851]",
        },
        telegram: {
            icon: Send,
            bgColor: "bg-[#0088cc]",
            hoverColor: "hover:bg-[#006daa]",
        },
        tiktok: {
            icon: MusicNote as unknown as LucideIcon,
            bgColor: "bg-[#000000]",
            hoverColor: "hover:bg-[#333333]",
        },
        email: {
            icon: Mail,
            bgColor: "bg-[#EA4335]",
            hoverColor: "hover:bg-[#d33426]",
        },
        website: {
            icon: Globe,
            bgColor: "bg-navy-700",
            hoverColor: "hover:bg-navy-800",
        },
        blog: {
            icon: Rss,
            bgColor: "bg-[#FF6600]",
            hoverColor: "hover:bg-[#e55b00]",
        },
    };

    if (configs[normalized]) return configs[normalized];

    for (const key of Object.keys(configs)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return configs[key];
        }
    }

    return {
        icon: Globe,
        bgColor: "bg-navy-600",
        hoverColor: "hover:bg-navy-700",
    };
}

// ─── Scroll Reveal Wrapper ────────────────────────────────────
function RevealOnScroll({
                            children,
                            delay = 0,
                            direction = "up",
                        }: {
    children: React.ReactNode;
    delay?: number;
    direction?: "up" | "left" | "right";
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    const variants = {
        hidden: {
            opacity: 0,
            y: direction === "up" ? 40 : 0,
            x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
        },
    };

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={variants}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Active: "bg-green-100 text-green-800 border-green-200",
        "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
        Ongoing: "bg-purple-100 text-purple-800 border-purple-200",
        "In Development": "bg-amber-100 text-amber-800 border-amber-200",
        Planning: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                colors[status] || "bg-gray-100 text-gray-800 border-gray-200"
            }`}
        >
      {status}
    </span>
    );
}

// ─── Navbar ────────────────────────────────────────────────────
function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const links = [
        { href: "#about", label: "About" },
        { href: "#initiatives", label: "Initiatives" },
        { href: "#committees", label: "Committees" },
        { href: "#news", label: "News" },
        { href: "#surgery", label: "Surgeries" },
        { href: "#contact", label: "Contact" },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-navy-100"
                    : "bg-transparent"
            }`}
        >
            <div className="section-container">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    <a href="#" className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg ${
                                scrolled ? "bg-navy-800" : "bg-white/20 backdrop-blur-sm"
                            }`}
                        >
                            KB
                        </div>
                        <div className="hidden sm:block">
                            <p
                                className={`font-bold text-sm leading-tight ${
                                    scrolled ? "text-navy-900" : "text-white"
                                }`}
                            >
                                Cllr Karthik Bonkur
                            </p>
                            <p
                                className={`text-xs ${
                                    scrolled ? "text-navy-500" : "text-white/70"
                                }`}
                            >
                                Hatfield South West
                            </p>
                        </div>
                    </a>

                    <div className="hidden lg:flex items-center gap-1">
                        {links.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    scrolled
                                        ? "text-navy-600 hover:text-navy-900 hover:bg-navy-50"
                                        : "text-white/80 hover:text-white hover:bg-white/10"
                                }`}
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href="#contact"
                            className="ml-3 px-5 py-2.5 bg-civic-teal text-white rounded-lg text-sm font-semibold hover:bg-civic-teal-light transition-colors shadow-lg shadow-civic-teal/25"
                        >
                            Get in Touch
                        </a>
                    </div>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`lg:hidden p-2 rounded-lg ${
                            scrolled
                                ? "text-navy-700 hover:bg-navy-50"
                                : "text-white hover:bg-white/10"
                        }`}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-white border-b border-navy-100 shadow-xl"
                    >
                        <div className="section-container py-4 space-y-1">
                            {links.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 text-navy-700 hover:bg-navy-50 rounded-lg font-medium transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <a
                                href="#contact"
                                onClick={() => setIsOpen(false)}
                                className="block mx-4 mt-3 px-4 py-3 bg-civic-teal text-white rounded-lg font-semibold text-center hover:bg-civic-teal-light transition-colors"
                            >
                                Get in Touch
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}

// ─── Hero Section ──────────────────────────────────────────────
function HeroSection({
                         councillor,
                     }: {
    councillor: PortfolioContent["councillor"];
}) {
    return (
        <section className="relative min-h-screen flex items-center gradient-navy overflow-hidden">
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-950/50 to-transparent" />
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-civic-teal/10 to-transparent" />

            <div className="section-container relative z-10 py-32 lg:py-0">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6 border border-white/10">
                            <span className="w-2 h-2 bg-labour-red rounded-full animate-pulse" />
                            {councillor.party} · {councillor.ward}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-tight mb-6">
                            {councillor.title}{" "}
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-civic-teal-light to-emerald-300">
                {councillor.name}
              </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-navy-200 mb-8 max-w-xl leading-relaxed">
                            {councillor.heroSubtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <a
                                href="#initiatives"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-civic-teal text-white rounded-xl font-semibold text-lg hover:bg-civic-teal-light transition-all duration-300 shadow-xl shadow-civic-teal/30 hover:shadow-2xl hover:shadow-civic-teal/40 hover:-translate-y-0.5"
                            >
                                View Initiatives
                                <ArrowRight size={20} />
                            </a>
                            <a
                                href="#contact"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
                            >
                                <Mail size={20} />
                                Get in Touch
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="hidden lg:flex justify-center"
                    >
                        <div className="relative">
                            <div className="w-80 h-80 xl:w-96 xl:h-96 rounded-2xl bg-gradient-to-br from-civic-teal/30 to-navy-700/50 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                                {councillor.photoUrl ? (
                                    <img
                                        src={councillor.photoUrl}
                                        alt={`Councillor ${councillor.name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-civic-teal to-civic-teal-light mx-auto mb-4 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">
                        {councillor.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                      </span>
                                        </div>
                                        <p className="text-white/90 font-semibold text-lg">
                                            Cllr {councillor.name}
                                        </p>
                                        <p className="text-white/60 text-sm mt-1">
                                            {councillor.ward} Ward
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-civic-teal/20 rounded-full blur-xl" />
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-labour-red/10 rounded-full blur-xl" />
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center gap-2"
                >
          <span className="text-xs font-medium tracking-widest uppercase">
            Scroll
          </span>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

// ─── About Section ─────────────────────────────────────────────
function AboutSection({ about }: { about: PortfolioContent["about"] }) {
    return (
        <section id="about" className="section-padding bg-white">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              About
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900">
                            Serving the Community
                        </h2>
                    </div>
                </RevealOnScroll>

                <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
                    <div className="lg:col-span-3 space-y-6">
                        {about.paragraphs.map((p, i) => (
                            <RevealOnScroll key={i} delay={i * 0.1}>
                                <p className="text-navy-600 leading-relaxed text-lg">{p}</p>
                            </RevealOnScroll>
                        ))}
                    </div>

                    <div className="lg:col-span-2">
                        <RevealOnScroll direction="right">
                            <div className="bg-navy-50 rounded-2xl p-8 border border-navy-100">
                                <h3 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                                    <Heart className="text-civic-teal" size={24} />
                                    Core Values
                                </h3>
                                <div className="space-y-3">
                                    {about.values.map((value, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: 20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-navy-100/50"
                                        >
                                            <div className="w-8 h-8 bg-civic-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Sparkles size={16} className="text-civic-teal" />
                                            </div>
                                            <span className="text-navy-700 font-medium">{value}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Initiatives Section ──────────────────────────────────────
function InitiativesSection({
                                initiatives,
                            }: {
    initiatives: Initiative[];
}) {
    const [selectedInitiative, setSelectedInitiative] =
        useState<Initiative | null>(null);

    return (
        <section id="initiatives" className="section-padding bg-navy-50/50">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              Initiatives & Campaigns
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 mb-4">
                            Working for Hatfield
                        </h2>
                        <p className="text-navy-500 text-lg max-w-2xl mx-auto">
                            Current projects and campaigns to improve life in Hatfield South
                            West.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {initiatives.map((initiative, i) => {
                        const IconComponent = iconMap[initiative.icon] || Target;
                        return (
                            <RevealOnScroll key={initiative.id} delay={i * 0.1}>
                                <motion.button
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedInitiative(initiative)}
                                    className="w-full text-left bg-white rounded-2xl p-6 shadow-sm border border-navy-100/50 card-hover group cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-civic-teal/10 rounded-xl flex items-center justify-center group-hover:bg-civic-teal/20 transition-colors">
                                            <IconComponent size={24} className="text-civic-teal" />
                                        </div>
                                        <StatusBadge status={initiative.status} />
                                    </div>
                                    <h3 className="text-lg font-bold text-navy-900 mb-2 group-hover:text-civic-teal transition-colors">
                                        {initiative.title}
                                    </h3>
                                    <p className="text-navy-500 text-sm leading-relaxed mb-4">
                                        {initiative.summary}
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-civic-teal font-semibold text-sm">
                    Learn more <ArrowRight size={14} />
                  </span>
                                </motion.button>
                            </RevealOnScroll>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence>
                {selectedInitiative && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm"
                        onClick={() => setSelectedInitiative(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const IconComp =
                                                iconMap[selectedInitiative.icon] || Target;
                                            return (
                                                <div className="w-12 h-12 bg-civic-teal/10 rounded-xl flex items-center justify-center">
                                                    <IconComp size={24} className="text-civic-teal" />
                                                </div>
                                            );
                                        })()}
                                        <div>
                                            <h3 className="text-2xl font-bold text-navy-900">
                                                {selectedInitiative.title}
                                            </h3>
                                            <StatusBadge status={selectedInitiative.status} />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedInitiative(null)}
                                        className="p-2 hover:bg-navy-50 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-navy-400" />
                                    </button>
                                </div>
                                <p className="text-navy-600 leading-relaxed text-lg">
                                    {selectedInitiative.details}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

// ─── Committees Section ────────────────────────────────────────
function CommitteesSection({ committees }: { committees: Committee[] }) {
    return (
        <section id="committees" className="section-padding bg-white">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              Council Committees
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 mb-4">
                            Committee Memberships
                        </h2>
                        <p className="text-navy-500 text-lg max-w-2xl mx-auto">
                            Active participation in council committees that shape policy and
                            oversee governance.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {committees.map((committee, i) => (
                        <RevealOnScroll key={committee.id} delay={i * 0.15}>
                            <div className="bg-gradient-to-br from-navy-50 to-white rounded-2xl p-6 border border-navy-100/50 h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-navy-800 rounded-xl flex items-center justify-center">
                                        <Landmark size={20} className="text-white" />
                                    </div>
                                    <span className="px-3 py-1 bg-civic-teal/10 text-civic-teal rounded-full text-xs font-semibold">
                    {committee.role}
                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-navy-900 mb-2">
                                    {committee.name}
                                </h3>
                                <p className="text-navy-500 text-sm leading-relaxed">
                                    {committee.description}
                                </p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── News Section ──────────────────────────────────────────────
function NewsSection({ news }: { news: NewsItem[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    return (
        <section id="news" className="section-padding bg-navy-50/50">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              News & Updates
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 mb-4">
                            Latest News
                        </h2>
                        <p className="text-navy-500 text-lg max-w-2xl mx-auto">
                            Recent updates, speeches, and community news from Councillor
                            Bonkur.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="max-w-3xl mx-auto space-y-6">
                    {news.map((item, i) => (
                        <RevealOnScroll key={item.id} delay={i * 0.1}>
                            <div className="bg-white rounded-2xl border border-navy-100/50 shadow-sm overflow-hidden">
                                <button
                                    onClick={() =>
                                        setExpandedId(expandedId === item.id ? null : item.id)
                                    }
                                    className="w-full text-left p-6 hover:bg-navy-50/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Calendar size={16} className="text-civic-teal" />
                                                <span className="text-sm text-navy-400 font-medium">
                          {formatDate(item.date)}
                        </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-navy-900 mb-2">
                                                {item.title}
                                            </h3>
                                            <p className="text-navy-500 text-sm leading-relaxed">
                                                {item.summary}
                                            </p>
                                        </div>
                                        <motion.div
                                            animate={{
                                                rotate: expandedId === item.id ? 180 : 0,
                                            }}
                                            transition={{ duration: 0.2 }}
                                            className="flex-shrink-0 mt-1"
                                        >
                                            <ChevronDown size={20} className="text-navy-400" />
                                        </motion.div>
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {expandedId === item.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 pt-0">
                                                <div className="border-t border-navy-100 pt-4">
                                                    <p className="text-navy-600 leading-relaxed">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Testimonials Auto-Sliding Carousel ───────────────────────
function TestimonialsSection({
                                 testimonials,
                             }: {
    testimonials: Testimonial[];
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const getVisibleCount = () => {
        if (typeof window === "undefined") return 1;
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 640) return 2;
        return 1;
    };

    const [visibleCount, setVisibleCount] = useState(1);

    useEffect(() => {
        const handleResize = () => setVisibleCount(getVisibleCount());
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const maxIndex = Math.max(0, testimonials.length - visibleCount);

    useEffect(() => {
        if (isPaused || testimonials.length <= visibleCount) return;

        intervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
        }, 4000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPaused, maxIndex, testimonials.length, visibleCount]);

    const goTo = (index: number) => {
        setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
    };

    const goPrev = () => goTo(currentIndex <= 0 ? maxIndex : currentIndex - 1);
    const goNext = () => goTo(currentIndex >= maxIndex ? 0 : currentIndex + 1);

    return (
        <section className="section-padding gradient-navy relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="section-container relative z-10">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 rounded-full text-sm font-semibold mb-4 border border-white/10">
              Testimonials
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
                            What People Say
                        </h2>
                        <p className="text-navy-200 text-lg max-w-2xl mx-auto">
                            Voices from the Hatfield South West community.
                        </p>
                    </div>
                </RevealOnScroll>

                <div
                    className="relative max-w-6xl mx-auto"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <button
                        onClick={goPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors hidden sm:flex"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <button
                        onClick={goNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors hidden sm:flex"
                    >
                        <ArrowRight size={18} />
                    </button>

                    <div className="overflow-hidden px-2">
                        <motion.div
                            className="flex gap-6"
                            animate={{
                                x: `-${currentIndex * (100 / visibleCount)}%`,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 150,
                                damping: 25,
                            }}
                        >
                            {testimonials.map((testimonial) => (
                                <div
                                    key={testimonial.id}
                                    className="flex-shrink-0"
                                    style={{
                                        width: `calc(${100 / visibleCount}% - ${
                                            ((visibleCount - 1) * 24) / visibleCount
                                        }px)`,
                                    }}
                                >
                                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full flex flex-col min-h-[280px]">
                                        <Quote
                                            size={32}
                                            className="text-civic-teal-light mb-4 flex-shrink-0"
                                        />
                                        <p className="text-white/90 leading-relaxed mb-6 flex-1 italic text-sm sm:text-base">
                                            &ldquo;{testimonial.quote}&rdquo;
                                        </p>
                                        <div className="flex items-center gap-3 mt-auto">
                                            <div className="w-10 h-10 bg-gradient-to-br from-civic-teal to-civic-teal-light rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {testimonial.author
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-sm">
                                                    {testimonial.author}
                                                </p>
                                                <p className="text-white/50 text-xs">
                                                    {testimonial.role}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    i === currentIndex
                                        ? "w-8 bg-civic-teal-light"
                                        : "w-2 bg-white/30 hover:bg-white/50"
                                }`}
                            />
                        ))}
                    </div>

                    {isPaused && (
                        <p className="text-center text-white/30 text-xs mt-3">
                            Paused — hover away to resume
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Surgery Section ───────────────────────────────────────────
function SurgerySection({ surgery }: { surgery: Surgery }) {
    return (
        <section id="surgery" className="section-padding bg-white">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              Constituency Surgeries
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 mb-4">
                            Meet Your Councillor
                        </h2>
                        <p className="text-navy-500 text-lg max-w-2xl mx-auto">
                            Drop-in surgeries are held regularly. No appointment needed — come
                            along and discuss any local issues.
                        </p>
                    </div>
                </RevealOnScroll>

                <RevealOnScroll>
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-8 text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-civic-teal/20 rounded-xl flex items-center justify-center">
                                    <MapPin size={24} className="text-civic-teal-light" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{surgery.location}</h3>
                                    <p className="text-navy-300 flex items-center gap-2">
                                        <Clock size={14} />
                                        {surgery.time}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h4 className="text-sm font-semibold text-navy-300 uppercase tracking-wider mb-4">
                                    Upcoming Dates
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {surgery.dates.map((date, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bg-white/10 rounded-lg px-3 py-2 text-center text-sm font-medium border border-white/5 hover:bg-white/15 transition-colors"
                                        >
                                            <Calendar
                                                size={14}
                                                className="inline mr-1.5 text-civic-teal-light"
                                            />
                                            {date}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ─── Contact Section (Equal Cards + Dynamic Social) ───────────
function ContactSection({ contact }: { contact: ContactInfo }) {
    return (
        <section id="contact" className="section-padding bg-navy-50/50">
            <div className="section-container">
                <RevealOnScroll>
                    <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-civic-teal/10 text-civic-teal rounded-full text-sm font-semibold mb-4">
              Contact
            </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 mb-4">
                            Get in Touch
                        </h2>
                        <p className="text-navy-500 text-lg max-w-2xl mx-auto">
                            Have a question or concern about your local area? Don't hesitate
                            to reach out.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    <RevealOnScroll delay={0}>
                        <a
                            href={`mailto:${contact.email}`}
                            className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm card-hover text-center group h-52"
                        >
                            <div className="w-14 h-14 bg-civic-teal/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-civic-teal/20 transition-colors flex-shrink-0">
                                <Mail size={24} className="text-civic-teal" />
                            </div>
                            <h3 className="font-bold text-navy-900 mb-1">Email</h3>
                            <p className="text-navy-500 text-sm break-all leading-snug">
                                {contact.email}
                            </p>
                        </a>
                    </RevealOnScroll>

                    <RevealOnScroll delay={0.1}>
                        <a
                            href={`tel:${contact.phone}`}
                            className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm card-hover text-center group h-52"
                        >
                            <div className="w-14 h-14 bg-civic-teal/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-civic-teal/20 transition-colors flex-shrink-0">
                                <Phone size={24} className="text-civic-teal" />
                            </div>
                            <h3 className="font-bold text-navy-900 mb-1">Phone</h3>
                            <p className="text-navy-500 text-sm">{contact.phone}</p>
                        </a>
                    </RevealOnScroll>

                    <RevealOnScroll delay={0.2}>
                        <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm text-center h-52">
                            <div className="w-14 h-14 bg-civic-teal/10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0">
                                <MapPin size={24} className="text-civic-teal" />
                            </div>
                            <h3 className="font-bold text-navy-900 mb-1">Address</h3>
                            <div className="text-navy-500 text-sm leading-snug">
                                {contact.address.map((line, i) => (
                                    <span key={i}>
                    {line}
                                        {i < contact.address.length - 1 && <br />}
                  </span>
                                ))}
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay={0.3}>
                        <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm text-center h-52">
                            <div className="w-14 h-14 bg-civic-teal/10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0">
                                <Clock size={24} className="text-civic-teal" />
                            </div>
                            <h3 className="font-bold text-navy-900 mb-1">Office Hours</h3>
                            <p className="text-navy-500 text-sm leading-snug">
                                {contact.officeHours}
                            </p>
                        </div>
                    </RevealOnScroll>
                </div>

                <RevealOnScroll delay={0.4}>
                    <div className="flex flex-wrap justify-center gap-3 mt-10">
                        {contact.socialLinks.map((link) => {
                            const config = getSocialPlatformConfig(link.platform);
                            const IconComp = config.icon;
                            return (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-5 py-3 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${config.bgColor} ${config.hoverColor}`}
                                >
                                    <IconComp size={18} />
                                    {link.label}
                                    <ExternalLink size={14} className="opacity-70" />
                                </a>
                            );
                        })}
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ─── Footer ────────────────────────────────────────────────────
function Footer({
                    councillorName,
                    onAdminClick,
                }: {
    councillorName: string;
    onAdminClick: () => void;
}) {
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 500);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <footer className="bg-navy-900 text-white py-12 relative">
            <div className="section-container">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <p className="text-lg font-bold">Cllr {councillorName}</p>
                        <p className="text-navy-400 text-sm mt-1">
                            Labour · Hatfield South West · Welwyn Hatfield Borough Council
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://democracy.welhat.gov.uk/mgUserInfo.aspx?UID=615"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-navy-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                        >
                            Official Council Page
                            <ExternalLink size={12} />
                        </a>
                        <span className="text-navy-700">|</span>
                        <p className="text-navy-400 text-sm">
                            © {new Date().getFullYear()} All rights reserved.
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={onAdminClick}
                        className="text-navy-700 hover:text-navy-500 transition-colors p-2 rounded-lg"
                        title="Admin Panel"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showBackToTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="fixed bottom-6 right-6 w-12 h-12 bg-civic-teal text-white rounded-full shadow-xl flex items-center justify-center hover:bg-civic-teal-light transition-colors z-40"
                    >
                        <ChevronUp size={24} />
                    </motion.button>
                )}
            </AnimatePresence>
        </footer>
    );
}

// ─── Loading Screen ────────────────────────────────────────────
function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center gradient-navy">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-12 h-12 border-4 border-white/20 border-t-civic-teal-light rounded-full mx-auto mb-6"
                />
                <p className="text-white/70 font-medium">Loading portfolio...</p>
            </motion.div>
        </div>
    );
}

// ─── Error Screen ──────────────────────────────────────────────
function ErrorScreen({
                         message,
                         onRetry,
                     }: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-navy-50 p-8">
            <div className="max-w-md text-center">
                <div className="w-16 h-16 bg-labour-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <X size={32} className="text-labour-red" />
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-3">
                    Failed to Load
                </h1>
                <p className="text-navy-600 mb-6">{message}</p>
                <button
                    onClick={onRetry}
                    className="px-6 py-3 bg-navy-800 text-white rounded-lg hover:bg-navy-900 transition-colors font-medium"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}

// ─── Main App Component ────────────────────────────────────────
export default function App() {
    const [content, setContent] = useState<PortfolioContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdmin, setShowAdmin] = useState(false);

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            await initSecurity();

            const res = await api.get("/api/content");
            if (!res.ok) throw new Error("Failed to fetch content.");
            const data = await res.json();
            setContent(data);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleContentUpdate = (updatedContent: PortfolioContent) => {
        setContent(updatedContent);
    };

    if (loading) return <LoadingScreen />;
    if (error || !content)
        return (
            <ErrorScreen
                message={error || "Content unavailable."}
                onRetry={fetchContent}
            />
        );

    return (
        <div className="min-h-screen">
            <Navbar />

            <main>
                <HeroSection councillor={content.councillor} />
                <AboutSection about={content.about} />
                <InitiativesSection initiatives={content.initiatives} />
                <CommitteesSection committees={content.committees} />
                <NewsSection news={content.news} />
                <TestimonialsSection testimonials={content.testimonials} />
                <SurgerySection surgery={content.surgery} />
                <ContactSection contact={content.contact} />
            </main>

            <Footer
                councillorName={content.councillor.name}
                onAdminClick={() => setShowAdmin(true)}
            />

            <AnimatePresence>
                {showAdmin && (
                    <AdminPanel
                        content={content}
                        onClose={() => setShowAdmin(false)}
                        onUpdate={handleContentUpdate}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}