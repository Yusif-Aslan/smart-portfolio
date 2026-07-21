import { useCallback, useEffect, useMemo, useState } from "react";
import SmartPortfolioChat from "./components/SmartPortfolioChat";
import SkillsPanel from "./components/SkillsPanel";
import ProjectGallery from "./components/ProjectGallery";
import type { CvProfile, EducationEntry, ExperienceEntry, PersonalInfo } from "./types";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5138";

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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <DashboardHeader personal={cvData.personal} />
            <Timeline experience={cvData.experience} education={cvData.education} />
            <SkillsPanel skills={cvData.skills} />
            <ProjectGallery
                projects={cvData.projects}
                highlightedProjectName={highlightedProjectName}
            />
          </div>

          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <SmartPortfolioChat
                projectNames={projectNames}
                onProjectMentioned={handleProjectMentioned}
            />
          </div>
        </div>
      </div>
  );
}