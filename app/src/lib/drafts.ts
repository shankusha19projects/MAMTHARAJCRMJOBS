import type { Job, Profile } from '../types';

// All drafts are generated from the candidate profile (data/profile.json) + the specific job.
const sig = (P: Profile) => [P.name, [P.phone, P.email].filter(Boolean).join(' · '), P.linkedin].filter(Boolean).join('\n');
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
export const versionOf = (P: Profile, id: string) => P.resumeVersions.find((v) => v.id === id) || P.resumeVersions[0] || { id: 'main', name: 'Main resume', focus: '', bestFor: '', file: 'main' };
export const resumeFileOf = (P: Profile, id: string) => P.resumeFiles[versionOf(P, id).file] || Object.values(P.resumeFiles)[0];

function proofs(P: Profile, job: Job, n = 3) {
  const byLabel = (l: string) => P.skills.find((s) => s.label === l);
  const picked = (job.matchedSkills || []).map(byLabel).filter((s) => s && s.proof);
  const rest = P.skills.filter((s) => s.proof && s.core && !picked.includes(s));
  return [...picked, ...rest].slice(0, n).map((s) => s!.proof);
}
const skillsLine = (P: Profile, job: Job) => (job.matchedSkills?.length ? job.matchedSkills.slice(0, 4) : P.topSkills.slice(0, 4)).join(', ');
const where = (P: Profile, job: Job) => job.marketKind === 'Relocation' ? `ready to relocate to ${job.market}` : job.marketKind === 'Remote' ? 'set up for remote work across time zones' : `based in ${P.city}`;

export function coverLetter(job: Job, P: Profile) {
  const pr = proofs(P, job, 3);
  return `Dear Hiring Team at ${job.company},

I'm applying for the ${job.title} role. I bring ${P.yearsLabel} of experience as ${P.headline.split(/[|•]/)[0].trim()}${P.experience[0] ? `, most recently as ${P.experience[0].role}${P.experience[0].company ? ` at ${P.experience[0].company}` : ''}` : ''}.

What I would bring to ${job.company}:
${pr.map((p) => `• ${p.replace(/\.$/, '')}.`).join('\n')}

Your posting stresses ${skillsLine(P, job)}. That is work I have done hands-on${P.certifications.length ? `, backed by certifications including ${P.certifications.slice(0, 3).join(', ')}` : ''}.

I'm ${lc(P.availability)} and ${where(P, job)}. I'd welcome a conversation about how I can deliver the same results for your team.

Warm regards,
${sig(P)}`;
}

export function recruiterEmail(job: Job, P: Profile) {
  const pr = proofs(P, job, 2);
  return `Subject: ${job.title} – ${P.name} (${P.yearsLabel}, ${P.topSkills.slice(0, 2).join(' / ')})

Hi {{Recruiter name}},

I saw ${job.company}'s opening for ${job.title} and I'm a strong fit:
• ${P.yearsLabel} in ${P.topSkills.slice(0, 3).join(', ')}
${pr.map((p) => `• ${p.replace(/\.$/, '')}`).join('\n')}
${P.certifications.length ? `• Certified: ${P.certifications.slice(0, 3).join(' · ')}\n` : ''}
${P.availability}${job.marketKind === 'Relocation' ? ` and open to relocating to ${job.market}` : ''}. My resume is attached. Could we set up a 15-minute call this week?

Posting: ${job.url}

Thanks,
${sig(P)}`;
}

export const linkedinDM = (job: Job, P: Profile) =>
  `Hi {{Name}}, I noticed ${job.company} is hiring a ${job.title}. I have ${P.yearsLabel} in ${P.topSkills.slice(0, 3).join(', ')}${P.experience[0]?.company ? ` (most recently ${P.experience[0].company})` : ''}. Would you be open to a quick chat, or could you point me to the hiring manager? Thanks! – ${P.firstName}`;

export function followUp(job: Job, P: Profile) {
  return `Subject: Following up – ${job.title} application

Hi {{Name}},

I applied for the ${job.title} role at ${job.company} on {{date}} and wanted to follow up. I remain very interested, especially because the role focuses on ${skillsLine(P, job)}.

One quick highlight: ${proofs(P, job, 1)[0] || P.topSkills[0]}.

Happy to share more or work around your schedule for a conversation.

Best,
${sig(P)}`;
}

export const referralAsk = (job: Job, P: Profile) =>
  `Hi {{Name}}, hope you're doing well! I'm applying for the ${job.title} role at ${job.company} (${job.url}). With ${P.yearsLabel} in ${P.topSkills.slice(0, 2).join(' and ')}, it's a close fit. Would you be comfortable referring me or introducing me to the hiring manager? I can send my resume and a short blurb to make it easy. Thanks so much! – ${P.firstName}`;

export function thankYou(job: Job, P: Profile) {
  return `Subject: Thank you – ${job.title} interview

Hi {{Interviewer}},

Thank you for your time today discussing the ${job.title} role. I enjoyed learning about {{topic you discussed}}, and it confirmed my interest in helping ${job.company} with ${skillsLine(P, job)}.

As I mentioned: ${proofs(P, job, 1)[0] || P.topSkills[0]}. I'd love to bring that same approach to your team.

Looking forward to next steps.

Best regards,
${sig(P)}`;
}

export function interviewPrep(job: Job, P: Profile) {
  const pr = proofs(P, job, 2);
  const stories = (P.stories || []).slice(0, 4).map((x, i) => x.s
    ? `${i + 1}. ${x.q}\n   S: ${x.s}\n   T: ${x.t}\n   A: ${x.a}\n   R: ${x.r}`
    : `${i + 1}. "Tell me about a time you delivered impact in ${x.group}."\n   Story: ${x.bullet}\n   Frame it as Situation → Task → Action → Result, and end on the number.`);
  return `INTERVIEW PREP · ${job.title} @ ${job.company}

60-SECOND PITCH
"I'm a ${P.headline.split(/[|•]/)[0].trim()} with ${P.yearsLabel}. ${pr.map((p) => p.replace(/\.$/, '')).join('. ')}. I'm excited about ${job.company} because this role centers on ${skillsLine(P, job)}."

LIKELY QUESTIONS
${(job.matchedSkills?.length ? job.matchedSkills : P.topSkills).slice(0, 5).map((s) => `• Walk through how you'd apply ${s} at ${job.company}'s scale.`).join('\n')}
• Tell us about a failure, and what you changed afterwards.
• How do you prioritize when everything is urgent?

STAR STORIES
${stories.join('\n\n') || '• Pick three resume bullets that end in a number and rehearse them as STAR stories.'}

GAPS TO ADDRESS
${(job.gaps || []).map((g) => `• ${g}`).join('\n')}

QUESTIONS TO ASK THEM
• What does success look like in the first 90 days for this ${job.title}?
• Which metrics does leadership use to judge this team?
• What's the biggest challenge the team is facing this quarter?
• How is the team structured, and who would I work with most closely?
• What does the interview process look like from here?`;
}

export function salaryGuide(job: Job, P: Profile) {
  const g = P.salary?.[job.marketKind === 'Relocation' ? job.market : job.marketKind];
  const lead = /lead|senior|architect|principal|manager|specialist/i.test(job.title);
  if (g) return `SALARY GUIDANCE · ${job.title} (${job.market})

Target range: ${g.range}
${lead ? `Senior/lead title, so aim for the top of the range or the stretch: ${g.stretch}` : `Stretch: ${g.stretch}`}

Notes: ${g.note}

Negotiation script:
"Based on my ${P.yearsLabel} and the results I've delivered, I'm targeting ${g.range.split('(')[0].trim()}. I'm flexible on structure: base, joining bonus and learning budget."

${job.salary ? `Posted salary info: ${job.salary}\n` : ''}These are estimates. Verify against Glassdoor, Levels.fyi or AmbitionBox for ${job.company}.`;
  return `SALARY GUIDANCE · ${job.title} (${job.market})

${job.salary ? `Posted salary info: ${job.salary}\n\n` : ''}1. Look up the band for "${job.title}" at ${job.company} on Glassdoor, Levels.fyi, LinkedIn Salary${/india/i.test(P.country) ? ' and AmbitionBox' : ''}.
2. With ${P.yearsLabel}${lead ? ' and a senior/lead title' : ''}, anchor at the 75th percentile of that band.
3. ${job.marketKind === 'Relocation' ? `For ${job.market}, ask for relocation, housing and visa support on top of base.` : job.marketKind === 'Remote' ? 'Remote roles often pay by location band. Ask which band applies before naming a number.' : 'Ask about variable pay, joining bonus and notice-period buyout.'}

Negotiation script:
"Based on my ${P.yearsLabel} and results like ${lc(proofs(P, job, 1)[0] || P.topSkills[0])}, I'm targeting {{number}}. I'm flexible on structure."

Tip: add a curated "salary" map to data/profile.json to get market-specific ranges here.`;
}

export const DRAFTS: { id: string; label: string; fn: (j: Job, p: Profile) => string }[] = [
  { id: 'cover', label: 'Cover letter', fn: coverLetter },
  { id: 'email', label: 'Recruiter email', fn: recruiterEmail },
  { id: 'dm', label: 'LinkedIn DM', fn: linkedinDM },
  { id: 'follow', label: 'Follow-up', fn: followUp },
  { id: 'referral', label: 'Referral ask', fn: referralAsk },
  { id: 'thanks', label: 'Thank-you note', fn: thankYou },
  { id: 'prep', label: 'Interview prep', fn: interviewPrep },
  { id: 'salary', label: 'Salary guidance', fn: salaryGuide },
];

export const shareSnippet = (j: Job) => `${j.title} @ ${j.company} (${j.location || j.market})\nMatch ${j.match}/100 · Priority ${j.priority}\nApply: ${j.url}`;
