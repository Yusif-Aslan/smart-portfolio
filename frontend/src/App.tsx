import { useCallback, useEffect, useMemo, useState } from "react";
import SmartPortfolioChat from "./components/SmartPortfolioChat";
import SkillsPanel from "./components/SkillsPanel";
import ProjectGallery from "./components/ProjectGallery";
import type { CvProfile, EducationEntry, ExperienceEntry, PersonalInfo } from "./types";

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5138";

function Timeline({
                      experience,
                      education,
                  }: {
    experience: ExperienceEntry[];
    education: EducationEntry[];
}) {
    type TimelineItem = {
        key: string;
        date: string;
        title: string;
        subtitle: string;
        kind: "experience" | "education";
    };

    const items: TimelineItem[] = useMemo(() => {
        const expItems: TimelineItem[] = experience.map((e) => ({
            key: e.id,
            date: `${e.startDate}${e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}`,
            title: e.title,
            subtitle: e.company,
            kind: "experience",
        }));
        const eduItems: TimelineItem[] = education.map((e, idx) => ({
            key: `edu-${idx}`,
            date: `${e.startDate}${e.endDate ? ` – ${e.endDate}` : " – Present"}`,
            title: e.degree,
            subtitle: e.institution,
            kind: "education",
        }));
        return [...expItems, ...eduItems].sort((a, b) => b.date.localeCompare(a.date));
    }, [experience, education]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">
                Career &amp; Education Timeline
            </h3>
            <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {items.map((item) => (
                    <li key={item.key} className="relative">
            <span
                className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                    item.kind === "experience" ? "bg-amber-500" : "bg-slate-400"
                }`}
            />
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            {item.date}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subtitle}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function DashboardHeader({ personal }: { personal: PersonalInfo }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Interactive AI CV
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">{personal.fullName}</h1>
            <p className="text-sm text-slate-300">{personal.headline}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>{personal.location}</span>
                <span>{personal.relocation}</span>
                <a href={personal.github} className="text-slate-300 underline-offset-2 hover:underline">
                    GitHub
                </a>
                <a href={personal.linkedin} className="text-slate-300 underline-offset-2 hover:underline">
                    LinkedIn
                </a>
            </div>
        </div>
    );
}

export default function App() {
    const [cvData, setCvData] = useState<CvProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [highlightedProjectName, setHighlightedProjectName] = useState<string | null>(null);
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`${API_BASE_URL}/api/portfolio/data`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load profile data (${res.status})`);
                return res.json() as Promise<CvProfile>;
            })
            .then(setCvData)
            .catch((err) => {
                if ((err as Error).name !== "AbortError") {
                    setLoadError("Could not load portfolio data from the backend.");
                }
            });

        return () => controller.abort();
    }, []);

    const handleProjectMentioned = useCallback((projectName: string) => {
        setHighlightedProjectName(projectName);
    }, []);

    const projectNames = useMemo(
        () =>
            cvData?.projects.flatMap((p) => [p.name, ...(p.alternateName ? [p.alternateName] : [])]) ?? [],
        [cvData]
    );

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-red-600">
                {loadError}
            </div>
        );
    }

    if (!cvData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
                Loading portfolio...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 relative">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Main Content Column */}
                <div className="space-y-5 lg:col-span-2">
                    <DashboardHeader personal={cvData.personal} />
                    <Timeline experience={cvData.experience} education={cvData.education} />
                    <SkillsPanel skills={cvData.skills} />
                    <ProjectGallery
                        projects={cvData.projects}
                        highlightedProjectName={highlightedProjectName}
                    />
                </div>

                {/* Floating Action Button (FAB) — Visible only on mobile screens when chat is closed */}
                {!isMobileChatOpen && (
                    <button
                        onClick={() => setIsMobileChatOpen(true)}
                        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-indigo-400/30 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 lg:hidden"
                        aria-label="Open AI Assistant Chat"
                    >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span>AI Assistant</span>
                    </button>
                )}

                {/* Responsive Chat Container:
            - Desktop (lg+): Sticky right sidebar
            - Mobile (< lg): Full-screen modal overlay when open, hidden when closed
        */}
                <div
                    className={`
            ${isMobileChatOpen ? "fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200" : "hidden"}
            lg:block lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:w-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none
          `}
                >
                    <div className="h-full w-full">
                        <SmartPortfolioChat
                            projectNames={projectNames}
                            onProjectMentioned={handleProjectMentioned}
                            onClose={() => setIsMobileChatOpen(false)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}