import { dayKey, uid } from "./model.js";

const jobStatuses = { draft: "Draft", published: "Published", unpublished: "Unpublished" };
const testStatuses = jobStatuses;
const emailTypes = {
  invite: "Interview invitation", reminder: "Interview reminder", confirmation: "Interview confirmation",
  reject: "Rejection", offer: "Offer", welcome: "Welcome"
};
const ratings = { strong: "Strong", meets: "Meets criteria", needs: "Needs improvement" };
const outcomes = { active: "In progress", hired: "Hired", rejected: "Rejected" };
const defaults = [
  { name: "Application review", kind: "review", criteria: "Relevant experience and application answers" },
  { name: "Skills assessment", kind: "test", criteria: "Accuracy, reasoning and communication" },
  { name: "Interview", kind: "interview", criteria: "Role fit and examples of past work" },
  { name: "Final decision", kind: "review", criteria: "Overall hiring recommendation" }
];
const part = (stage, index) => ({ ...stage, id: `stage-${index}` });
const cleanLines = value => value.split("\n").map(line => line.trim()).filter(Boolean);
const stagesCopy = stages => stages.map(part);
const stamp = () => new Date().toISOString();
const dateTime = value => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
function simulation() {
  const design = { id: "design", name: "Design hiring", stages: stagesCopy(defaults) };
  const operations = { id: "ops", name: "Operations hiring", stages: stagesCopy(defaults.filter(stage => stage.kind !== "test")) };
  const engineering = { id: "engineering", name: "Engineering hiring", stages: stagesCopy(defaults) };
  const marketing = { id: "marketing", name: "Marketing hiring", stages: stagesCopy(defaults.filter(stage => stage.kind !== "test")) };
  const ago = days => new Date(Date.now() - days * 86400000).toISOString();
  const names = [
    ["Maya Tran", "maya.tran@example.com", "5 years designing SaaS products; led a design system migration."],
    ["Khoa Pham", "khoa.pham@example.com", "Product designer focused on research, prototyping and accessibility."],
    ["Linh Do", "linh.do@example.com", "UX designer with three years of B2B product experience."],
    ["David Nguyen", "david.nguyen@example.com", "Frontend engineer; React, TypeScript and design systems."],
    ["Quynh Le", "quynh.le@example.com", "Full stack engineer with experience in internal tools and APIs."],
    ["Minh Vo", "minh.vo@example.com", "People operations coordinator; onboarding and employee support."],
    ["Anh Bui", "anh.bui@example.com", "Operations specialist who improved hiring and onboarding workflows."],
    ["Thao Nguyen", "thao.nguyen@example.com", "Content marketer with strong lifecycle and campaign experience."],
    ["Tuan Ho", "tuan.ho@example.com", "Growth marketer experienced in research-led B2B campaigns."],
    ["Nhi Phan", "nhi.phan@example.com", "Product designer with a portfolio spanning mobile and web."],
    ["Bao Vu", "bao.vu@example.com", "Senior engineer focused on reliable frontend architecture."],
    ["Mai Truong", "mai.truong@example.com", "Operations generalist with a strong employee experience focus."]
  ];
  const makeCandidate = (id, job, personIndex, stageIndex, outcome = "active") => {
    const [name, email, cv] = names[personIndex];
    const jobItem = [
      { id: "designer", stages: design.stages }, { id: "engineer", stages: engineering.stages },
      { id: "people-ops", stages: operations.stages }, { id: "marketing-manager", stages: marketing.stages }
    ].find(item => item.id === job);
    const stages = stagesCopy(jobItem.stages);
    const stage = Math.min(stageIndex, stages.length - 1);
    const created = ago(38 - personIndex * 2);
    const current = stages[stage];
    return {
      id, job, name, email, cv, answer: `I’m interested in ${jobItem.id === "designer" ? "building clear, inclusive product experiences" : "helping a growing team do its best work"}. I enjoy collaborating across disciplines and learning from real customer feedback.`,
      resume: null, coverLetter: null, token: `demo-${id}-candidate-link`, stages, stage, outcome, created,
      reviews: stage > 0 ? { 0: { rating: personIndex % 3 === 0 ? "strong" : "meets", notes: "Relevant experience and clear examples. Follow up on cross-functional collaboration." } } : {},
      tests: current.kind === "test" ? { [stage]: { title: "Design thinking exercise", submitted: ago(5 + personIndex), started: ago(6 + personIndex), result: personIndex % 2 ? "Passed" : "Pending review", answers: ["I would validate the assumption with 5–7 representative users, then measure task completion and confidence."] } } : {},
      interviews: current.kind === "interview" ? { [stage]: { status: personIndex % 2 ? "Confirmed" : "Invited", slots: [ago(-3), ago(-2)], selected: ago(-2), notes: "Portfolio walkthrough and collaboration examples" } } : {},
      events: [{ date: created, message: "Application received" }, ...(stage > 0 ? [{ date: ago(18 - personIndex), message: "Application review completed" }] : [])],
      messages: []
    };
  };
  const applicants = [
    makeCandidate("candidate-maya", "designer", 0, 2), makeCandidate("candidate-khoa", "designer", 1, 1),
    makeCandidate("candidate-linh", "designer", 2, 0), makeCandidate("candidate-nhi", "designer", 9, 3, "hired"),
    makeCandidate("candidate-david", "engineer", 3, 2), makeCandidate("candidate-quynh", "engineer", 4, 1),
    makeCandidate("candidate-bao", "engineer", 10, 3, "rejected"), makeCandidate("candidate-minh", "people-ops", 5, 1),
    makeCandidate("candidate-anh", "people-ops", 6, 2), makeCandidate("candidate-mai", "people-ops", 11, 0),
    makeCandidate("candidate-thao", "marketing-manager", 7, 2), makeCandidate("candidate-tuan", "marketing-manager", 8, 0)
  ];
  return {
    seedVersion: 2,
    workflows: [design, operations, engineering, marketing],
    jobs: [
      { id: "designer", title: "Product Designer", department: "Design", location: "Ho Chi Minh City · Hybrid", description: "Help shape thoughtful HR products. Partner with engineers and researchers to turn complex workflows into simple experiences.", workflow: design.id, stages: stagesCopy(design.stages), status: "published" },
      { id: "ops", title: "Operations Associate", department: "Operations", location: "Ho Chi Minh City · On-site", description: "Coordinate daily operations and improve how teams work together.", workflow: operations.id, stages: stagesCopy(operations.stages), status: "draft" },
      { id: "engineer", title: "Senior Frontend Engineer", department: "Engineering", location: "Ho Chi Minh City · Hybrid", description: "Build accessible, reliable product experiences with a small cross-functional team. Own frontend architecture, mentor teammates and improve our design system.", workflow: engineering.id, stages: stagesCopy(engineering.stages), status: "published" },
      { id: "people-ops", title: "People Operations Specialist", department: "People", location: "Ho Chi Minh City · Hybrid", description: "Create a thoughtful employee experience across onboarding, policies and day-to-day support. Use feedback and operational data to keep improving our processes.", workflow: operations.id, stages: stagesCopy(operations.stages), status: "published" },
      { id: "marketing-manager", title: "Product Marketing Manager", department: "Marketing", location: "Remote · Vietnam", description: "Translate customer insight into positioning, launches and useful stories for teams adopting modern people operations software.", workflow: marketing.id, stages: stagesCopy(marketing.stages), status: "published" }
    ],
    tests: [
      { id: "design-test", title: "Product design exercise", minutes: 35, status: "published", questions: [
        { prompt: "How would you validate a new employee onboarding dashboard?", answer: "Identify assumptions and users; use interviews or usability tests; define a measurable outcome." },
        { prompt: "How do you make a dense data table easier to scan?", answer: "Prioritize hierarchy, alignment, labels, sensible defaults and accessible interaction." }
      ] },
      { id: "frontend-test", title: "Frontend problem solving", minutes: 45, status: "published", questions: [
        { prompt: "How would you prevent duplicate submissions in a slow network?", answer: "Track request state, disable or make actions idempotent, and communicate retry behavior." },
        { prompt: "What do you check when a page becomes slow?", answer: "Measure with profiling tools, identify bottlenecks, optimize network and rendering costs." }
      ] },
      { id: "ops-case", title: "People operations case study", minutes: 30, status: "draft", questions: [
        { prompt: "A new hire has no access on day one. What do you do?", answer: "Resolve immediate access, coordinate owners, communicate, then address the process gap." }
      ] }
    ],
    templates: {
      invite: { subject: "Interview invitation · {{job}}", body: "Hello {{candidate}}, we enjoyed reviewing your application for {{job}}. Please choose a convenient interview time using your candidate link." },
      reminder: { subject: "A quick reminder · {{job}} interview", body: "Hello {{candidate}}, this is a friendly reminder about your upcoming conversation for {{job}}. Reply through your candidate page if you need to reschedule." },
      confirmation: { subject: "Your interview is confirmed · {{job}}", body: "Hello {{candidate}}, your interview for {{job}} is confirmed. We look forward to meeting you and hearing more about your experience." },
      reject: { subject: "An update on your {{job}} application", body: "Hello {{candidate}}, thank you for the time you invested in our {{job}} process. We have decided to move forward with another candidate for this role. We appreciate your interest and wish you well." },
      offer: { subject: "Next steps for {{job}}", body: "Hello {{candidate}}, we are pleased to share an offer for {{job}}. Please review the details in your candidate page and contact the hiring team with any questions." },
      welcome: { subject: "Welcome to the team, {{candidate}}!", body: "Hello {{candidate}}, we are excited to welcome you as our new {{job}} teammate. Your onboarding details will be shared shortly." }
    },
    applications: applicants
  };
}

export function createHiring({ state, params, slug, text, option, options, button, link, field, header, table, restricted, showModal, inlineError, finish, render, save, modal }) {
  const data = () => {
    if (!state.hiring) state.hiring = simulation();
    const current = state.hiring;
    if ((current.seedVersion ?? 0) < 2) {
      const seed = simulation();
      for (const key of ["workflows", "jobs", "tests", "applications"]) {
        const existing = current[key] ?? [];
        const ids = new Set(existing.map(item => item.id));
        current[key] = [...existing, ...seed[key].filter(item => !ids.has(item.id))];
      }
      current.templates = { ...seed.templates, ...(current.templates ?? {}) };
      current.seedVersion = 2;
    }
    return current;
  };
  const isHR = () => state.role === "admin";
  const fetchBy = (key, id) => data()[key].find(item => item.id === id);
  const application = () => fetchBy("applications", params().get("candidate"));
  const candidateSession = () => data().applications.find(item => item.token === params().get("token"));
  const stage = item => item.stages[item.stage];
  const testFor = item => item?.tests?.[item.stage];
  const interviewFor = item => item?.interviews?.[item.stage];
  const nav = (active) => `<nav class="segmented hiring-nav" aria-label="Hiring sections">${[
    ["jobs", "Job List"], ["hiring-workflows", "Workflow Settings"], ["assessments", "Assessments"], ["email-templates", "Email Templates"]
  ].map(([route, title]) => `<a href="#${route}"${active === route ? ' aria-current="page"' : ""}>${title}</a>`).join("")}</nav>`;
  const badge = (name, style = "") => `<span class="badge ${style}">${text(name)}</span>`;
  const jobActionMenu = job => `<details class="hiring-job-actions v2-floating-actions">
    <summary class="button secondary hiring-more-icon" aria-label="More actions for ${text(job.title)}" title="More actions">⋮</summary>
    <div class="hiring-action-menu v2-floating-menu">${button("Edit", "h-job", { value: job.id })}
      ${button(job.status === "published" ? "Unpublish" : "Publish", "h-job-status", { value: job.id })}
      ${button("Delete", "h-job-delete", { value: job.id, kind: "danger" })}
      ${link("Open pipeline", slug("pipeline", { job: job.id }))}</div>
  </details>`;
  const jdData = job => {
    const team = job.department === "Design" ? "design" : job.department === "Engineering" ? "engineering" :
      job.department === "Marketing" ? "marketing" : "operations";
    const duties = {
      design: ["Turn employee and manager needs into clear product flows, prototypes and polished UI.", "Plan and run lightweight user research and usability sessions with product partners.", "Maintain accessible design patterns and contribute to our shared design system."],
      engineering: ["Build and maintain accessible frontend features using React and TypeScript.", "Partner with product and design to plan, ship and improve customer workflows.", "Review code, improve performance and reliability, and mentor other engineers."],
      marketing: ["Develop positioning, messaging and launch plans for product releases.", "Translate customer interviews and market research into useful content and campaigns.", "Partner with sales, product and customer teams to measure adoption and improve results."],
      operations: ["Coordinate employee lifecycle programs, including onboarding and day-to-day support.", "Maintain clear policies and work with managers to improve operating processes.", "Use feedback and simple reporting to find gaps and make employee services more reliable."]
    }[team];
    const requirements = {
      design: ["A portfolio showing end-to-end product design work and clear reasoning.", "Experience working closely with engineering and product partners.", "Strong interaction design, prototyping and communication skills."],
      engineering: ["Strong experience building production web applications with JavaScript or TypeScript.", "Sound knowledge of accessibility, responsive design and frontend testing.", "Comfort working through ambiguous problems with a cross-functional team."],
      marketing: ["Experience in product marketing, B2B marketing or a related role.", "Strong writing and presentation skills with examples of customer-focused work.", "Comfort combining qualitative insight with campaign performance data."],
      operations: ["Experience in people operations, recruiting coordination or employee services.", "Organized follow-through and clear written communication.", "Good judgment when handling employee questions and confidential workflows."]
    }[team];
    const salary = { design: "VND 35–50 million gross / month", engineering: "VND 50–75 million gross / month", marketing: "VND 35–55 million gross / month", operations: "VND 22–35 million gross / month" }[team];
    return { duties, requirements, salary, nice: ["Experience in a growing product team.", "A habit of documenting decisions and sharing what you learn."] };
  };
  const jdText = job => {
    const details = jdData(job);
    return [job.title.toUpperCase(), `${job.department} · ${job.location}`, "Employment: Full-time", `Compensation: ${details.salary}`,
      "", "ABOUT THE ROLE", job.description, "", "WHAT YOU’LL DO", ...details.duties.map(item => `• ${item}`),
      "", "WHAT YOU BRING", ...details.requirements.map(item => `• ${item}`), "", "NICE TO HAVE", ...details.nice.map(item => `• ${item}`),
      "", "WHAT WE OFFER", "Competitive compensation, annual leave, health coverage, learning budget and flexible team collaboration.",
      "", "ABOUT KOBIZO", "Kobizo builds practical tools that help people and teams do their best work.",
      "", "Hiring process", job.stages.map((item, index) => `${index + 1}. ${item.name}`).join("\n")].join("\n");
  };
  const jdDownload = job => `<a class="button secondary" download="${text(job.id)}-job-description.txt" href="data:text/plain;charset=utf-8,${encodeURIComponent(jdText(job))}">Download</a>`;
  const previewJD = job => {
    const details = jdData(job);
    const list = items => `<ul class="hiring-jd-list">${items.map(item => `<li>${text(item)}</li>`).join("")}</ul>`;
    return `<div class="hiring-jd-preview"><p><strong>${text(job.department)}</strong> · ${text(job.location)} · Full-time</p>
      <p><strong>Compensation:</strong> ${text(details.salary)}</p><h3>About the role</h3><p>${text(job.description)}</p>
      <h3>What you’ll do</h3>${list(details.duties)}<h3>What you bring</h3>${list(details.requirements)}
      <h3>Nice to have</h3>${list(details.nice)}<h3>What we offer</h3><p>Competitive compensation, annual leave, health coverage, learning budget and flexible team collaboration.</p>
      <h3>About Kobizo</h3><p>Kobizo builds practical tools that help people and teams do their best work.</p>
      <h3>Hiring process</h3>${list(job.stages.map((item, index) => `${index + 1}. ${item.name}`))}<div class="hiring-jd-download">${jdDownload(job)}</div></div>`;
  };
  const candidateProfile = item => {
    const job = fetchBy("jobs", item.job);
    const type = job?.department === "Design" ? "design" : job?.department === "Engineering" ? "engineering" :
      job?.department === "Marketing" ? "marketing" : "operations";
    const profile = {
      design: { skills: ["Product design", "User research", "Figma", "Prototyping", "Design systems", "Accessibility"], degree: "B.A. in Interaction Design", role: "Product Designer", company: "Lotus Digital" },
      engineering: { skills: ["TypeScript", "React", "Web accessibility", "Frontend architecture", "Testing", "Performance"], degree: "B.S. in Computer Science", role: "Frontend Engineer", company: "Mekong Cloud" },
      marketing: { skills: ["Positioning", "Product launches", "Customer research", "Content strategy", "Analytics", "B2B campaigns"], degree: "B.A. in Marketing Communications", role: "Product Marketing Specialist", company: "Northstar Labs" },
      operations: { skills: ["Employee experience", "Onboarding", "HR operations", "Policy support", "Process design", "People analytics"], degree: "B.A. in Business Administration", role: "People Operations Coordinator", company: "Evergreen People Co." }
    }[type];
    const years = 3 + (item.name.length % 4);
    return { ...profile, years, headline: `${profile.role} · ${years} years of experience`, summary: item.cv,
      location: "Ho Chi Minh City, Vietnam", education: "University of Economics and Technology · 2016–2020",
      portfolio: `https://${item.id}.portfolio.example.com`, experience: [
        { title: profile.role, company: profile.company, dates: "2022–Present", details: `Owns delivery of customer-facing work, partners with product and engineering, and improves team practices through regular feedback.` },
        { title: `${profile.role} Associate`, company: "Saigon Product Studio", dates: "2020–2022", details: `Delivered cross-functional projects, documented decisions and contributed to measurable improvements in the ${type} workflow.` }
      ] };
  };
  const hHead = (route, title, message, actions = "") => header("Hiring", title, message, actions) + nav(route);
  const panel = (title, copy, actions = "") =>
    `<section class="card card-pad hiring-panel"><div class="card-header"><div><h2>${title}</h2>${copy}</div><div class="v2-actions">${actions}</div></div></section>`;
  const roleError = () => restricted("Hiring setup and the candidate pipeline require the Admin / HR demo role.");
  const formInput = (name, value, max = 100) => `<input name="${name}" value="${text(value)}" maxlength="${max}" required>`;
  const area = (name, value, max = 2000) => `<textarea name="${name}" rows="3" maxlength="${max}" required>${text(value)}</textarea>`;
  const hidden = (name, value) => `<input type="hidden" name="${name}" value="${text(value)}">`;
  const portalURL = item => slug("candidate-portal", { token: item.token });
  const recruiterURL = item => slug("pipeline", { job: item.job, candidate: item.id });
  const event = (item, message) => item.events.unshift({ date: stamp(), message });
  const fileData = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", data: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const downloadable = (file, label) => file?.data ? `<p><a class="text-link" href="${text(file.data)}" download="${text(file.name)}">Download ${label} · ${text(file.name)}</a></p>` : "";
  const notify = (item, type) => {
    const template = data().templates[type];
    const job = fetchBy("jobs", item.job);
    const fill = value => value.replaceAll("{{candidate}}", item.name).replaceAll("{{job}}", job.title);
    item.messages.unshift({ type, date: stamp(), subject: fill(template.subject), body: fill(template.body) });
    event(item, `${emailTypes[type]} queued in the demo inbox.`);
  };
  const displayMessages = item => item.messages.length ? panel("Demo inbox",
    `<ul class="hiring-list">${item.messages.map(message => `<li><strong>${text(message.subject)}</strong><small>${text(dateTime(message.date))}</small><p>${text(message.body)}</p></li>`).join("")}</ul>`) : "";

  function jobs() {
    if (!isHR()) return roleError();
    const selected = fetchBy("jobs", params().get("job"));
    if (selected) {
      const candidates = data().applications.filter(item => item.job === selected.id).sort((a, b) => b.stage - a.stage);
      return `<div class="hiring-detail-back">${link("← Back to job list", "#jobs")}</div>` +
        header("Hiring", text(selected.title), text(`${selected.department} · ${selected.location} · ${jobStatuses[selected.status]}`), jobActionMenu(selected)) +
        panel("Job description", "",
          button("Preview full JD", "h-job-preview", { value: selected.id, kind: "primary" }) + jdDownload(selected)) +
        table("Top-fits", "Review submitted applications against this job’s configured stages. Candidate order is not an automated ranking.", ["Candidate", "Current stage", "Status", "Accept / Decline"],
          candidates.map(item => `<tr><td><button type="button" class="text-link hiring-candidate-link" data-action="h-candidate-preview" data-value="${text(item.id)}">${text(item.name)}</button><small class="v2-subline">${text(item.email)}</small></td>
            <td>${text(stage(item).name)}</td><td>${badge(outcomes[item.outcome], item.outcome === "hired" ? "saved" : "")}</td>
            <td><div class="v2-actions">${button("Accept", "h-candidate-accept", { value: item.id, kind: item.outcome === "hired" ? "primary" : "secondary" })}${button("Decline", "h-candidate-decline", { value: item.id, kind: item.outcome === "rejected" ? "danger" : "secondary" })}</div></td></tr>`).join(""));
    }
    return hHead("jobs", "Job Description List", "",
      link("Public Careers", "#careers") + button("Create", "h-job", { kind: "primary" })) +
      `<form id="hiring-job-list" data-hiring-main="bulk">${table("Job postings", "Select postings to change their visibility.", ["Select", "Job description", "Status", "Workflow", "Actions"],
      data().jobs.map(job => `<tr><td><input type="checkbox" name="jobs" value="${text(job.id)}" aria-label="Select ${text(job.title)}"></td>
        <td><a class="text-link" href="${text(slug("jobs", { job: job.id }))}">${text(job.title)}</a><small class="v2-subline">${text(job.department)} · ${text(job.location)}</small></td>
        <td>${badge(jobStatuses[job.status], job.status === "published" ? "saved" : "")}</td><td>${text(fetchBy("workflows", job.workflow)?.name ?? "Saved snapshot")}</td>
        <td>${jobActionMenu(job)}</td></tr>`).join(""),
      '<div class="v2-actions"><select name="status" aria-label="Bulk action"><option value="published">Publish selected</option><option value="unpublished">Unpublish selected</option><option value="delete">Delete selected</option></select><button class="button secondary">Apply</button></div>')}
      <p class="form-error" role="alert" hidden></p></form>`;
  }

  function workflows() {
    if (!isHR()) return roleError();
    return hHead("hiring-workflows", "Recruitment Workflow Settings", "Save reusable stages, then configure and reorder the stages for each job description.", button("New workflow", "h-workflow", { kind: "primary" })) +
      table("Workflows", "Assigned workflows stay in use until each job is reassigned or deleted.", ["Workflow", "Stage order", "Assigned jobs", "Actions"], data().workflows.map(workflow => `<tr>
        <td><strong>${text(workflow.name)}</strong></td><td><div class="hiring-stage-list">${workflow.stages.map(item => badge(item.name)).join("")}</div></td>
        <td>${data().jobs.filter(job => job.workflow === workflow.id).length}</td>
        <td><div class="v2-actions">${button("View", "h-workflow-view", { value: workflow.id })}${button("Edit", "h-workflow", { value: workflow.id })}${button("Delete", "h-workflow-delete", { value: workflow.id, kind: "danger" })}</div></td></tr>`).join(""));
  }

  function assessments() {
    if (!isHR()) return roleError();
    return hHead("assessments", "Assessments", "Prepare tests before assigning one to a candidate.", button("New assessment", "h-test", { kind: "primary" })) +
      table("Assessment list", "Manage draft, published and unpublished tests.", ["Assessment", "Duration", "Status", "Actions"], data().tests.map(test => `<tr>
        <td><strong>${text(test.title)}</strong><small class="v2-subline">${test.questions.length} questions</small></td><td>${test.minutes} min</td>
        <td>${badge(testStatuses[test.status], test.status === "published" ? "saved" : "")}</td>
        <td><div class="v2-actions">${button("Preview", "h-test-preview", { value: test.id })}${button("Edit", "h-test", { value: test.id })}${button(test.status === "published" ? "Unpublish" : "Publish", "h-test-toggle", { value: test.id })}</div></td></tr>`).join(""));
  }

  function templates() {
    if (!isHR()) return roleError();
    return hHead("email-templates", "Email Templates", "Messages are recorded in the demo inbox.") +
      table("Templates", "Customize candidate updates and scheduling messages.", ["Template", "Subject", "Actions"], Object.entries(data().templates).map(([id, template]) =>
        `<tr><td>${text(emailTypes[id])}</td><td>${text(template.subject)}</td><td>${button("Edit template", "h-template", { value: id })}</td></tr>`).join(""));
  }

  function careers() {
    const active = data().jobs.filter(job => job.status === "published");
    const job = active.find(item => item.id === params().get("job"));
    if (params().has("job") && !job) return header("Careers", "Job unavailable", "This posting is not accepting applications.", link("View open jobs", "#careers"));
    if (job) {
      const related = active.filter(item => item.id !== job.id);
      return header("Public Careers", text(job.title), text(`${job.department} · ${job.location}`),
        link("All openings", "#careers") + button("Apply for this job", "h-apply", { value: job.id, kind: "primary" })) +
        panel("About the role", `<p>${text(job.description)}</p>`) +
        (related.length ? panel("Related jobs", related.map(item => `<p><a class="text-link" href="${text(slug("careers", { job: item.id }))}">${text(item.title)}</a></p>`).join("")) : "");
    }
    return header("Public Careers", "Open roles", "Browse published job descriptions and apply from this page.") +
      `<div class="hiring-jobs">${active.map(item => panel(text(item.title), `<p>${text(item.department)} · ${text(item.location)}</p>`, link("View job", slug("careers", { job: item.id })))).join("") || panel("No open roles", "<p>Check back for published jobs.</p>")}</div>`;
  }

  function pipeline() {
    if (!isHR()) return roleError();
    const job = fetchBy("jobs", params().get("job"));
    if (!job) return restricted("Choose a job from the Job List.");
    const filter = params().get("stage") ?? "";
    const active = application();
    const all = data().applications.filter(item => item.job === job.id);
    const filtered = all.filter(item => !filter || stage(item).id === filter);
    const stageFilter = `<form data-hiring-main="pipeline-filter">${hidden("job", job.id)}${field("Filter by stage", `<select name="stage">${option("", "All stages", filter)}${options(Object.fromEntries(job.stages.map(item => [item.id, item.name])), filter)}</select>`)}<button class="button secondary">Apply filter</button></form>`;
    const detail = active?.job === job.id ? reviewCandidate(active) : "";
    return hHead("jobs", "Candidate pipeline", text(job.title), link("Job List", "#jobs") + button("Add candidate", "h-add", { value: job.id, kind: "primary" })) +
      table("Applications", `${filtered.length} in this view`, ["Candidate", "Stage", "Outcome", "Actions"], filtered.map(item =>
        `<tr><td><strong>${text(item.name)}</strong></td><td>${text(stage(item).name)}</td><td>${badge(outcomes[item.outcome])}</td><td>${link("Review", recruiterURL(item))}</td></tr>`).join(""), stageFilter) + detail;
  }

  function reviewCandidate(item) {
    const current = stage(item);
    const done = item.outcome !== "active";
    const enabled = done ? "" : button("Record evaluation", "h-evaluate", { value: item.id });
    const currentTest = testFor(item);
    const currentInterview = interviewFor(item);
    const test = !done && current.kind === "test" ? panel("Assessment", `<p>${currentTest ? text(currentTest.result || (currentTest.submitted ? "Submission received" : "Invitation ready")) : "Assign a published assessment for this stage."}</p>`,
      currentTest ? (currentTest.submitted ? button("Grade assessment", "h-grade", { value: item.id }) : link("Open candidate link", portalURL(item))) :
        button("Assign assessment", "h-assign", { value: item.id, disabled: !data().tests.some(test => test.status === "published") })) : "";
    const interview = !done && current.kind === "interview" ? panel("Interview", `<p>${text(currentInterview?.status ?? "Set interview times and prepare an invitation.")}</p>`,
      button(currentInterview ? "Update interview" : "Send scheduling link", "h-interview", { value: item.id }) +
      (currentInterview && currentInterview.status !== "Cancelled" ? link("Open candidate link", portalURL(item)) + button("Update status", "h-interview-status", { value: item.id }) : "")) : "";
    const review = item.reviews[item.stage];
    const snapshot = `<p>${text(item.email)} · ${badge(outcomes[item.outcome])}</p>
      <p><strong>Resume / experience</strong> ${text(item.cv || item.resume?.name || "Not provided")}</p>${downloadable(item.resume, "resume")}
      ${downloadable(item.coverLetter, "cover letter")}<p><strong>Application answers</strong> ${text(item.answer)}</p>
      <p><strong>Current stage</strong> ${text(current.name)}</p><p><strong>Criteria</strong> ${text(current.criteria)}</p>
      <p><strong>Allowed stages</strong> ${item.stages.filter((_, i) => i !== item.stage).map(item => text(item.name)).join(" · ") || "Final outcome only"}</p>
      ${review ? `<p><strong>Evaluation</strong> ${text(ratings[review.rating])} · ${text(review.notes)}</p>` : ""}`;
    const cannotAdvance = current.kind === "test" && currentTest?.result === "Failed";
    const decisions = done ? "" : (item.stage < item.stages.length - 1
      ? (cannotAdvance ? "" : button("Accept · advance stage", "h-accept", { value: item.id, kind: "primary" }))
      : (cannotAdvance ? "" : button("Confirm hire", "h-accept", { value: item.id, kind: "primary" }))) +
        button("Decline candidate", "h-decline", { value: item.id, kind: "danger" });
    return panel(text(item.name), snapshot, link("Candidate preview", portalURL(item)) + enabled + decisions) + test + interview +
      panel("Timeline", `<ul class="hiring-list">${item.events.map(entry => `<li><strong>${text(entry.message)}</strong><small>${text(dateTime(entry.date))}</small></li>`).join("")}</ul>`);
  }

  function portal() {
    const item = candidateSession();
    if (!item) return header("Public Careers", "Application link unavailable", "Open your application link to continue.", link("Public Careers", "#careers"));
    const job = fetchBy("jobs", item.job);
    const test = item.outcome === "active" ? testFor(item) : null;
    const interview = item.outcome === "active" ? interviewFor(item) : null;
    const testCopy = test && `<p>${text(test.title)} · ${test.minutes} min · one attempt</p><p>${text(test.result || (test.submitted ? "Submitted" : test.started ? "Attempt in progress" : "Ready to start"))}</p>`;
    const interviewCopy = interview && `<p>${text(interview.status)}${interview.selected ? ` · ${text(dateTime(interview.selected))}` : ""}</p>`;
    return header("Public Careers", "Your application", `${text(job.title)} · ${text(item.name)}`, link("Public Careers", "#careers")) +
      panel("Application status", `<p>Current stage: ${text(stage(item).name)}</p><p>${badge(outcomes[item.outcome], item.outcome === "hired" ? "saved" : "")}</p>`) +
      (test ? panel("Assessment", testCopy, test.submitted ? "" : button(test.started ? "Continue assessment" : "Start timed assessment", "h-attempt", { kind: "primary" })) : "") +
      (interview ? panel("Interview", interviewCopy, ["Invited", "Confirmed", "Change requested"].includes(interview.status) ?
        button(interview.status === "Confirmed" ? "Request a change" : "Choose interview time", "h-book") : "") : "") +
      displayMessages(item);
  }

  function openJob(id) {
    const item = id && fetchBy("jobs", id);
    const workflows = data().workflows;
    const selected = item?.workflow ?? workflows[0]?.id ?? "";
    const selectedWorkflow = fetchBy("workflows", selected);
    const stages = (item?.stages ?? selectedWorkflow?.stages ?? defaults).map(s => `${s.name} | ${s.kind} | ${s.criteria}`).join("\n");
    showModal(item ? "Edit job description" : "New job description", "Choose a saved recruitment workflow, then configure the stages for this job.", "h-job",
      hidden("id", id) + field("Job title", formInput("title", item?.title)) + field("Department", formInput("department", item?.department)) +
      field("Location", formInput("location", item?.location)) + field("Job description", area("description", item?.description)) +
      field("Recruitment workflow", `<select name="workflow">${option("", "Select a workflow", selected)}${options(Object.fromEntries(workflows.map(w => [w.id, w.name])), selected)}${item && !workflows.some(w => w.id === item.workflow) ? option(item.workflow, "Use saved workflow snapshot", selected) : ""}</select>`) +
      field("Stages for this job", area("stages", stages, 3500)) +
      field("Visibility", `<select name="status">${options(jobStatuses, item?.status ?? "draft")}</select>`),
      item ? "Save JD" : "Create JD");
  }

  function openWorkflow(id) {
    const item = id && fetchBy("workflows", id);
    const rows = (item?.stages ?? defaults).map(s => `${s.name} | ${s.kind} | ${s.criteria}`).join("\n");
    showModal(item ? "Edit workflow" : "New workflow", "Enter stages in order, one per line. Use Name | review, test or interview | evaluation criteria.", "h-workflow",
      hidden("id", id) + field("Workflow name", formInput("name", item?.name)) + field("Stage definitions", area("stages", rows, 3500)), "Save workflow");
  }

  function openTest(id) {
    const item = id && fetchBy("tests", id);
    showModal(item ? "Edit assessment" : "New assessment", "Enter one question per line as Question | Answer guide.", "h-test",
      hidden("id", id) + field("Assessment title", formInput("title", item?.title)) +
      field("Time limit (minutes)", `<input name="minutes" type="number" min="1" max="180" value="${item?.minutes ?? 20}" required>`) +
      field("Questions and answers", area("questions", item?.questions.map(row => `${row.prompt} | ${row.answer}`).join("\n"), 4500)),
      "Save assessment");
  }

  function openApplication(id, manual = false) {
    const job = fetchBy("jobs", id);
    if (!job || (manual ? !isHR() : job.status !== "published")) return;
    showModal(manual ? "Add candidate" : "Apply for this job", text(job.title), "h-application",
      hidden("job", id) + hidden("manual", manual ? "1" : "") + (!manual ? field("Application method", '<select name="method"><option value="guest">Continue as guest</option><option value="sign-in">Sign in (demo)</option><option value="register">Register (demo)</option></select>') : "") +
      field("Full name", formInput("name", "")) + field("Email", '<input type="email" name="email" maxlength="160" required>') +
      field("Resume (PDF, DOC or DOCX)", '<input type="file" name="resume" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">') +
      field("Relevant experience (if no resume is attached)", area("cv", "")) +
      field("Cover letter (optional)", '<input type="file" name="coverLetter" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">') +
      field("Why are you interested in this role?", area("answer", "")),
      manual ? "Add candidate" : "Submit application");
  }

function openAssignment(item) {
    const tests = data().tests.filter(test => test.status === "published");
    if (!tests.length) {
      showModal("Assign assessment", "No published assessment is available yet. Prepare, preview, or publish one from the Assessment List first.", "h-view",
        `<p>${link("Open Assessment List", "#assessments")}</p>`, "");
      return;
    }
    showModal("Assign assessment", "The link will appear in the candidate’s demo inbox.", "h-assign",
      hidden("id", item.id) + field("Published assessment", `<select name="test">${options(Object.fromEntries(tests.map(test => [test.id, test.title])), tests[0]?.id)}</select>`),
      "Send assessment invitation");
  }

  function openInterview(item) {
    const early = new Date(Date.now() + 86400000);
    const next = new Date(Date.now() + 2 * 86400000);
    const slotValue = date => `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const interview = interviewFor(item);
    showModal(interview ? "Reschedule interview" : "Schedule interview", "Choose interviewer and upcoming local times for the candidate.", "h-interview",
      hidden("id", item.id) + field("Interviewer", formInput("interviewer", interview?.interviewer ?? "Hiring Manager")) +
      field("First time option", `<input type="datetime-local" name="first" value="${slotValue(early)}" required>`) +
      field("Second time option (optional)", `<input type="datetime-local" name="second" value="${slotValue(next)}">`), "Send invitation");
  }

  function openDecline(item) {
    showModal("Confirm decline for this candidate", `${text(item.name)} · ${text(fetchBy("jobs", item.job)?.title)}`, "h-decline-confirm",
      hidden("id", item.id) +
      `<p class="hiring-muted">System will mark this candidate as declined and send the rejection email to their demo inbox.</p>` +
      field("Reason / decision notes", area("reason", "")),
      "Confirm decline", "danger");
  }

  function openAcceptNextStage(item, selectedKind) {
    const job = fetchBy("jobs", item.job);
    const workflowName = fetchBy("workflows", job?.workflow)?.name ?? "JD workflow";
    const isFinal = item.stage >= item.stages.length - 1;
    const next = isFinal ? null : item.stages[item.stage + 1];
    const stageKindLabel = { review: "Review", test: "Assessment", interview: "Interview" };
    const stageList = `<ol class="hiring-list">${item.stages.map((row, idx) => {
      const marker = idx === item.stage ? " (Current)" : !isFinal && idx === item.stage + 1 ? " → Next" : "";
      return `<li><strong>${text(row.name)}${marker}</strong> <span class="badge">${stageKindLabel[row.kind] ?? text(row.kind)}</span></li>`;
    }).join("")}</ol>`;
    if (isFinal) {
      showModal("Confirm hire", `${text(item.name)} · ${text(job?.title)}`, "h-accept-next",
        hidden("id", item.id) + hidden("mode", "hire") +
        `<p>All configured stages in <strong>${text(workflowName)}</strong> are complete.</p>` +
        field("Email template", `<select name="template">${options({ offer: emailTypes.offer, welcome: emailTypes.welcome }, "offer")}</select>`) +
        field("Hiring notes (optional)", `<textarea name="reason" rows="2" maxlength="2000"></textarea>`),
        "Confirm hire");
      return;
    }
    const kind = ["review", "test", "interview"].includes(selectedKind) ? selectedKind : next.kind;
    let stageFields = "";
    let submitLabel = `Continue to ${next.name}`;
    if (kind === "review") {
      stageFields = `<p><strong>Evaluate against criteria:</strong> ${text(next.criteria)}</p>` +
        field("Rating", `<select name="rating">${options(ratings, "meets")}</select>`) +
        field("Evidence / notes", area("notes", ""));
      submitLabel = "Pass stage";
    } else if (kind === "test") {
      const published = data().tests.filter(test => test.status === "published");
      const allTests = data().tests.map(t => `<li><strong>${text(t.title)}</strong> · ${badge(testStatuses[t.status], t.status === "published" ? "saved" : "")}
        <div class="v2-actions" style="margin-top:6px">${button("Prepare", "h-test", { value: t.id })}${button("Preview", "h-test-preview", { value: t.id })}${button(t.status === "published" ? "Unpublish" : "Publish", "h-test-toggle", { value: t.id })}</div></li>`).join("");
      stageFields = `<div class="v2-actions" style="justify-content:space-between;margin:8px 0"><strong>Assessment List</strong>${button("Prepare new", "h-test")}</div>` +
        `<ul class="hiring-list">${allTests || "<li>No assessments yet.</li>"}</ul>` +
        (published.length
          ? field("Select a published assessment", `<select name="test">${options(Object.fromEntries(published.map(test => [test.id, test.title])), published[0]?.id)}</select>`)
          : `<p class="form-error">Publish an assessment above before sending.</p>`);
      submitLabel = published.length ? "Send assessment link & update stage" : "";
    } else if (kind === "interview") {
      const early = new Date(Date.now() + 86400000);
      const second = new Date(Date.now() + 2 * 86400000);
      const slotValue = date => `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      stageFields = field("Interviewer", formInput("interviewer", "Hiring Manager")) +
        field("First time option", `<input type="datetime-local" name="first" value="${slotValue(early)}" required>`) +
        field("Second time option (optional)", `<input type="datetime-local" name="second" value="${slotValue(second)}">`);
      submitLabel = "Send interview invitation";
    }
    showModal("Load the next stage from this JD’s workflow", `${text(item.name)} · ${text(job?.title)} · ${text(workflowName)}`, "h-accept-next",
      hidden("id", item.id) + hidden("mode", "advance") +
      `<p>Next stage: <strong>${text(next.name)}</strong> (${stageKindLabel[next.kind] ?? text(next.kind)})</p>` +
      stageList +
      field("Configured stage type", `<select name="stageKind">${options(stageKindLabel, kind)}</select>`) +
      stageFields,
      submitLabel);
  }

  function openBooking(item) {
    const interview = interviewFor(item);
    if (!interview || interview.stage !== item.stage) return;
    if (interview.status === "Confirmed") {
      showModal("Request a schedule change", "The recruiter can offer new interview times.", "h-book",
        hidden("mode", "change") + field("Reason", area("reason", "")), "Request change");
      return;
    }
    const slots = interview.slots.filter(slot => +new Date(slot) > Date.now());
    showModal("Choose an interview time", "Select one available slot.", "h-book", hidden("mode", "confirm") +
      (slots.length ? field("Available time", `<select name="slot">${options(Object.fromEntries(slots.map(slot => [slot, dateTime(slot)])), slots[0])}</select>`) :
        "<p>No upcoming slots are available. Ask your recruiter for new times.</p>"), slots.length ? "Confirm interview" : "");
  }

  function submitAttempt(item, values, expired = false) {
    const test = testFor(item);
    if (!test?.started || test.submitted || test.stage !== item.stage) return;
    test.answers = test.questions.map((_, i) => values?.get(`answer-${i}`)?.trim() ?? "");
    test.submitted = stamp();
    event(item, expired ? "Timed assessment submitted when the time limit expired." : "Assessment submitted.");
    finish(expired ? "Time expired. Assessment submitted." : "Assessment submitted.");
  }

  function openAttempt() {
    const item = candidateSession();
    const test = testFor(item);
    if (!item || item.outcome !== "active" || !test || test.stage !== item.stage || test.submitted) return;
    if (!test.started) {
      test.started = Date.now();
      test.expires = test.started + test.minutes * 60000;
      event(item, "Timed assessment started.");
      save();
      render();
      document.querySelector('[data-action="h-attempt"]')?.focus({ preventScroll: true });
    }
    if (test.expires <= Date.now()) return submitAttempt(item, null, true);
    showModal(text(test.title), "You have one timed attempt. Your draft answers are kept if you leave this screen.", "h-attempt",
      `<p id="assessment-countdown" class="badge manual" aria-live="off"></p>${test.questions.map((row, i) =>
        field(`${i + 1}. ${text(row.prompt)}`, area(`answer-${i}`, test.draft?.[i], 1500))).join("")}`, "Submit assessment");
    tick();
  }

  function tick() {
    const timer = modal.querySelector("#assessment-countdown");
    const item = timer && modal.open ? candidateSession() : null;
    if (!item) return;
    const test = testFor(item);
    if (!test?.expires) return;
    const seconds = Math.max(0, Math.ceil((test.expires - Date.now()) / 1000));
    timer.textContent = `Time left · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    if (!seconds) submitAttempt(item, new FormData(timer.closest("form")), true);
  }

  function previewAssessment(item) {
    showModal("Preview assessment", `${text(item.title)} · ${item.minutes} minutes`, "h-view",
      `<ol class="hiring-list">${item.questions.map(row => `<li><strong>${text(row.prompt)}</strong><p>Answer guide: ${text(row.answer)}</p></li>`).join("")}</ol>`, "");
  }

  function openGrade(item) {
    showModal("Grade assessment", text(testFor(item).title), "h-grade",
      hidden("id", item.id) + `<ol class="hiring-list">${testFor(item).questions.map((row, i) =>
        `<li><strong>${text(row.prompt)}</strong><p>Candidate: ${text(testFor(item).answers[i] || "No answer")}</p><p>Answer guide: ${text(row.answer)}</p></li>`).join("")}</ol>` +
      field("Result", '<select name="result"><option>Passed</option><option>Failed</option></select>'),
      "Save grade");
  }

  function openOutcome(item, selectedDecision) {
    const canProceed = testFor(item)?.result !== "Failed";
    const choices = { ...(canProceed && item.stage < item.stages.length - 1 ? { advance: "Advance to next configured stage" } : {}),
      ...(canProceed && item.stage === item.stages.length - 1 ? { hire: "Confirm hire" } : {}), reject: "Reject" };
    showModal("Stage outcome", "Choose the next stage or a final hiring decision.", "h-outcome",
      hidden("id", item.id) + field("Outcome", `<select name="outcome">${options(choices, selectedDecision && choices[selectedDecision] ? selectedDecision : Object.keys(choices)[0])}</select>`) +
      field("Email template (for hire)", `<select name="template">${options({ offer: emailTypes.offer, welcome: emailTypes.welcome }, "offer")}</select>`) +
      field("Reason / decision notes", area("reason", "")), "Confirm outcome");
  }

  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("");
  const resumeText = (item, profile) => [
    item.name.toUpperCase(),
    profile.headline,
    `${item.email} · ${profile.location}`,
    "", "PROFESSIONAL SUMMARY", profile.summary,
    "", "CORE SKILLS", profile.skills.join(", "),
    "", "EXPERIENCE", ...profile.experience.flatMap(record => [`${record.title} — ${record.company} (${record.dates})`, record.details, ""]),
    "EDUCATION", `${profile.degree} · ${profile.education}`,
    "", "PORTFOLIO", profile.portfolio,
    "", "APPLICATION", item.answer,
    `Applied for ${fetchBy("jobs", item.job)?.title ?? ""} · Current stage: ${stage(item).name} · ${outcomes[item.outcome]}`
  ].join("\n");
  const recruiterActions = {
    "h-job": openJob,
    "h-candidate-accept": id => {
      const item = fetchBy("applications", id);
      if (item) openAcceptNextStage(item);
    },
    "h-candidate-decline": id => {
      const item = fetchBy("applications", id);
      if (item) openDecline(item);
    },
    "h-candidate-preview": id => {
      const item = fetchBy("applications", id);
      if (!item) return;
      const profile = candidateProfile(item);
      const downloadLink = `<a class="button secondary" download="${text(item.id)}-resume.txt" href="data:text/plain;charset=utf-8,${encodeURIComponent(resumeText(item, profile))}">Download</a>`;
      showModal(text(item.name), "Candidate profile · demo resume", "h-candidate-profile", `<article class="hiring-profile">
        <header class="hiring-profile-header">
          <div class="hiring-profile-avatar" aria-hidden="true">${item.avatar ? `<img src="${text(item.avatar)}" alt="${text(item.name)}">` : text(initials(item.name))}</div>
          <div><p>${text(profile.headline)}</p><p>${text(item.email)} · ${text(profile.location)}</p></div>
        </header>
        <section><h3>Professional summary</h3><p>${text(profile.summary)}</p></section>
        <section><h3>Core skills</h3><div class="hiring-profile-skills">${profile.skills.map(skill => badge(skill)).join("")}</div></section>
        <section><h3>Experience</h3>${profile.experience.map(record => `<div class="hiring-experience"><h4>${text(record.title)}</h4><p>${text(record.company)} · ${text(record.dates)}</p><p>${text(record.details)}</p></div>`).join("")}</section>
        <section><h3>Education</h3><p>${text(profile.degree)}</p><p>${text(profile.education)}</p></section>
        <section><h3>Portfolio</h3><p>${text(profile.portfolio)}</p></section>
        <section><h3>Application</h3><p>${text(item.answer)}</p><p>Applied for ${text(fetchBy("jobs", item.job)?.title)} · Current stage: ${text(stage(item).name)} · ${text(outcomes[item.outcome])}</p>
          <div class="v2-actions hiring-profile-decisions">${button("Accept", "h-candidate-accept", { value: item.id, kind: item.outcome === "hired" ? "primary" : "secondary" })}${button("Decline", "h-candidate-decline", { value: item.id, kind: item.outcome === "rejected" ? "danger" : "secondary" })}</div></section>
      </article>`, "", "primary", undefined, downloadLink);
    },
    "h-job-preview": id => {
      const job = fetchBy("jobs", id);
      if (job) showModal(text(`${job.title} · Full job description`), "Demo job description preview", "h-view", previewJD(job), "");
    },
    "h-workflow": openWorkflow,
    "h-workflow-view": id => {
      const item = fetchBy("workflows", id);
      if (!item) return;
      showModal(text(item.name), "Stages follow this order.", "h-view", `<ol class="hiring-list">${item.stages.map(row =>
        `<li><strong>${text(row.name)}</strong><p>${text(row.kind)} · ${text(row.criteria)}</p></li>`).join("")}</ol>`, "");
    },
    "h-workflow-delete": id => {
      const item = fetchBy("workflows", id);
      if (!item) return;
      const assigned = data().jobs.filter(job => job.workflow === id);
      if (assigned.length) return showModal("Workflow cannot be deleted", `This workflow is assigned to ${assigned.length} job description${assigned.length === 1 ? "" : "s"}. Reassign or delete those job descriptions first.`, "h-view",
        `<ul class="hiring-list">${assigned.map(job => `<li>${text(job.title)}</li>`).join("")}</ul>`, "");
      showModal("Delete workflow?", "This saved workflow will be removed.", "h-workflow-delete",
        hidden("id", id) + `<p>${text(item.name)}</p>`, "Delete workflow", "danger");
    },
    "h-job-status": id => {
      const item = fetchBy("jobs", id);
      if (!item) return;
      item.status = item.status === "published" ? "unpublished" : "published";
      save(`Job description ${jobStatuses[item.status].toLowerCase()}.`);
      render();
    },
    "h-job-delete": id => confirmJobs([id]),
    "h-test": openTest,
    "h-test-preview": id => { const item = fetchBy("tests", id); if (item) previewAssessment(item); },
    "h-test-toggle": id => {
      const item = fetchBy("tests", id);
      if (!item) return;
      item.status = item.status === "published" ? "unpublished" : "published";
      save(`Assessment ${testStatuses[item.status].toLowerCase()}.`);
      render();
      const acceptForm = modal.open && modal.querySelector('[data-form="h-accept-next"]');
      if (acceptForm) {
        const candidate = fetchBy("applications", acceptForm.elements.namedItem("id")?.value);
        if (candidate) openAcceptNextStage(candidate, "test");
      }
    },
    "h-template": id => {
      if (!Object.hasOwn(emailTypes, id)) return;
      const template = data().templates[id];
      showModal("Edit email template", `${text(emailTypes[id])} · Use {{candidate}} and {{job}} to insert names.`, "h-template",
        hidden("id", id) + field("Subject", formInput("subject", template.subject)) + field("Message", area("body", template.body)), "Save template");
    },
    "h-add": id => openApplication(id, true),
    "h-evaluate": id => {
      const item = fetchBy("applications", id);
      if (!item || item.outcome !== "active") return;
      const current = item.reviews[item.stage];
      showModal("Record evaluation", text(stage(item).criteria), "h-evaluate",
        hidden("id", id) + field("Rating", `<select name="rating">${options(ratings, current?.rating)}</select>`) +
        field("Evaluation notes", area("notes", current?.notes)), "Save evaluation");
    },
    "h-assign": id => {
      const item = fetchBy("applications", id);
      if (item?.outcome === "active" && stage(item).kind === "test" && testFor(item)?.stage !== item.stage) openAssignment(item);
    },
    "h-grade": id => {
      const item = fetchBy("applications", id);
      if (item?.outcome === "active" && testFor(item)?.stage === item.stage && testFor(item).submitted) openGrade(item);
    },
    "h-interview": id => {
      const item = fetchBy("applications", id);
      if (item?.outcome === "active" && stage(item).kind === "interview") openInterview(item);
    },
    "h-interview-status": id => {
      const item = fetchBy("applications", id);
    if (item?.outcome !== "active" || !interviewFor(item)) return;
      const choices = {
        ...(interviewFor(item).selected && interviewFor(item).status === "Confirmed" ? { completed: "Mark interview complete", reminder: "Send reminder" } : {}),
        cancelled: "Cancel interview"
      };
      showModal("Update interview", "Choose the status or message for this booking.", "h-interview-status", hidden("id", id) +
        field("Action", `<select name="status">${options(choices, Object.keys(choices)[0])}</select>`), "Apply change");
    },
    "h-outcome": id => { const item = fetchBy("applications", id); if (item?.outcome === "active") openOutcome(item); },
    "h-accept": id => { const item = fetchBy("applications", id); if (item?.outcome === "active") openOutcome(item, item.stage < item.stages.length - 1 ? "advance" : "hire"); },
    "h-decline": id => { const item = fetchBy("applications", id); if (item?.outcome === "active") openOutcome(item, "reject"); }
  };

  function confirmJobs(ids) {
    const jobs = ids.map(id => fetchBy("jobs", id)).filter(Boolean);
    if (!jobs.length) return;
    showModal(jobs.length === 1 ? "Delete job description?" : `Delete ${jobs.length} job descriptions?`,
      "This removes the selected postings and their candidate applications from the demo.", "h-job-delete",
      jobs.map(job => hidden("ids", job.id)).join("") + `<ul class="hiring-list">${jobs.map(job => `<li>${text(job.title)}</li>`).join("")}</ul>`,
      jobs.length === 1 ? "Delete JD" : "Delete selected JDs", "danger");
  }

  function action(name, id) {
    if (name === "h-apply") return openApplication(id);
    if (name === "h-attempt") return openAttempt();
    if (name === "h-book") {
      const item = candidateSession();
      if (item?.outcome === "active") openBooking(item);
      return;
    }
    if (isHR() && Object.hasOwn(recruiterActions, name)) recruiterActions[name](id);
  }

  const value = (form, name) => String(form.get(name) ?? "").trim();
  const saveRecord = (category, record) => {
    const current = fetchBy(category, record.id);
    if (current) Object.assign(current, record);
    else data()[category].push(record);
  };
  const currentApplicant = input => {
    const item = fetchBy("applications", value(input, "id"));
    return item?.outcome === "active" ? item : null;
  };
  const invalid = (form, message, name) => inlineError(form, message, name);
  const hrForms = {
    "h-job"(form, input) {
      const id = value(input, "id") || uid();
      const old = fetchBy("jobs", id);
      const workflow = value(input, "workflow");
      const saved = fetchBy("workflows", workflow);
      if (!saved && old?.workflow !== workflow) return invalid(form, "Select a saved recruitment workflow.", "workflow");
      const record = { id, workflow, status: value(input, "status") };
      for (const key of ["title", "department", "location", "description"]) {
        record[key] = value(input, key);
        if (!record[key]) return invalid(form, "Complete this job field.", key);
      }
      if (!Object.hasOwn(jobStatuses, record.status)) return invalid(form, "Choose a job status.", "status");
      const rows = cleanLines(value(input, "stages")).map(line => line.split("|").map(part => part.trim()));
      if (!rows.length || rows.some(([name, kind, criteria]) => !name || !criteria || !["review", "test", "interview"].includes(kind))) {
        return invalid(form, "Enter stages in order as Name | review, test or interview | evaluation criteria.", "stages");
      }
      record.stages = stagesCopy(rows.map(([name, kind, criteria]) => ({ name, kind, criteria })));
      saveRecord("jobs", record);
      finish(old ? "Job description saved." : "Job description created.");
    },
    "h-workflow"(form, input) {
      const name = value(input, "name");
      const rows = cleanLines(value(input, "stages")).map(line => line.split("|").map(field => field.trim()));
      if (!name) return invalid(form, "Enter a workflow name.", "name");
      if (!rows.length || rows.some(([name, kind, criteria]) => !name || !criteria || !["review", "test", "interview"].includes(kind))) {
        return invalid(form, "Enter at least one stage using Name | review, test or interview | evaluation criteria.", "stages");
      }
      saveRecord("workflows", { id: value(input, "id") || uid(), name, stages: stagesCopy(rows.map(([name, kind, criteria]) => ({ name, kind, criteria }))) });
      finish("Recruitment workflow saved.");
    },
    "h-workflow-delete"(form, input) {
      const id = value(input, "id");
      if (data().jobs.some(job => job.workflow === id)) return invalid(form, "This workflow is assigned to a job description. Reassign or delete those jobs first.");
      data().workflows = data().workflows.filter(item => item.id !== id);
      finish("Workflow deleted.");
    },
    "h-job-delete"(form, input) {
      const ids = new Set(input.getAll("ids"));
      if (!ids.size || !isHR()) return;
      const removed = data().jobs.filter(job => ids.has(job.id));
      data().jobs = data().jobs.filter(job => !ids.has(job.id));
      data().applications = data().applications.filter(item => !ids.has(item.job));
      finish(`${removed.length} job description${removed.length === 1 ? "" : "s"} deleted with associated applications.`);
    },
    "h-test"(form, input) {
      const title = value(input, "title");
      const minutes = Number(value(input, "minutes"));
      const rows = cleanLines(value(input, "questions")).map(line => line.split("|").map(field => field.trim()));
      if (!title) return invalid(form, "Enter the assessment title.", "title");
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return invalid(form, "Enter a duration from 1 to 180 minutes.", "minutes");
      if (!rows.length || rows.some(([prompt, answer]) => !prompt || !answer)) {
        return invalid(form, "Enter at least one question with an answer guide.", "questions");
      }
      const id = value(input, "id") || uid();
      saveRecord("tests", { id, title, minutes, status: fetchBy("tests", id)?.status ?? "draft",
        questions: rows.map(([prompt, answer]) => ({ prompt, answer })) });
      finish("Assessment saved.");
    },
    "h-template"(form, input) {
      const id = value(input, "id");
      if (!Object.hasOwn(emailTypes, id)) return;
      const subject = value(input, "subject");
      const body = value(input, "body");
      if (!subject || !body) return invalid(form, "Enter a subject and message.", !subject ? "subject" : "body");
      data().templates[id] = { subject, body };
      finish("Email template saved.");
    },
    "h-evaluate"(form, input) {
      const item = currentApplicant(input);
      if (!item) return;
      const rating = value(input, "rating");
      const notes = value(input, "notes");
      if (!Object.hasOwn(ratings, rating) || !notes) return invalid(form, "Select a rating and enter evidence or notes.", "notes");
      item.reviews[item.stage] = { rating, notes };
      event(item, `Evaluation saved for ${stage(item).name}.`);
      finish("Stage evaluation saved.");
    },
    "h-assign"(form, input) {
      const item = currentApplicant(input);
      const test = fetchBy("tests", value(input, "test"));
      if (!item || stage(item).kind !== "test" || testFor(item)?.stage === item.stage || test?.status !== "published") {
        return invalid(form, "Choose a published test for an unassigned assessment stage.");
      }
      (item.tests ??= {})[item.stage] = { ...structuredClone(test), stage: item.stage };
      event(item, `Assessment assigned: ${test.title}. Candidate link is available.`);
      item.messages.unshift({ type: "assessment", date: stamp(), subject: "Assessment invitation",
        body: `Complete ${test.title} from the Assessment section on this page.` });
      finish("Assessment invitation prepared.");
    },
    "h-grade"(form, input) {
      const item = currentApplicant(input);
      if (!item || testFor(item)?.stage !== item.stage || !testFor(item).submitted) return;
      const result = value(input, "result");
      if (!["Passed", "Failed"].includes(result)) return invalid(form, "Select Passed or Failed.", "result");
      testFor(item).result = result;
      event(item, `Assessment graded: ${result}.`);
      finish("Assessment grade saved.");
    },
    "h-interview"(form, input) {
      const item = currentApplicant(input);
      const slots = [...new Set([value(input, "first"), value(input, "second")].filter(Boolean))];
      if (!item || stage(item).kind !== "interview") return;
      if (!slots.length || slots.some(slot => !(+new Date(slot) > Date.now()))) {
        return invalid(form, "Choose at least one future interview time.", "first");
      }
      (item.interviews ??= {})[item.stage] = { stage: item.stage, interviewer: value(input, "interviewer") || "Hiring Manager", slots, selected: "", status: "Invited" };
      event(item, "Interview slots shared with the candidate.");
      notify(item, "invite");
      finish("Scheduling link is ready in the demo inbox.");
    },
    "h-accept-next"(form, input) {
      const item = currentApplicant(input);
      if (!item) return;
      const mode = value(input, "mode");
      if (mode === "hire" || item.stage >= item.stages.length - 1) {
        item.outcome = "hired";
        const notes = value(input, "reason");
        event(item, notes ? `Hired. ${notes}` : "Hired from candidate review.");
        const template = value(input, "template");
        notify(item, template === "welcome" ? "welcome" : "offer");
        finish("Candidate hired and email added to the demo inbox.");
        return;
      }
      const previous = stage(item).name;
      const next = item.stages[item.stage + 1];
      const kind = value(input, "stageKind") || next.kind;
      if (kind === "review") {
        const rating = value(input, "rating");
        const notes = value(input, "notes");
        if (!Object.hasOwn(ratings, rating) || !notes) return invalid(form, "Select a rating and enter evidence or notes.", "notes");
        item.stage += 1;
        item.outcome = "active";
        item.reviews[item.stage] = { rating, notes };
        event(item, `${previous} → ${next.name} (Accepted & evaluated: ${ratings[rating]}).`);
        finish("Stage passed and evaluation saved.");
        return;
      }
      if (kind === "test") {
        const test = fetchBy("tests", value(input, "test"));
        if (!test || test.status !== "published") return invalid(form, "Select a published assessment first.");
        item.stage += 1;
        item.outcome = "active";
        (item.tests ??= {})[item.stage] = { ...structuredClone(test), stage: item.stage };
        event(item, `${previous} → ${next.name}. Assessment assigned: ${test.title}.`);
        item.messages.unshift({ type: "assessment", date: stamp(), subject: "Assessment invitation",
          body: `Complete ${test.title} from the Assessment section on this page.` });
        finish("Assessment link sent and stage status updated.");
        return;
      }
      if (kind === "interview") {
        const slots = [...new Set([value(input, "first"), value(input, "second")].filter(Boolean))];
        if (!slots.length || slots.some(slot => !(+new Date(slot) > Date.now()))) {
          return invalid(form, "Choose at least one future interview time.", "first");
        }
        item.stage += 1;
        item.outcome = "active";
        (item.interviews ??= {})[item.stage] = { stage: item.stage, interviewer: value(input, "interviewer") || "Hiring Manager", slots, selected: "", status: "Invited" };
        event(item, `${previous} → ${next.name}. Interview slots shared with the candidate.`);
        notify(item, "invite");
        finish("Interview scheduled and invitation sent to demo inbox.");
      }
    },
    "h-decline-confirm"(form, input) {
      const item = currentApplicant(input);
      if (!item) return;
      const reason = value(input, "reason");
      if (!reason) return invalid(form, "Enter the reason for declining this candidate.", "reason");
      item.outcome = "rejected";
      event(item, `${outcomes[item.outcome]}. ${reason}`);
      notify(item, "reject");
      finish("Candidate declined and email added to the demo inbox.");
    },
    "h-interview-status"(form, input) {
      const item = currentApplicant(input);
      const interview = interviewFor(item);
      if (!interview || interview.stage !== item.stage || interview.status === "Cancelled") return;
      const status = value(input, "status");
      if (status === "reminder" && interview.selected && interview.status === "Confirmed") {
        notify(item, "reminder");
        return finish("Reminder added to the demo inbox.");
      }
      if (status === "completed" && interview.selected && interview.status === "Confirmed") interview.status = "Completed";
      else if (status === "cancelled") interview.status = "Cancelled";
      else return invalid(form, "Confirm an interview time before using this action.");
      event(item, `Interview ${interview.status.toLowerCase()}.`);
      finish("Interview status updated.");
    },
    "h-outcome"(form, input) {
      const item = currentApplicant(input);
      if (!item) return;
      const decision = value(input, "outcome");
      const reason = value(input, "reason");
      if (!reason) return invalid(form, "Enter the reason for this outcome.", "reason");
      if (decision === "advance" || decision === "hire") {
        if (testFor(item)?.result === "Failed") return invalid(form, "A failed assessment cannot advance to the next stage.");
        if (!item.reviews[item.stage]) return invalid(form, "Record the current-stage evaluation first.");
        if (stage(item).kind === "test" && (testFor(item)?.stage !== item.stage || !testFor(item).result)) {
          return invalid(form, "Grade the assessment before continuing.");
        }
        if (stage(item).kind === "interview" && (interviewFor(item)?.stage !== item.stage || !["Completed", "Cancelled"].includes(interviewFor(item).status))) {
          return invalid(form, "Complete or cancel the interview before continuing.");
        }
      }
      if (decision === "advance") {
        if (item.stage >= item.stages.length - 1) return invalid(form, "This is the final configured stage. Choose a final outcome.");
        const previous = stage(item).name;
        item.stage += 1;
        event(item, `${previous} → ${stage(item).name}. ${reason}`);
      } else if (decision === "reject" || decision === "hire") {
        if (decision === "hire" && item.stage !== item.stages.length - 1) return invalid(form, "Complete the configured stages before confirming hire.");
        item.outcome = decision === "hire" ? "hired" : "rejected";
        event(item, `${outcomes[item.outcome]}. ${reason}`);
        const template = value(input, "template");
        notify(item, decision === "reject" ? "reject" : template === "welcome" ? "welcome" : "offer");
      } else return invalid(form, "Select a stage outcome.");
      finish(decision === "advance" ? "Stage and timeline updated." : "Outcome saved and email added to the demo inbox.");
    }
  };

  async function modalSubmit(form, input) {
    const kind = form.dataset.form;
    if (kind === "h-view") return;
    if (kind === "h-application") {
      const job = fetchBy("jobs", value(input, "job"));
      const manual = value(input, "manual") === "1";
      if (!job || (manual ? !isHR() : job.status !== "published")) return invalid(form, "This job is unavailable.");
      const name = value(input, "name");
      const email = value(input, "email");
      const cv = value(input, "cv");
      const answer = value(input, "answer");
      const resumeFile = input.get("resume");
      const coverFile = input.get("coverLetter");
      const hasResume = typeof File !== "undefined" && resumeFile instanceof File && resumeFile.size > 0;
      const hasCover = typeof File !== "undefined" && coverFile instanceof File && coverFile.size > 0;
      if (!name || (!cv && !hasResume) || !answer) return invalid(form, "Enter your name, attach a resume or add relevant experience, and answer the application question.", !name ? "name" : !cv && !hasResume ? "cv" : "answer");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return invalid(form, "Enter a valid email.", "email");
      if (hasResume && resumeFile.size > 1_000_000) return invalid(form, "Keep the resume under 1 MB for this browser demo.", "resume");
      if (hasCover && coverFile.size > 1_000_000) return invalid(form, "Keep the cover letter under 1 MB for this browser demo.", "coverLetter");
      let resume = null;
      let coverLetter = null;
      try {
        if (hasResume) resume = await fileData(resumeFile);
        if (hasCover) coverLetter = await fileData(coverFile);
      } catch {
        return invalid(form, "The selected file could not be read. Choose it again.");
      }
      const item = { id: uid(), token: uid(), job: job.id, name, email, cv, answer, resume, coverLetter, stage: 0, stages: stagesCopy(job.stages),
        method: manual ? "manual" : value(input, "method"), outcome: "active", events: [], messages: [], reviews: {} };
      event(item, manual ? "Candidate added to job pipeline." : "Application submitted and added to job pipeline.");
      data().applications.push(item);
      finish(manual ? "Candidate added." : "Application submitted.");
      location.hash = manual ? recruiterURL(item) : portalURL(item);
      return;
    }
    if (kind === "h-attempt" || kind === "h-book") {
      const item = candidateSession();
      if (item?.outcome !== "active") return;
      if (kind === "h-attempt") {
        if (testFor(item)?.expires <= Date.now()) return submitAttempt(item, input, true);
        if (testFor(item)?.questions.some((_, i) => !value(input, `answer-${i}`))) return invalid(form, "Answer each question before submitting.");
        return submitAttempt(item, input);
      }
      const interview = interviewFor(item);
      if (!interview || interview.stage !== item.stage) return;
      if (value(input, "mode") === "change" && interview.status === "Confirmed") {
        const reason = value(input, "reason");
        if (!reason) return invalid(form, "Enter the reason for the change.", "reason");
        interview.status = "Change requested";
        event(item, `Candidate requested a schedule change: ${reason}`);
        return finish("Request sent to the recruiter in this demo.");
      }
      const slot = value(input, "slot");
      if (!["Invited", "Change requested"].includes(interview.status) || !interview.slots.includes(slot) || !(+new Date(slot) > Date.now())) {
        return invalid(form, "Select an upcoming available time.", "slot");
      }
      interview.selected = slot;
      interview.status = "Confirmed";
      event(item, `Candidate confirmed ${dateTime(slot)}.`);
      notify(item, "confirmation");
      return finish("Interview confirmed.");
    }
    if (isHR() && Object.hasOwn(hrForms, kind)) hrForms[kind](form, input);
  }

  function mainSubmit(form, input) {
    if (!isHR()) return;
    if (form.dataset.hiringMain === "pipeline-filter") {
      location.hash = slug("pipeline", { job: value(input, "job"), stage: value(input, "stage") });
      return;
    }
    if (form.dataset.hiringMain !== "bulk") return;
    const ids = new Set(input.getAll("jobs"));
    const status = value(input, "status");
    if (!ids.size) return invalid(form, "Select at least one job posting.");
    if (status === "delete") return confirmJobs([...ids]);
    if (!["published", "unpublished"].includes(status)) return;
    for (const job of data().jobs) if (ids.has(job.id)) job.status = status;
    save(`${ids.size} ${ids.size === 1 ? "posting" : "postings"} ${status}.`);
    render();
  }

  function draftInput(form) {
    if (form?.dataset.form !== "h-attempt") return;
    const item = candidateSession();
    if (!testFor(item)?.started || testFor(item).submitted || testFor(item).expires <= Date.now()) return;
    const input = new FormData(form);
    testFor(item).draft = testFor(item).questions.map((_, i) => input.get(`answer-${i}`) ?? "");
    save();
  }

  function modalChange(input) {
    if (input?.name === "stageKind" && input.form?.dataset.form === "h-accept-next") {
      const candidate = fetchBy("applications", input.form.elements.namedItem("id")?.value);
      if (candidate) openAcceptNextStage(candidate, input.value);
      return;
    }
    if (input?.name !== "workflow" || input.form?.dataset.form !== "h-job") return;
    const workflow = fetchBy("workflows", input.value);
    const stages = input.form.elements.namedItem("stages");
    if (workflow && stages) stages.value = workflow.stages.map(item => `${item.name} | ${item.kind} | ${item.criteria}`).join("\n");
  }

  return { views: { jobs, "hiring-workflows": workflows, assessments, "email-templates": templates, careers, pipeline, "candidate-portal": portal },
    action, modalSubmit, mainSubmit, draftInput, modalChange, tick };
}
