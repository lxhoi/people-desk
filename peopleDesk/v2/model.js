export const STORAGE_KEY = "peopledesk-prototype-v2";
export const USER = "linh";
export const PEOPLE = {
  linh: "Hà Linh", an: "An Nguyễn", ha: "Võ Hà", tu: "Mai Tú",
  phuong: "Minh Phương", nam: "Tuấn Nam", quang: "Minh Quang", mai: "Ngọc Mai"
};
export const TARGET = 8 * 60 * 60;
export const TYPES = {
  task: { name: "Task", symbol: "✓" },
  bug: { name: "Bug", symbol: "!" },
  story: { name: "Story", symbol: "◆" }
};
export const RANGES = {
  week: "This week",
  half: "Half-month",
  quarter: "This quarter",
  year: "This year",
  all: "All time",
  custom: "Custom range"
};
export const INTERVALS = { week: "Week", month: "Month", year: "Year" };

const pad = value => String(value).padStart(2, "0");
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export const at = (date, time = "00:00") => new Date(`${date}T${time}`);
export function addDays(day, amount) {
  const date = at(day, "12:00");
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}
export const weekStart = day => addDays(day, -((at(day).getDay() + 6) % 7));
export const prettyDate = day => day ? day.split("-").reverse().join("/") : "";
export function parseDate(value) {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())) return "";
  const day = value.trim().split("/").reverse().join("-");
  return dayKey(at(day)) === day ? day : "";
}
export function dateRange(from, to) {
  return from === to ? prettyDate(from) : `${prettyDate(from)} – ${prettyDate(to)}`;
}
export function clock(value) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function elapsed(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60].map(pad).join(":");
}
export function hours(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0 && seconds > 0) return "<1m";
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}
export const secondsFor = entry => Math.max(0, (entry.end - entry.start - (entry.pausedMs ?? 0)) / 1000);
export const total = entries => entries.reduce((sum, entry) => sum + secondsFor(entry), 0);
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const manages = role => role === "manager" || role === "admin";
export const projectList = state => state.projects.filter(project => !project.deleted);
export const projectName = (state, id) => state.projects.find(project => project.id === id)?.name ?? "Project";
export const taskName = (state, id) => state.tasks.find(task => task.id === id)?.name ?? "Task";
export const memberProjects = state => projectList(state).filter(project => project.members.includes(USER));
export const invoiceProjects = state => projectList(state).filter(project => project.invoiceRoles.includes(state.role));
export const reportPeople = role => role === "admin" ? Object.keys(PEOPLE) : role === "manager" ? ["linh", "an", "ha"] : [USER];
export const taskInProject = (state, project, task) => state.tasks.find(item => !item.deleted && item.id === task && item.project === project);

function initialState(today) {
  const projects = [
    { id: "atlas", name: "Atlas", description: "Operations platform and workspace improvements.", department: "Product & Engineering", lead: "Mai Tú", health: "On track", phase: "Delivery", start: addDays(today, -70), target: addDays(today, 35), budget: 1280, members: ["linh", "an", "tu", "phuong", "nam"], invoiceRoles: ["admin", "manager"] },
    { id: "people", name: "peopleDesk", description: "Employee experience and internal tools.", department: "People & Product", lead: "Võ Hà", health: "On track", phase: "Beta", start: addDays(today, -105), target: addDays(today, 21), budget: 920, members: ["linh", "ha", "phuong", "mai"], invoiceRoles: ["admin"] },
    { id: "studio", name: "Studio Refresh", description: "Internal design system maintenance.", department: "Design", lead: "Mai Tú", health: "At risk", phase: "Review", start: addDays(today, -42), target: addDays(today, 14), budget: 360, members: ["tu", "mai"], invoiceRoles: ["admin", "manager"] },
    { id: "phoenix", name: "Phoenix Mobile", description: "A responsive mobile experience for the employee workspace.", department: "Engineering", lead: "An Nguyễn", health: "On track", phase: "Build", start: addDays(today, -56), target: addDays(today, 49), budget: 1540, members: ["an", "nam", "quang", "linh"], invoiceRoles: ["admin", "manager"] },
    { id: "onboarding", name: "Onboarding Revamp", description: "A clearer first 30 days for every new teammate.", department: "People Operations", lead: "Hà Linh", health: "Needs review", phase: "Discovery", start: addDays(today, -28), target: addDays(today, 63), budget: 540, members: ["linh", "ha", "phuong", "mai"], invoiceRoles: ["admin"] },
    { id: "finance", name: "Finance Operations", description: "Invoice approvals, monthly close and project cost visibility.", department: "Finance", lead: "Minh Quang", health: "On track", phase: "Rollout", start: addDays(today, -91), target: addDays(today, 28), budget: 760, members: ["quang", "an", "linh"], invoiceRoles: ["admin", "manager"] }
  ];
  const tasks = [
    { id: "roster", project: "atlas", name: "Update project roster", type: "task", status: "open", parent: "", owner: "linh", priority: "High", due: addDays(today, 2), estimate: 4, label: "Operations" },
    { id: "tracking", project: "atlas", name: "Time tracking review", type: "story", status: "open", parent: "", owner: "an", priority: "Medium", due: addDays(today, 4), estimate: 8, label: "Reporting" },
    { id: "audit", project: "atlas", name: "Audit access rules", type: "bug", status: "done", parent: "", owner: "quang", priority: "High", due: addDays(today, -5), estimate: 5, label: "Security" },
    { id: "atlas-import", project: "atlas", name: "Validate employee import mapping", type: "task", status: "open", parent: "", owner: "phuong", priority: "Medium", due: addDays(today, 5), estimate: 6, label: "Data" },
    { id: "atlas-permissions", project: "atlas", name: "Review role permission matrix", type: "story", status: "open", parent: "", owner: "linh", priority: "High", due: addDays(today, 7), estimate: 10, label: "Security" },
    { id: "atlas-notifications", project: "atlas", name: "Tune overdue task notifications", type: "task", status: "done", parent: "", owner: "nam", priority: "Low", due: addDays(today, -2), estimate: 3, label: "Automation" },
    { id: "dashboard", project: "people", name: "Refine employee dashboard", type: "story", status: "open", parent: "", owner: "ha", priority: "High", due: addDays(today, 3), estimate: 12, label: "Experience" },
    { id: "labels", project: "people", name: "Review empty-state labels", type: "task", status: "open", parent: "dashboard", owner: "linh", priority: "Low", due: addDays(today, 6), estimate: 3, label: "Content" },
    { id: "leave-widget", project: "people", name: "Build leave balance widget", type: "story", status: "open", parent: "", owner: "phuong", priority: "Medium", due: addDays(today, 8), estimate: 13, label: "Leave" },
    { id: "people-accessibility", project: "people", name: "Complete accessibility pass", type: "bug", status: "open", parent: "", owner: "mai", priority: "High", due: addDays(today, 9), estimate: 8, label: "Quality" },
    { id: "people-profile", project: "people", name: "Update profile completion flow", type: "task", status: "done", parent: "", owner: "ha", priority: "Medium", due: addDays(today, -4), estimate: 5, label: "Onboarding" },
    { id: "tokens", project: "studio", name: "Review color tokens", type: "task", status: "open", parent: "", owner: "tu", priority: "Medium", due: addDays(today, 5), estimate: 6, label: "Foundations" },
    { id: "studio-forms", project: "studio", name: "Document form field states", type: "story", status: "open", parent: "", owner: "mai", priority: "High", due: addDays(today, 8), estimate: 10, label: "Documentation" },
    { id: "studio-icons", project: "studio", name: "Refresh workspace icon set", type: "task", status: "done", parent: "", owner: "tu", priority: "Low", due: addDays(today, -6), estimate: 8, label: "Icons" },
    { id: "phoenix-shell", project: "phoenix", name: "Implement mobile navigation shell", type: "story", status: "open", parent: "", owner: "an", priority: "High", due: addDays(today, 4), estimate: 16, label: "Mobile" },
    { id: "phoenix-sync", project: "phoenix", name: "Handle offline time entry sync", type: "bug", status: "open", parent: "", owner: "nam", priority: "High", due: addDays(today, 7), estimate: 12, label: "Sync" },
    { id: "phoenix-push", project: "phoenix", name: "Add notification preferences", type: "task", status: "open", parent: "", owner: "quang", priority: "Medium", due: addDays(today, 12), estimate: 7, label: "Notifications" },
    { id: "phoenix-qa", project: "phoenix", name: "Run device coverage review", type: "task", status: "done", parent: "", owner: "an", priority: "Medium", due: addDays(today, -3), estimate: 5, label: "QA" },
    { id: "onboarding-map", project: "onboarding", name: "Map the first-week journey", type: "story", status: "open", parent: "", owner: "linh", priority: "High", due: addDays(today, 3), estimate: 12, label: "Discovery" },
    { id: "onboarding-checklist", project: "onboarding", name: "Draft manager checklist", type: "task", status: "open", parent: "", owner: "phuong", priority: "Medium", due: addDays(today, 6), estimate: 7, label: "Managers" },
    { id: "onboarding-survey", project: "onboarding", name: "Review new-hire survey results", type: "task", status: "open", parent: "", owner: "ha", priority: "Low", due: addDays(today, 10), estimate: 4, label: "Research" },
    { id: "onboarding-policy", project: "onboarding", name: "Confirm policy acknowledgement steps", type: "bug", status: "done", parent: "", owner: "mai", priority: "Medium", due: addDays(today, -7), estimate: 4, label: "Compliance" },
    { id: "finance-close", project: "finance", name: "Reconcile project hours for close", type: "task", status: "open", parent: "", owner: "quang", priority: "High", due: addDays(today, 2), estimate: 8, label: "Monthly close" },
    { id: "finance-approval", project: "finance", name: "Add second-level invoice approval", type: "story", status: "open", parent: "", owner: "an", priority: "Medium", due: addDays(today, 7), estimate: 13, label: "Approvals" },
    { id: "finance-export", project: "finance", name: "Verify accounting export totals", type: "bug", status: "open", parent: "", owner: "linh", priority: "High", due: addDays(today, 5), estimate: 6, label: "Export" },
    { id: "finance-mapping", project: "finance", name: "Document cost center mapping", type: "task", status: "done", parent: "", owner: "quang", priority: "Low", due: addDays(today, -8), estimate: 4, label: "Documentation" }
  ];
  const entries = createDemoEntries(today, projects, tasks, []);
  const invoiceSpecs = [
    ["INV-2026-104", "atlas", -5, "Kobizo JSC", "Northstar Labs", "Atlas operations and platform delivery", 15, "Sent"],
    ["INV-2026-097", "people", -19, "Kobizo JSC", "Evergreen People Co.", "peopleDesk product and employee experience", 15, "Paid"],
    ["INV-2026-088", "phoenix", -39, "Kobizo JSC", "Northstar Labs", "Phoenix mobile experience delivery", 15, "Paid"],
    ["INV-2026-076", "finance", -61, "Kobizo JSC", "Lotus Finance Group", "Finance operations and reporting support", 15, "Overdue"],
    ["INV-2026-061", "studio", -83, "Kobizo JSC", "Kobizo Design Studio", "Design system maintenance and documentation", 15, "Paid"]
  ];
  const invoices = invoiceSpecs.map(([number, project, offset, sender, recipient, service, count, status]) => {
    const cutoff = addDays(today, offset);
    const start = addDays(cutoff, -30);
    const entriesForInvoice = entries.filter(entry => entry.project === project && entry.day > start && entry.day <= cutoff).slice(-count);
    const seconds = total(entriesForInvoice);
    return { id: number.toLowerCase(), number, date: cutoff, project, sender, recipient, service,
      entries: entriesForInvoice.map(entry => entry.id), seconds, status, currency: "USD", rate: 65, amount: Math.round(seconds / 3600 * 65 * 100) / 100 };
  });
  const leave = [
    { id: "leave-2026-021", person: "linh", from: addDays(today, 12), to: addDays(today, 13), type: "Annual leave", status: "Approved", notes: "Family visit" },
    { id: "leave-2026-018", person: "linh", from: addDays(today, -24), to: addDays(today, -24), type: "Sick leave", status: "Approved", notes: "Medical appointment" },
    { id: "leave-2026-017", person: "linh", from: addDays(today, 21), to: addDays(today, 21), type: "Personal leave", status: "Pending", notes: "Personal appointment" },
    { id: "leave-2026-016", person: "linh", from: addDays(today, 40), to: addDays(today, 44), type: "Annual leave", status: "Rejected", notes: "Overlapping release coverage" },
    { id: "leave-2026-015", person: "an", from: addDays(today, 7), to: addDays(today, 8), type: "Annual leave", status: "Pending", notes: "Short break" },
    { id: "leave-2026-014", person: "ha", from: addDays(today, -13), to: addDays(today, -13), type: "Personal leave", status: "Approved", notes: "Family matter" }
  ];
  return {
    projects, tasks,
    entries, role: "employee", project: "atlas", task: "", active: null, pending: null, invoices, leave,
    demoSeedVersion: 4
  };
}

function createDemoEntries(today, projects, tasks, existing) {
  const people = Object.keys(PEOPLE);
  const entries = [];
  for (let offset = 98; offset >= 0; offset--) {
    const day = addDays(today, -offset);
    const date = at(day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    people.forEach((person, personIndex) => {
      if (existing.some(entry => entry.person === person && entry.day === day)) return;
      const assignedProjects = projects.filter(project => project.members.includes(person));
      if (!assignedProjects.length) return;
      const project = assignedProjects[(personIndex + date.getDate()) % assignedProjects.length];
      const projectTasks = tasks.filter(task => task.project === project.id && task.owner === person);
      const availableTasks = projectTasks.length ? projectTasks : tasks.filter(task => task.project === project.id);
      if (!availableTasks.length) return;
      const taskA = availableTasks[(date.getDate() + personIndex) % availableTasks.length];
      const taskB = availableTasks[(date.getDate() + personIndex + 1) % availableTasks.length];
      const shorterDay = (date.getDate() + personIndex) % 5 === 0;
      const firstEnd = shorterDay ? "12:00" : "13:00";
      const secondStart = "14:00";
      const secondEnd = shorterDay ? "18:00" : "18:30";
      const parts = [["09:00", firstEnd, taskA], [secondStart, secondEnd, taskB]];
      parts.forEach(([start, end, task], partIndex) => entries.push({
        id: `demo-v3-${day}-${person}-${partIndex + 1}`, day, person, project: project.id, task: task.id,
        start: +at(day, start), end: +at(day, end), source: (date.getDate() + personIndex + partIndex) % 4 === 0 ? "Manual" : "Timer"
      }));
    });
  }
  return entries;
}

function mergeById(current, seeded) {
  const ids = new Set(current.map(item => item.id));
  return [...current, ...seeded.filter(item => !ids.has(item.id))];
}

function hydrateDemo(saved, today) {
  if ((saved.demoSeedVersion ?? 0) >= 4) return saved;
  const seed = initialState(today);
  const savedProjects = new Map(saved.projects.map(project => [project.id, project]));
  const savedTasks = new Map(saved.tasks.map(task => [task.id, task]));
  saved.projects = seed.projects.map(project => {
    const current = savedProjects.get(project.id);
    if (!current) return project;
    return { ...project, ...current,
      members: [...new Set([...project.members, ...(current.members ?? [])])],
      invoiceRoles: [...new Set([...project.invoiceRoles, ...(current.invoiceRoles ?? [])])] };
  }).concat(saved.projects.filter(project => !seed.projects.some(seedProject => seedProject.id === project.id)));
  saved.tasks = seed.tasks.map(task => ({ ...task, ...(savedTasks.get(task.id) ?? {}) }))
    .concat(saved.tasks.filter(task => !seed.tasks.some(seedTask => seedTask.id === task.id)));
  saved.entries = mergeById(saved.entries, createDemoEntries(today, saved.projects, saved.tasks, saved.entries));
  saved.invoices = mergeById(saved.invoices, seed.invoices);
  saved.leave = mergeById(saved.leave, seed.leave);
  saved.demoSeedVersion = 4;
  return saved;
}

export function load(storage = localStorage, today = dayKey()) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (saved && ["projects", "tasks", "entries", "invoices", "leave"].every(key => Array.isArray(saved[key]))) return hydrateDemo(saved, today);
  } catch {
    // Continue with the demo data when storage is unavailable.
  }
  return initialState(today);
}

export function entriesBetween(state, from, to, personIds, project = "all") {
  return state.entries.filter(entry => entry.day >= from && entry.day <= to &&
    personIds.includes(entry.person) && (project === "all" || entry.project === project))
    .sort((left, right) => right.start - left.start);
}

export function splitEntry({ start, end, project, task, source, pausedMs = 0 }) {
  const parts = [];
  for (let cursor = start; cursor < end;) {
    const day = dayKey(new Date(cursor));
    const stop = Math.min(end, +at(addDays(day, 1)));
    parts.push({ id: uid(), day, start: cursor, end: stop, project, task, source, person: USER, pausedMs: parts.length ? 0 : pausedMs });
    cursor = stop;
  }
  return parts;
}

export function conflictingEntry(state, draft) {
  return state.entries.some(entry => entry.person === USER && entry.start < draft.end && entry.end > draft.start);
}

export function aboveTarget(state, parts) {
  return parts.filter(part => total(entriesBetween(state, part.day, part.day, [USER])) + secondsFor(part) > TARGET)
    .map(part => ({ day: part.day, seconds: total(entriesBetween(state, part.day, part.day, [USER])) + secondsFor(part) }));
}

export function presetRange(mode, today, entries) {
  const date = at(today);
  const year = date.getFullYear();
  const month = date.getMonth();
  if (mode === "week") return [weekStart(today), addDays(weekStart(today), 6)];
  if (mode === "half") {
    const first = date.getDate() <= 15;
    return [dayKey(new Date(year, month, first ? 1 : 16)), dayKey(new Date(year, month + (first ? 0 : 1), first ? 15 : 0))];
  }
  if (mode === "quarter") {
    const start = Math.floor(month / 3) * 3;
    return [dayKey(new Date(year, start, 1)), dayKey(new Date(year, start + 3, 0))];
  }
  if (mode === "year") return [`${year}-01-01`, `${year}-12-31`];
  if (mode === "all") return [entries.reduce((first, entry) => entry.day < first ? entry.day : first, today), today];
  return [today, today];
}

export function bucketRange(day, interval) {
  if (interval === "week") {
    const start = weekStart(day);
    return [start, addDays(start, 6)];
  }
  if (interval === "month") {
    const date = at(day);
    return [`${day.slice(0, 7)}-01`, dayKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))];
  }
  return [`${day.slice(0, 4)}-01-01`, `${day.slice(0, 4)}-12-31`];
}
