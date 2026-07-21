import type { ProjectEntry } from "../types";

const CATEGORY_LABELS: Record<ProjectEntry["category"], string> = {
  backend: "Backend",
  frontend: "Frontend",
  "full-stack": "Full-Stack",
  "data-ml": "Data / ML",
  testing: "Testing",
  pet: "Pet Project",
};

function ProjectCard({
  project,
  isHighlighted,
}: {
  project: ProjectEntry;
  isHighlighted: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 ${
        isHighlighted
          ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{project.name}</h4>
          {project.alternateName && (
            <p className="text-[10px] italic text-slate-400">a.k.a. {project.alternateName}</p>
          )}
        </div>
        <span className="whitespace-nowrap text-[11px] text-slate-400">
          {project.year ?? "—"}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-1.5">
        <span className="rounded bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {CATEGORY_LABELS[project.category]}
        </span>
        {project.flagshipProject && (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            Flagship
          </span>
        )}
      </div>

      <p className="mb-2 text-xs leading-relaxed text-slate-600">{project.description}</p>

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {tech}
            </span>
          ))}
        </div>
        {project.link && (
            <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-amber-600 hover:underline"
            >
              View →
            </a>
        )}
      </div>
    </div>
  );
}

export default function ProjectGallery({
  projects,
  highlightedProjectName,
}: {
  projects: ProjectEntry[];
  highlightedProjectName: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
          Project Gallery
        </h3>
        <span className="text-[11px] text-slate-400">{projects.length} projects</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isHighlighted={
              project.name === highlightedProjectName ||
              project.alternateName === highlightedProjectName
            }
          />
        ))}
      </div>
    </div>
  );
}