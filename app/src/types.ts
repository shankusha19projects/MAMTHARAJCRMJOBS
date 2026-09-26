export type Stage = 'New' | 'Ready' | 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
export const STAGES: Stage[] = ['New', 'Ready', 'Applied', 'Screening', 'Interview', 'Offer'];
export const ALL_STAGES: Stage[] = [...STAGES, 'Rejected'];

export interface Breakdown { skills: number; experience: number; domain: number; tools: number; seniority: number; location: number; keyword: number }

export interface Job {
  uid: string; code: string; source: string; extId: string; url: string;
  title: string; company: string; location: string; logo?: string; salary?: string;
  postedAt: string; postedText?: string; description?: string; tags?: string[];
  seniority?: string; employmentType?: string; industries?: string; applicants?: string;
  market: string; marketKind: 'Local' | 'Remote' | 'Relocation'; marketId: string; workMode: string;
  match: number; breakdown: Breakdown; priority: 'A' | 'B' | 'C' | 'D';
  shortlistProb: number; interviewProb: number; offerProb: number; ats: number;
  resumeVersion: string; family: string; aiFlag: boolean;
  matchedKeywords: string[]; matchedSkills: string[]; toolsHit: string[];
  whyMatch: string; gaps: string[]; tailoring: string[];
  firstSeenAt: string; lastSeenAt: string; isNewRun?: boolean;
  // pipeline overlay
  stage?: Stage; notes?: string; starred?: boolean; updatedAt?: string; appliedAt?: string;
  history?: { stage: Stage; at: string }[];
}

export interface PipelineEntry { stage?: Stage; notes?: string; starred?: boolean; updatedAt?: string; appliedAt?: string; history?: { stage: Stage; at: string }[] }

export interface Contact { id: string; name: string; company: string; role: string; email?: string; linkedin?: string; phone?: string; lastContact?: string; notes?: string; jobUid?: string }

export interface Market { id: string; label: string; kind: string; prefix: string; linkedin: string; remote?: boolean; enabled: boolean; noSearch?: boolean; match?: string }

export interface Settings {
  markets: Market[]; queries: { q: string; core: boolean; ai?: boolean }[];
  recencyDays: number; autoRefreshMin: number; enrichLimit: number; minScore: number;
  sources: Record<string, boolean>; hasTinyfishKey?: boolean;
}

export interface SourceStatus { name: string; status: 'running' | 'done' | 'error' | 'skipped'; count: number; errors?: number; note?: string }
export interface LogEntry { t: string; level: 'info' | 'warn' | 'error' | 'success'; source: string; msg: string }
export interface RunRecord { at: string; trigger: string; added: number; updated: number; found: number; sources: Record<string, SourceStatus> }
export interface Meta { lastRefresh: string | null; runs?: RunRecord[]; counters?: Record<string, number> }

export interface SkillGroup { key: string; label: string; domain: string; terms: string[]; roles?: string[]; hits?: number; core: boolean; proof: string }
export interface ResumeVersion { id: string; name: string; focus: string; bestFor: string; file: string; keys?: string[] }
export interface Story { q?: string; s?: string; t?: string; a?: string; r?: string; bullet?: string; group?: string }
export interface Profile {
  version: number; source: 'parser' | 'curated'; key: string; createdAt?: string;
  name: string; firstName: string; headline: string; email: string; phone: string; linkedin: string;
  city: string; country: string; years: number; yearsLabel: string; availability: string; workAuth: string;
  education: string; summary?: string; topSkills: string[]; certifications: string[]; domains: string[];
  experience: { role: string; company: string; period: string; where: string }[];
  keywords: string[]; skills: SkillGroup[]; tools: string[]; targetTitles: string[];
  stories?: Story[]; resumeVersions: ResumeVersion[]; resumeFiles: Record<string, { label: string; file: string }>;
  markets: Market[]; queries: { q: string; core: boolean; ai?: boolean }[];
  salary?: Record<string, { range: string; stretch: string; note: string }>;
}
export interface MarketOption { id: string; label: string; prefix: string; linkedin: string }
