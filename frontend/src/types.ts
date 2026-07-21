export interface LanguageEntry {
  language: string;
  level: string;
}

export interface PersonalInfo {
  fullName: string;
  headline: string;
  location: string;
  relocation: string;
  workAuthorization: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  languagesSpoken: LanguageEntry[];
}

export interface EducationEntry {
  degree: string;
  status: string;
  institution: string;
  startDate: string;
  endDate: string | null;
  coursework: string[];
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  primaryStack: string[];
  highlights: string[];
}

export interface ExperienceSkill {
  name: string;
  years: number;
  note?: string;
}

export interface SkillsData {
  primaryFocus: string[];
  backendAndCloud: ExperienceSkill[];
  frontend: ExperienceSkill[];
  testingAndTools: ExperienceSkill[];
  secondary: ExperienceSkill[];
}

export type ProjectCategory =
  | "backend"
  | "frontend"
  | "full-stack"
  | "data-ml"
  | "testing"
  | "pet";

export interface ProjectEntry {
  id: string;
  name: string;
  alternateName?: string;
  year: string | null;
  stack: string[];
  category: ProjectCategory;
  description: string;
  link: string | null;
  flagshipProject: boolean;
}

export interface GithubRepoEntry {
  name: string;
  language: string;
  note: string;
}

export interface CvProfile {
  personal: PersonalInfo;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillsData;
  projects: ProjectEntry[];
  githubRepositories?: GithubRepoEntry[];
}

export function formatExperience(years: number): string {
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  const isWhole = Number.isInteger(years);
  return `${isWhole ? years : years.toFixed(2).replace(/0$/, "").replace(/\.$/, "")} year${years === 1 ? "" : "s"}`;
}

export function relativeWidth(years: number, maxYears: number): number {
  if (maxYears <= 0) return 0;
  return Math.max(8, Math.round((years / maxYears) * 100));
}