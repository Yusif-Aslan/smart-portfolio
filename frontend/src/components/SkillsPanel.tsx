import { useMemo } from "react";
import type { ExperienceSkill, SkillsData } from "../types";
import { formatExperience, relativeWidth } from "../types";

function SkillBar({ skill, maxYears }: { skill: ExperienceSkill; maxYears: number }) {
  const widthPct = relativeWidth(skill.years, maxYears);
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">
          {skill.name}
          {skill.note && (
            <span className="ml-1.5 text-[10px] font-normal text-slate-400">({skill.note})</span>
          )}
        </span>
        <span className="whitespace-nowrap text-slate-400">{formatExperience(skill.years)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-900 transition-all duration-500"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function SkillGroup({
  title,
  skills,
  maxYears,
}: {
  title: string;
  skills: ExperienceSkill[];
  maxYears: number;
}) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
        {title}
      </h4>
      {skills.map((s) => (
        <SkillBar key={s.name} skill={s} maxYears={maxYears} />
      ))}
    </div>
  );
}

export default function SkillsPanel({ skills }: { skills: SkillsData }) {
  const maxYears = useMemo(() => {
    const all = [
      ...skills.backendAndCloud,
      ...skills.frontend,
      ...skills.testingAndTools,
      ...skills.secondary,
    ];
    return Math.max(...all.map((s) => s.years), 0.1);
  }, [skills]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-900">
        Core Skills
      </h3>
      <p className="mb-4 text-xs text-slate-400">
        C#/.NET-first stack, with full-stack range — durations reflect commercial, academic, and personal-project experience
      </p>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <SkillGroup title="Backend & Cloud" skills={skills.backendAndCloud} maxYears={maxYears} />
        <SkillGroup title="Frontend" skills={skills.frontend} maxYears={maxYears} />
        <SkillGroup title="Testing & Tools" skills={skills.testingAndTools} maxYears={maxYears} />
        <SkillGroup title="Secondary" skills={skills.secondary} maxYears={maxYears} />
      </div>
    </div>
  );
}