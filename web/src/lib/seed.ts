import type {
  AppState,
  Assessment,
  CandidateApplication,
  CandidateReview,
  Job,
  Workflow,
  WorkflowStage,
} from "./types";

export const PEOPLE: Record<string, string> = {
  linh: "Hà Linh",
  an: "An Nguyễn",
  ha: "Võ Hà",
  tu: "Mai Tú",
  phuong: "Minh Phương",
  nam: "Tuấn Nam",
  quang: "Minh Quang",
  mai: "Ngọc Mai",
};

export const JOB_STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
} as const;

export const STAGE_KIND_LABELS = {
  review: "Review",
  test: "Assessment",
  interview: "Interview",
} as const;

export const RATING_LABELS = {
  strong: "Strong",
  meets: "Meets criteria",
  needs: "Needs improvement",
} as const;

export const OUTCOME_LABELS = {
  active: "In progress",
  hired: "Hired",
  rejected: "Rejected",
} as const;

export const EMAIL_TYPE_LABELS = {
  invite: "Interview invitation",
  reminder: "Interview reminder",
  confirmation: "Interview confirmation",
  reject: "Rejection",
  offer: "Offer",
  welcome: "Welcome",
} as const;

const defaultStages: Omit<WorkflowStage, "id">[] = [
  { name: "Application review", kind: "review", criteria: "Relevant experience and application answers" },
  { name: "Skills assessment", kind: "test", criteria: "Accuracy, reasoning and communication" },
  { name: "Interview", kind: "interview", criteria: "Role fit and examples of past work" },
  { name: "Final decision", kind: "review", criteria: "Overall hiring recommendation" },
];

export const copyStages = (stages: Omit<WorkflowStage, "id">[]): WorkflowStage[] =>
  stages.map((s, i) => ({ ...s, id: `stage-${i}` }));

export const SEED_WORKFLOWS: Workflow[] = [
  { id: "design", name: "Design hiring", stages: copyStages(defaultStages) },
  { id: "ops", name: "Operations hiring", stages: copyStages(defaultStages.filter((s) => s.kind !== "test")) },
  { id: "engineering", name: "Engineering hiring", stages: copyStages(defaultStages) },
  { id: "marketing", name: "Marketing hiring", stages: copyStages(defaultStages.filter((s) => s.kind !== "test")) },
];

export const SEED_JOBS: Job[] = [
  {
    id: "designer",
    title: "Product Designer",
    department: "Design",
    location: "Ho Chi Minh City · Hybrid",
    description:
      "Help shape thoughtful HR products. Partner with engineers and researchers to turn complex workflows into simple experiences.",
    workflow: "design",
    stages: copyStages(SEED_WORKFLOWS[0].stages),
    status: "published",
  },
  {
    id: "ops",
    title: "Operations Associate",
    department: "Operations",
    location: "Ho Chi Minh City · On-site",
    description: "Coordinate daily operations and improve how teams work together.",
    workflow: "ops",
    stages: copyStages(SEED_WORKFLOWS[1].stages),
    status: "draft",
  },
  {
    id: "engineer",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Ho Chi Minh City · Hybrid",
    description:
      "Build accessible, reliable product experiences with a small cross-functional team. Own frontend architecture, mentor teammates and improve our design system.",
    workflow: "engineering",
    stages: copyStages(SEED_WORKFLOWS[2].stages),
    status: "published",
  },
  {
    id: "people-ops",
    title: "People Operations Specialist",
    department: "People",
    location: "Ho Chi Minh City · Hybrid",
    description:
      "Create a thoughtful employee experience across onboarding, policies and day-to-day support. Use feedback and operational data to keep improving our processes.",
    workflow: "ops",
    stages: copyStages(SEED_WORKFLOWS[1].stages),
    status: "published",
  },
  {
    id: "marketing-manager",
    title: "Product Marketing Manager",
    department: "Marketing",
    location: "Remote · Vietnam",
    description:
      "Translate customer insight into positioning, launches and useful stories for teams adopting modern people operations software.",
    workflow: "marketing",
    stages: copyStages(SEED_WORKFLOWS[3].stages),
    status: "published",
  },
];

export const SEED_TESTS: Assessment[] = [
  {
    id: "design-test",
    title: "Product design exercise",
    minutes: 35,
    status: "published",
    questions: [
      {
        prompt: "How would you validate a new employee onboarding dashboard?",
        answer: "Identify assumptions and users; use interviews or usability tests; define a measurable outcome.",
      },
      {
        prompt: "How do you make a dense data table easier to scan?",
        answer: "Prioritize hierarchy, alignment, labels, sensible defaults and accessible interaction.",
      },
    ],
  },
  {
    id: "frontend-test",
    title: "Frontend problem solving",
    minutes: 45,
    status: "published",
    questions: [
      {
        prompt: "How would you prevent duplicate submissions in a slow network?",
        answer: "Track request state, disable or make actions idempotent, and communicate retry behavior.",
      },
      {
        prompt: "What do you check when a page becomes slow?",
        answer: "Measure with profiling tools, identify bottlenecks, optimize network and rendering costs.",
      },
    ],
  },
  {
    id: "ops-case",
    title: "People operations case study",
    minutes: 30,
    status: "draft",
    questions: [
      {
        prompt: "A new hire has no access on day one. What do you do?",
        answer: "Resolve immediate access, coordinate owners, communicate, then address the process gap.",
      },
    ],
  },
];

export function getJobDetails(job: Job) {
  const team =
    job.department === "Design"
      ? "design"
      : job.department === "Engineering"
      ? "engineering"
      : job.department === "Marketing"
      ? "marketing"
      : "operations";

  const duties = {
    design: [
      "Turn employee and manager needs into clear product flows, prototypes and polished UI.",
      "Plan and run lightweight user research and usability sessions with product partners.",
      "Maintain accessible design patterns and contribute to our shared design system.",
    ],
    engineering: [
      "Build and maintain accessible frontend features using React and TypeScript.",
      "Partner with product and design to plan, ship and improve customer workflows.",
      "Review code, improve performance and reliability, and mentor other engineers.",
    ],
    marketing: [
      "Develop positioning, messaging and launch plans for product releases.",
      "Translate customer interviews and market research into useful content and campaigns.",
      "Partner with sales, product and customer teams to measure adoption and improve results.",
    ],
    operations: [
      "Coordinate employee lifecycle programs, including onboarding and day-to-day support.",
      "Maintain clear policies and work with managers to improve operating processes.",
      "Use feedback and simple reporting to find gaps and make employee services more reliable.",
    ],
  }[team];

  const requirements = {
    design: [
      "A portfolio showing end-to-end product design work and clear reasoning.",
      "Experience working closely with engineering and product partners.",
      "Strong interaction design, prototyping and communication skills.",
    ],
    engineering: [
      "Strong experience building production web applications with JavaScript or TypeScript.",
      "Sound knowledge of accessibility, responsive design and frontend testing.",
      "Comfort working through ambiguous problems with a cross-functional team.",
    ],
    marketing: [
      "Experience in product marketing, B2B marketing or a related role.",
      "Strong writing and presentation skills with examples of customer-focused work.",
      "Comfort combining qualitative insight with campaign performance data.",
    ],
    operations: [
      "Experience in people operations, recruiting coordination or employee services.",
      "Organized follow-through and clear written communication.",
      "Good judgment when handling employee questions and confidential workflows.",
    ],
  }[team];

  const salary = {
    design: "VND 35–50 million gross / month",
    engineering: "VND 50–75 million gross / month",
    marketing: "VND 35–55 million gross / month",
    operations: "VND 22–35 million gross / month",
  }[team];

  return {
    duties,
    requirements,
    salary,
    nice: [
      "Experience in a growing product team.",
      "A habit of documenting decisions and sharing what you learn.",
    ],
  };
}

export function buildJdText(job: Job): string {
  const details = getJobDetails(job);
  return [
    job.title.toUpperCase(),
    `${job.department} · ${job.location}`,
    "Employment: Full-time",
    `Compensation: ${details.salary}`,
    "",
    "ABOUT THE ROLE",
    job.description,
    "",
    "WHAT YOU'LL DO",
    ...details.duties.map((item) => `• ${item}`),
    "",
    "WHAT YOU BRING",
    ...details.requirements.map((item) => `• ${item}`),
    "",
    "NICE TO HAVE",
    ...details.nice.map((item) => `• ${item}`),
    "",
    "WHAT WE OFFER",
    "Competitive compensation, annual leave, health coverage, learning budget and flexible team collaboration.",
    "",
    "ABOUT KOBIZO",
    "Kobizo builds practical tools that help people and teams do their best work.",
    "",
    "Hiring process",
    ...job.stages.map((item, idx) => `${idx + 1}. ${item.name}`),
  ].join("\n");
}

export function getCandidateProfile(item: CandidateApplication, job?: Job) {
  const type =
    job?.department === "Design"
      ? "design"
      : job?.department === "Engineering"
      ? "engineering"
      : job?.department === "Marketing"
      ? "marketing"
      : "operations";

  const profile = {
    design: {
      skills: ["Product design", "User research", "Figma", "Prototyping", "Design systems", "Accessibility"],
      degree: "B.A. in Interaction Design",
      role: "Product Designer",
      company: "Lotus Digital",
    },
    engineering: {
      skills: ["TypeScript", "React", "Web accessibility", "Frontend architecture", "Testing", "Performance"],
      degree: "B.S. in Computer Science",
      role: "Frontend Engineer",
      company: "Mekong Cloud",
    },
    marketing: {
      skills: ["Positioning", "Product launches", "Customer research", "Content strategy", "Analytics", "B2B campaigns"],
      degree: "B.A. in Marketing Communications",
      role: "Product Marketing Specialist",
      company: "Northstar Labs",
    },
    operations: {
      skills: ["Employee experience", "Onboarding", "HR operations", "Policy support", "Process design", "People analytics"],
      degree: "B.A. in Business Administration",
      role: "People Operations Coordinator",
      company: "Evergreen People Co.",
    },
  }[type];

  const years = 3 + (item.name.length % 4);
  return {
    ...profile,
    years,
    headline: `${profile.role} · ${years} years of experience`,
    summary: item.cv,
    location: "Ho Chi Minh City, Vietnam",
    education: "University of Economics and Technology · 2016–2020",
    portfolio: `https://${item.id}.portfolio.example.com`,
    experience: [
      {
        title: profile.role,
        company: profile.company,
        dates: "2022–Present",
        details: "Owns delivery of customer-facing work, partners with product and engineering, and improves team practices through regular feedback.",
      },
      {
        title: `${profile.role} Associate`,
        company: "Saigon Product Studio",
        dates: "2020–2022",
        details: `Delivered cross-functional projects, documented decisions and contributed to measurable improvements in the ${type} workflow.`,
      },
    ],
  };
}

export function buildResumeText(item: CandidateApplication, job?: Job): string {
  const profile = getCandidateProfile(item, job);
  return [
    item.name.toUpperCase(),
    profile.headline,
    `${item.email} · ${profile.location}`,
    "",
    "PROFESSIONAL SUMMARY",
    profile.summary,
    "",
    "CORE SKILLS",
    profile.skills.join(", "),
    "",
    "EXPERIENCE",
    ...profile.experience.flatMap((r) => [`${r.title} — ${r.company} (${r.dates})`, r.details, ""]),
    "EDUCATION",
    `${profile.degree} · ${profile.education}`,
    "",
    "PORTFOLIO",
    profile.portfolio,
    "",
    "APPLICATION",
    item.answer,
    `Applied for ${job?.title ?? ""} · Current stage: ${item.stages[item.stage]?.name ?? ""} · ${OUTCOME_LABELS[item.outcome]}`,
  ].join("\n");
}

const BASE_TIME = new Date("2026-11-28T09:00:00.000Z").getTime();
const isoDaysAgo = (days: number) => new Date(BASE_TIME - days * 86400000).toISOString();

const CANDIDATE_SPECS: [string, string, string, string, string, number, CandidateApplication["outcome"]?][] = [
  ["candidate-maya", "designer", "Maya Tran", "maya.tran@example.com", "5 years designing SaaS products; led a design system migration.", 2],
  ["candidate-khoa", "designer", "Khoa Pham", "khoa.pham@example.com", "Product designer focused on research, prototyping and accessibility.", 1],
  ["candidate-linh", "designer", "Linh Do", "linh.do@example.com", "UX designer with three years of B2B product experience.", 0],
  ["candidate-nhi", "designer", "Nhi Phan", "nhi.phan@example.com", "Product designer with a portfolio spanning mobile and web.", 3, "hired"],
  ["candidate-david", "engineer", "David Nguyen", "david.nguyen@example.com", "Frontend engineer; React, TypeScript and design systems.", 2],
  ["candidate-quynh", "engineer", "Quynh Le", "quynh.le@example.com", "Full stack engineer with experience in internal tools and APIs.", 1],
  ["candidate-bao", "engineer", "Bao Vu", "bao.vu@example.com", "Senior engineer focused on reliable frontend architecture.", 3, "rejected"],
  ["candidate-minh", "people-ops", "Minh Vo", "minh.vo@example.com", "People operations coordinator; onboarding and employee support.", 1],
  ["candidate-anh", "people-ops", "Anh Bui", "anh.bui@example.com", "Operations specialist who improved hiring and onboarding workflows.", 2],
  ["candidate-mai", "people-ops", "Mai Truong", "mai.truong@example.com", "Operations generalist with a strong employee experience focus.", 0],
  ["candidate-thao", "marketing-manager", "Thao Nguyen", "thao.nguyen@example.com", "Content marketer with strong lifecycle and campaign experience.", 2],
  ["candidate-tuan", "marketing-manager", "Tuan Ho", "tuan.ho@example.com", "Growth marketer experienced in research-led B2B campaigns.", 0],
];

export function createInitialState(): AppState {
  const applications: CandidateApplication[] = CANDIDATE_SPECS.map(
    ([id, jobId, name, email, cv, stageIdx, outcome = "active"], idx) => {
      const job = SEED_JOBS.find((j) => j.id === jobId)!;
      const stages = copyStages(job.stages);
      const stage = Math.min(stageIdx, stages.length - 1);
      const created = isoDaysAgo(38 - idx * 2);
      const current = stages[stage];
      return {
        id,
        job: jobId,
        name,
        email,
        cv,
        answer: `I'm interested in ${jobId === "designer" ? "building clear, inclusive product experiences" : "helping a growing team do its best work"}. I enjoy collaborating across disciplines and learning from real customer feedback.`,
        token: `demo-${id}-candidate-link`,
        stages,
        stage,
        outcome,
        created,
        reviews: (stage > 0
          ? {
              0: {
                rating: idx % 3 === 0 ? "strong" : "meets",
                notes: "Relevant experience and clear examples. Follow up on cross-functional collaboration.",
              },
            }
          : {}) as Record<number, CandidateReview>,
        tests:
          current.kind === "test"
            ? {
                [stage]: {
                  stage,
                  title: "Design thinking exercise",
                  submitted: isoDaysAgo(5 + idx),
                  started: BASE_TIME - (6 + idx) * 86400000,
                  result: idx % 2 ? "Passed" : "Pending review",
                  answers: [
                    "I would validate the assumption with 5–7 representative users, then measure task completion and confidence.",
                  ],
                },
              }
            : {},
        interviews:
          current.kind === "interview"
            ? {
                [stage]: {
                  stage,
                  interviewer: "Mai Tú",
                  status: idx % 2 ? "Confirmed" : "Invited",
                  slots: [isoDaysAgo(-3), isoDaysAgo(-2)],
                  selected: idx % 2 ? isoDaysAgo(-2) : "",
                  notes: "Portfolio walkthrough and collaboration examples",
                },
              }
            : {},
        events: [
          { date: created, message: "Application received" },
          ...(stage > 0 ? [{ date: isoDaysAgo(18 - idx), message: "Application review completed" }] : []),
        ],
        messages: [],
      };
    }
  );

  return {
    role: "admin",
    activeTimer: null,
    pendingEntry: null,
    projects: [
      { id: "atlas", name: "Atlas", description: "Operations platform and workspace improvements.", department: "Product & Engineering", lead: "Mai Tú", health: "On track", phase: "Delivery", members: ["linh", "an", "tu", "phuong", "nam"] },
      { id: "people", name: "peopleDesk", description: "Employee experience and internal tools.", department: "People & Product", lead: "Võ Hà", health: "On track", phase: "Beta", members: ["linh", "ha", "phuong", "mai"] },
      { id: "studio", name: "Studio Refresh", description: "Internal design system maintenance.", department: "Design", lead: "Mai Tú", health: "At risk", phase: "Review", members: ["tu", "mai"] },
      { id: "phoenix", name: "Phoenix Mobile", description: "A responsive mobile experience for the employee workspace.", department: "Engineering", lead: "An Nguyễn", health: "On track", phase: "Build", members: ["an", "nam", "quang", "linh"] },
      { id: "onboarding", name: "Onboarding Revamp", description: "A clearer first 30 days for every new teammate.", department: "People Operations", lead: "Hà Linh", health: "Needs review", phase: "Discovery", members: ["linh", "ha", "phuong", "mai"] },
      { id: "finance", name: "Finance Operations", description: "Invoice approvals, monthly close and project cost visibility.", department: "Finance", lead: "Minh Quang", health: "On track", phase: "Rollout", members: ["quang", "an", "linh"] },
    ],
    tasks: [
      { id: "roster", project: "atlas", name: "Update project roster", type: "task", status: "open", parent: "", owner: "linh", priority: "High", due: "2026-11-30", estimate: 4, label: "Operations" },
      { id: "tracking", project: "atlas", name: "Time tracking review", type: "story", status: "open", parent: "", owner: "an", priority: "Medium", due: "2026-12-02", estimate: 8, label: "Reporting" },
      { id: "audit", project: "atlas", name: "Audit access rules", type: "bug", status: "done", parent: "", owner: "quang", priority: "High", due: "2026-11-23", estimate: 5, label: "Security" },
      { id: "dashboard", project: "people", name: "Refine employee dashboard", type: "story", status: "open", parent: "", owner: "ha", priority: "High", due: "2026-12-01", estimate: 12, label: "Experience" },
      { id: "labels", project: "people", name: "Review empty-state labels", type: "task", status: "open", parent: "dashboard", owner: "linh", priority: "Low", due: "2026-12-04", estimate: 3, label: "Content" },
      { id: "leave-widget", project: "people", name: "Build leave balance widget", type: "story", status: "open", parent: "", owner: "phuong", priority: "Medium", due: "2026-12-06", estimate: 13, label: "Leave" },
      { id: "tokens", project: "studio", name: "Review color tokens", type: "task", status: "open", parent: "", owner: "tu", priority: "Medium", due: "2026-12-03", estimate: 6, label: "Foundations" },
      { id: "phoenix-shell", project: "phoenix", name: "Implement mobile navigation shell", type: "story", status: "open", parent: "", owner: "an", priority: "High", due: "2026-12-02", estimate: 16, label: "Mobile" },
      { id: "finance-close", project: "finance", name: "Reconcile project hours for close", type: "task", status: "open", parent: "", owner: "quang", priority: "High", due: "2026-11-30", estimate: 8, label: "Monthly close" },
    ],
    entries: [
      { id: "e-1", day: "2026-11-28", person: "linh", project: "atlas", task: "roster", startTime: "09:00", endTime: "13:00", seconds: 14400, source: "Timer" },
      { id: "e-2", day: "2026-11-27", person: "an", project: "phoenix", task: "phoenix-shell", startTime: "09:00", endTime: "13:30", seconds: 16200, source: "Timer" },
      { id: "e-3", day: "2026-11-26", person: "ha", project: "people", task: "dashboard", startTime: "14:00", endTime: "18:00", seconds: 14400, source: "Manual" },
      { id: "e-4", day: "2026-11-25", person: "tu", project: "studio", task: "tokens", startTime: "09:00", endTime: "12:30", seconds: 12600, source: "Timer" },
      { id: "e-5", day: "2026-11-26", person: "quang", project: "finance", task: "finance-close", startTime: "13:00", endTime: "18:00", seconds: 18000, source: "Timer" },
      { id: "e-6", day: "2026-11-27", person: "linh", project: "people", task: "leave-widget", startTime: "09:00", endTime: "13:00", seconds: 14400, source: "Timer" },
    ],
    invoices: [
      { id: "inv-2026-104", number: "INV-2026-104", date: "2026-11-23", project: "atlas", sender: "Kobizo JSC", recipient: "Northstar Labs", service: "Atlas operations and platform delivery", seconds: 194400, status: "Sent", currency: "USD", rate: 65, amount: 3510 },
      { id: "inv-2026-097", number: "INV-2026-097", date: "2026-11-09", project: "people", sender: "Kobizo JSC", recipient: "Evergreen People Co.", service: "peopleDesk product and employee experience", seconds: 162000, status: "Paid", currency: "USD", rate: 65, amount: 2925 },
      { id: "inv-2026-088", number: "INV-2026-088", date: "2026-10-20", project: "phoenix", sender: "Kobizo JSC", recipient: "Northstar Labs", service: "Phoenix mobile experience delivery", seconds: 216000, status: "Paid", currency: "USD", rate: 65, amount: 3900 },
      { id: "inv-2026-076", number: "INV-2026-076", date: "2026-09-28", project: "finance", sender: "Kobizo JSC", recipient: "Lotus Finance Group", service: "Finance operations and reporting support", seconds: 144000, status: "Overdue", currency: "USD", rate: 65, amount: 2600 },
    ],
    leave: [
      { id: "leave-2026-021", person: "linh", from: "2026-12-10", to: "2026-12-11", type: "Annual leave", status: "Approved", notes: "Family visit" },
      { id: "leave-2026-017", person: "linh", from: "2026-12-19", to: "2026-12-19", type: "Personal leave", status: "Pending", notes: "Personal appointment" },
      { id: "leave-2026-015", person: "an", from: "2026-12-05", to: "2026-12-06", type: "Annual leave", status: "Pending", notes: "Short break" },
    ],
    hiring: {
      workflows: SEED_WORKFLOWS,
      jobs: SEED_JOBS,
      tests: SEED_TESTS,
      templates: {
        invite: {
          subject: "Interview invitation · {{job}}",
          body: "Hello {{candidate}}, we enjoyed reviewing your application for {{job}}. Please choose a convenient interview time using your candidate link.",
        },
        reminder: {
          subject: "A quick reminder · {{job}} interview",
          body: "Hello {{candidate}}, this is a friendly reminder about your upcoming conversation for {{job}}. Reply through your candidate page if you need to reschedule.",
        },
        confirmation: {
          subject: "Your interview is confirmed · {{job}}",
          body: "Hello {{candidate}}, your interview for {{job}} is confirmed. We look forward to meeting you and hearing more about your experience.",
        },
        reject: {
          subject: "An update on your {{job}} application",
          body: "Hello {{candidate}}, thank you for the time you invested in our {{job}} process. We have decided to move forward with another candidate for this role. We appreciate your interest and wish you well.",
        },
        offer: {
          subject: "Next steps for {{job}}",
          body: "Hello {{candidate}}, we are pleased to share an offer for {{job}}. Please review the details in your candidate page and contact the hiring team with any questions.",
        },
        welcome: {
          subject: "Welcome to the team, {{candidate}}!",
          body: "Hello {{candidate}}, we are excited to welcome you as our new {{job}} teammate. Your onboarding details will be shared shortly.",
        },
      },
      applications,
    },
  };
}
