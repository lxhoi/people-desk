import {
  STORAGE_KEY, USER, PEOPLE, TARGET, TYPES, RANGES, INTERVALS, load, dayKey, at, addDays,
  weekStart, prettyDate, parseDate, dateRange, clock, elapsed, hours, secondsFor, total, uid,
  manages, projectList, projectName, taskName, memberProjects, invoiceProjects, reportPeople,
  taskInProject, entriesBetween, splitEntry, conflictingEntry, aboveTarget, presetRange, bucketRange
} from "./model.js";
import { createHiring } from "./hiring.js";

const main = document.querySelector("#main");
const roleInput = document.querySelector("#role");
const modal = document.querySelector("#modal");
const notice = document.querySelector("#notice");
const state = load();
let page = "overview";
let selectedDay = dayKey();
let period = "week";
let selectedProjects = new Set();
let selectedTasks = new Set();
let invoker;
let noticeTimer;
const text = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[ch]);
const params = () => new URLSearchParams(location.hash.split("?")[1]);
const slug = (route, query) => `#${route}${query ? `?${new URLSearchParams(query)}` : ""}`;
const option = (value, label, current) => `<option value="${text(value)}"${value === current ? " selected" : ""}>${text(label)}</option>`;
const options = (map, current) => Object.entries(map).map(([value, label]) => option(value, label, current)).join("");
const projectOptions = (projects, current) => projects.map(item => option(item.id, item.name, current)).join("");
const button = (label, action, { value = "", kind = "secondary", disabled = false } = {}) =>
  `<button type="button" class="button ${kind}" data-action="${action}" data-value="${text(value)}"${disabled ? " disabled" : ""}>${label}</button>`;
const link = (label, href, kind = "secondary") => `<a class="button ${kind}" href="${text(href)}">${label}</a>`;
const field = (title, contents) => `<label class="field">${title}${contents}</label>`;
const dateField = (label, name, value, readOnly = false) =>
  field(label, `<input name="${name}" value="${text(prettyDate(value))}" placeholder="dd/mm/yyyy" maxlength="10" inputmode="numeric"${readOnly ? " readonly" : ""} required>`);
const taskIcon = task => {
  const type = TYPES[task?.type] ?? TYPES.task;
  return `<span class="task-icon ${text(task?.type)}" title="${type.name}" aria-label="${type.name}">${type.symbol}</span>`;
};
const projectById = id => projectList(state).find(project => project.id === id);
const employee = () => state.role === "employee";
const admin = () => manages(state.role);
const canManageTask = task => Boolean(task && (admin() || employee() && (task.owner === USER || task.createdBy === USER)));
const taskDescription = task => task.description || `Deliver “${task.name}” for ${projectName(state, task.project)}. Coordinate with the project team, check the work against the agreed requirements, and record decisions or follow-up items here.`;
const taskComments = task => task.comments?.length ? task.comments : [{ id: "demo-comment", author: PEOPLE[task.owner] ?? "Project team", date: task.updatedAt ?? dayKey(), body: task.status === "done" ? "Completed and checked against the acceptance notes." : `Planning note: confirm the next step for ${task.label ?? task.name} with the project team.` }];

function taskMenu(task) {
  const canManage = canManageTask(task);
  const log = employee() && task.status === "open" ? button("Manual log", "log-task", { value: task.id, disabled: Boolean(state.pending || state.active) }) : "";
  return `<details class="v2-floating-actions v2-task-actions"><summary class="button secondary v2-more-icon" aria-label="Task actions for ${text(task.name)}" title="Task actions">⋮</summary>
    <div class="v2-floating-menu v2-task-action-menu">${button("View task details", "task-details", { value: task.id })}
      ${canManage ? button("Edit task", "edit-task", { value: task.id }) : ""}${canManage ? button("Create subtask", "new-subtask", { value: task.id }) : ""}
      ${canManage ? button(task.status === "done" ? "Reopen task" : "Mark complete", task.status === "done" ? "reopen" : "complete", { value: task.id }) : ""}
      ${canManage ? button("Delete task", "delete-task", { value: task.id, kind: "danger" }) : ""}${log}</div></details>`;
}

function showTaskDetails(id, source) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  const comments = taskComments(task);
  const content = `<article class="v2-task-details">
    <div class="v2-task-detail-meta"><div><span>Project</span><strong>${text(projectName(state, task.project))}</strong></div>
      <div><span>Type</span><strong>${text(TYPES[task.type]?.name ?? "Task")}</strong></div><div><span>Status</span><strong>${task.status === "done" ? "Completed" : "Open"}</strong></div>
      <div><span>Owner</span><strong>${text(PEOPLE[task.owner] ?? "Unassigned")}</strong></div><div><span>Priority</span><strong>${text(task.priority ?? "Medium")}</strong></div>
      <div><span>Due date</span><strong>${text(prettyDate(task.due) || "Not set")}</strong></div><div><span>Estimate</span><strong>${task.estimate ? `${text(task.estimate)} hours` : "Not set"}</strong></div>
      <div><span>Label</span><strong>${text(task.label || "Unlabeled")}</strong></div>
      ${task.parent ? `<div><span>Parent task</span><strong>${text(taskName(state, task.parent))}</strong></div>` : ""}</div>
    <section><h3>Description</h3><p>${text(taskDescription(task))}</p></section>
    <section><h3>Comments · ${comments.length}</h3><ul class="v2-task-comments">${comments.map(comment => `<li><strong>${text(comment.author ?? "Project team")}</strong><small>${text(prettyDate(comment.date) || "Today")}</small><p>${text(comment.body)}</p></li>`).join("")}</ul></section>
  </article>`;
  showModal(text(task.name), "Task details and discussion", "task-view", content, "", "primary", source,
    canManageTask(task) ? button("Edit task", "edit-task", { value: task.id }) : "");
}

function entryTimerButton(project, taskId) {
  const task = taskInProject(state, project, taskId);
  const active = state.active?.project === project && state.active?.task === taskId;
  const paused = active && Boolean(state.active.pausedAt);
  const disabled = Boolean(state.pending) || Boolean(state.active && !active) || (!active && (!task || task.status !== "open"));
  const label = active && !paused ? "Pause timer" : active ? "Resume timer" : "Start timer";
  const icon = active && !paused ? "Ⅱ" : "▶";
  return `<button type="button" class="button ${active ? "primary" : "secondary"} v2-entry-timer" aria-label="${label} for ${text(taskName(state, taskId))}" title="${label}" data-action="task-timer" data-value="${text(`${project}::${taskId}`)}"${disabled ? " disabled" : ""}>${icon}</button>`;
}

function taskBoard() {
  const projects = memberProjects(state);
  const tasks = state.tasks.filter(task => !task.deleted && projects.some(project => project.id === task.project) && canManageTask(task));
  const selected = tasks.filter(task => selectedTasks.has(task.id));
  const allSelected = tasks.length > 0 && tasks.every(task => selectedTasks.has(task.id));
  const toolbar = `<div class="v2-task-bulk"><span id="task-selection-count">${selected.length} selected</span>
    ${button("Complete selected", "bulk-task-status", { value: "done", disabled: !selected.length || selected.every(task => task.status === "done") })}
    ${button("Reopen selected", "bulk-task-status", { value: "open", disabled: !selected.length || selected.every(task => task.status === "open") })}
    ${button("Delete selected", "bulk-task-delete", { kind: "danger", disabled: !selected.length })}</div>`;
  const rows = tasks.map(task => `<tr><td><input type="checkbox" data-task-check="${text(task.id)}" aria-label="Select ${text(task.name)}"${selectedTasks.has(task.id) ? " checked" : ""}></td>
    <td><div class="v2-task-name">${taskIcon(task)}<div><button type="button" class="text-link v2-task-title" data-action="task-details" data-value="${text(task.id)}">${text(task.name)}</button>${task.parent ? `<small class="v2-subline">Subtask of ${text(taskName(state, task.parent))}</small>` : `<small class="v2-subline">${text(task.label ?? "Task")}</small>`}</div></div></td>
    <td>${text(projectName(state, task.project))}</td><td><span class="badge ${task.status === "done" ? "saved" : ""}">${task.status === "done" ? "Completed" : "Open"}</span></td>
    <td><span class="badge ${task.priority === "High" ? "manual" : ""}">${text(task.priority ?? "Medium")}</span></td><td>${text(prettyDate(task.due) || "—")}</td>
    <td>${entryTimerButton(task.project, task.id)}</td><td>${taskMenu(task)}</td></tr>`).join("");
  return table("My tasks & subtasks", `${tasks.length} tasks you can manage across your assigned projects. Select several to update them together.`,
    ['<input type="checkbox" id="all-tasks" aria-label="Select all my tasks"' + (allSelected ? " checked" : "") + ">", "Task", "Project", "Status", "Priority", "Due", "Log time", "Actions"],
    rows, toolbar);
}

function save(message) {
  let stored = true;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { stored = false; }
  if (message) {
    clearTimeout(noticeTimer);
    notice.textContent = stored ? message : `${message} Changes are available for this session only.`;
    noticeTimer = setTimeout(() => { notice.textContent = ""; }, 5000);
  }
}

function header(section, title, description, actions = "") {
  return `<header class="v2-page-header"><div><p class="v2-breadcrumb">${section}</p><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</div><div class="v2-actions">${actions}</div></header>`;
}

function table(title, subtitle, columns, rows, action = "") {
  return `<section class="card table-card"><div class="table-header"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>
    ${rows ? `<div class="table-scroll"><table><thead><tr>${columns.map(label => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">No records match this view.</p>'}</section>`;
}

function restricted(message) {
  return header("Workspace", "Access restricted", message, link("Back to Overview", "#overview"));
}

function overview() {
  const today = dayKey();
  const seconds = total(entriesBetween(state, today, today, [USER]));
  const week = total(entriesBetween(state, weekStart(today), addDays(weekStart(today), 6), [USER]));
  const visibleProjects = employee() ? memberProjects(state) : projectList(state);
  const taskCount = state.tasks.filter(task => !task.deleted && visibleProjects.some(project => project.id === task.project) && task.status === "open").length;
  return header("Workspace", "Overview", prettyDate(today),
      employee() ? link("Start logging time", "#time", "primary") : link("Manage projects", "#projects", "primary")) +
    `<section class="v2-welcome"><div><h2>${employee() ? "Track work against your tasks" : "Keep project work in view"}</h2>
      <p>${employee() ? "Open a project, choose a task and log time. Your saved hours appear in Personal Reports." : "Manage project work, review team hours and prepare invoices for authorized projects."}</p></div>
      ${link(employee() ? "Browse my projects" : "Browse project list", "#projects")}</section>
    <div class="v2-stats">
      ${stat(employee() ? "Logged today" : "Team hours this week", employee() ? hours(seconds) : hours(total(entriesBetween(state, weekStart(today), addDays(weekStart(today), 6), reportPeople(state.role)))), employee() ? "Daily target · 8 hours" : "Authorized team entries")}
      ${stat("Active projects", visibleProjects.length, employee() ? "Projects assigned to you" : "Available in this workspace")}
      ${stat(employee() ? "My week" : "Open tasks", employee() ? hours(week) : taskCount, employee() ? dateRange(weekStart(today), addDays(weekStart(today), 6)) : "Across active projects")}
    </div>
    ${table("Projects", "Open a project to see its tasks.", ["Project", "Open tasks", "Action"], visibleProjects.map(project =>
      `<tr><td class="row-project">${text(project.name)}<small class="v2-subline">${text(project.description)}</small></td><td>${state.tasks.filter(task => !task.deleted && task.project === project.id && task.status === "open").length}</td><td>${link("View tasks", slug("projects", { project: project.id }))}</td></tr>`).join(""))}`;
}

function stat(title, value, caption) {
  return `<section class="card v2-stat"><p>${title}</p><strong>${text(value)}</strong><small>${caption}</small></section>`;
}

function projectsPage() {
  const available = employee() ? memberProjects(state) : projectList(state);
  const selected = params().get("project");
  if (selected) {
    const project = available.find(item => item.id === selected);
    if (!project) return restricted("You cannot access this project.");
    const tasks = state.tasks.filter(task => task.project === selected && !task.deleted);
    const rows = tasks.map(task => `<tr><td><div class="v2-task-name">${taskIcon(task)}<div><button type="button" class="text-link v2-task-title" data-action="task-details" data-value="${text(task.id)}">${text(task.name)}</button>${task.parent ? `<small class="v2-subline">Sub-task of ${text(taskName(state, task.parent))}</small>` : ""}</div></div></td>
      <td>${TYPES[task.type].name}</td><td>${text(PEOPLE[task.owner] ?? "Unassigned")}</td><td><span class="badge ${task.priority === "High" ? "manual" : ""}">${text(task.priority ?? "Medium")}</span></td><td>${prettyDate(task.due)}</td>
      <td><span class="badge ${task.status === "done" ? "saved" : ""}">${task.status === "done" ? "Completed" : "Open"}</span></td>
      <td>${taskMenu(task)}</td></tr>`).join("");
    return header("Projects &amp; tasks", text(project.name), text(project.description),
      link("All projects", "#projects") + button("New task", "new-task", { value: selected, kind: "primary" })) +
      table("Tasks", `${tasks.length} tasks · ${project.lead ?? "Project team"} · ${project.phase ?? "In progress"} · ${project.health ?? "On track"}`, ["Task", "Type", "Owner", "Priority", "Due", "Status", "Actions"], rows);
  }

  const rows = available.map(project => `<tr>${admin() ? `<td><input type="checkbox" data-project-check="${text(project.id)}" aria-label="Select ${text(project.name)}"${selectedProjects.has(project.id) ? " checked" : ""}></td>` : ""}
    <td><a class="text-link" href="${text(slug("projects", { project: project.id }))}">${text(project.name)}</a><small class="v2-subline">${text(project.description)}</small><small class="v2-subline">${text(project.lead ?? "Project team")} · ${text(project.phase ?? "In progress")} · ${text(project.health ?? "On track")} · Target ${prettyDate(project.target)}</small></td>
    <td>${project.members.length}</td><td>${state.tasks.filter(task => !task.deleted && task.project === project.id).length}</td>
    <td>${admin() ? button("Edit", "edit-project", { value: project.id }) : link("View tasks", slug("projects", { project: project.id }))}</td></tr>`).join("");
  const selection = admin() ? `<div class="v2-actions"><small id="project-selection">${selectedProjects.size} selected</small>${button("Delete selected", "delete-projects", { kind: "danger", disabled: !selectedProjects.size })}</div>` : "";
  return header("Workspace", "Projects &amp; tasks", employee() ? "Manage tasks in your assigned projects." : "Create and manage the projects your team works on.",
      admin() ? button("New project", "new-project", { kind: "primary" }) : "") +
    table("Project list", `${available.length} active ${available.length === 1 ? "project" : "projects"}`, [
      ...(admin() ? ['<input type="checkbox" id="all-projects" aria-label="Select all projects"' + (available.length && available.every(item => selectedProjects.has(item.id)) ? " checked" : "") + '>'] : []),
      "Project", "Members", "Tasks", "Actions"
    ], rows, selection);
}

function taskChoices(project, current) {
  return state.tasks.filter(task => !task.deleted && task.project === project)
    .map(task => option(task.id, `${TYPES[task.type].symbol} ${task.name}${task.status === "done" ? " · Completed" : ""}`, current)).join("");
}

function trackerSelection() {
  const projects = memberProjects(state);
  const requestedProject = params().get("project");
  const project = state.active?.project ?? ([requestedProject, state.project].find(id => projects.some(item => item.id === id)) || projects[0]?.id || "");
  const requestedTask = params().get("task");
  const task = state.active?.task ?? ([requestedTask, state.task].find(id => taskInProject(state, project, id)) || "");
  return { project, task, projects };
}

function timePage() {
  if (!employee()) return restricted("Switch to Employee to log your own time.");
  const { project } = trackerSelection();
  const active = state.active;
  const today = dayKey();
  const from = period === "day" ? selectedDay : weekStart(selectedDay);
  const to = period === "day" ? from : addDays(from, 6);
  const daySeconds = total(entriesBetween(state, selectedDay, selectedDay, [USER]));
  const missing = Math.max(0, TARGET - daySeconds);
  const activeDay = active && dayKey(new Date(active.start));
  const activeElapsed = active ? Math.max(0, Date.now() - active.start - (active.pausedMs ?? 0) - (active.pausedAt ? Date.now() - active.pausedAt : 0)) : 0;
  const alert = active ? `<div class="v2-alert" role="status"><strong>${active.pausedAt ? "Timer paused" : activeDay === today ? "Timer still running" : "Timer running from an earlier day"}</strong><p>Started ${prettyDate(activeDay)} at ${clock(active.start)} for ${text(taskName(state, active.task))} · ${elapsed(activeElapsed / 1000)} elapsed. ${active.pausedAt ? "Resume from its task row or stop it when finished." : "Pause from its task row or stop it when finished."}</p></div>` : "";
  const pending = state.pending ? `<div class="v2-alert" role="status"><strong>Time entry needs review</strong><p>Review or correct the recorded duration before saving.</p>${button("Review entry", "review", { kind: "primary" })}</div>` : "";
  const availableProjects = memberProjects(state);
  const actions = `${active ? button("Stop timer", "timer", { kind: "primary" }) : ""}${button("Log manually", "manual", { disabled: !availableProjects.length || Boolean(state.pending || active) })}${button("New task", "new-task", { value: project || availableProjects[0]?.id || "", disabled: !availableProjects.length, kind: "primary" })}`;
  return header("Projects &amp; time", "Time tracking", "Review your tasks, start or pause a timer from a task row, or log time manually.", actions) +
    alert + pending + `<section class="card card-pad v2-day v2-day-summary"><div class="card-header"><div><h2>${selectedDay === today ? "Work logged today" : "Work logged on selected day"}</h2><p>${prettyDate(selectedDay)}</p></div><span class="badge ${missing ? "manual" : "saved"}">${missing ? "Hours missing" : "Daily target met"}</span></div>
      <div class="stat-number">${text(hours(daySeconds))}</div>
      <div class="progress" role="progressbar" aria-label="Daily time target" aria-valuemin="0" aria-valuemax="480" aria-valuenow="${Math.min(480, Math.floor(daySeconds / 60))}"><span style="width:${Math.min(100, daySeconds / TARGET * 100)}%"></span></div>
      <p>${missing ? `${text(hours(missing))} remaining of your 8-hour target.` : daySeconds > TARGET ? "The recorded total is above your 8-hour target." : "You reached your 8-hour target."}</p>
      ${missing && selectedDay <= today ? `<div class="v2-inline">${link("Request leave if needed", slug("leave", { day: selectedDay }))}</div>` : ""}</section>
    ${taskBoard()}
    <div class="v2-period"><div class="segmented" role="group" aria-label="Time entry display">${["day", "week"].map(mode => `<button data-action="period" data-value="${mode}" aria-pressed="${mode === period}">${mode === "day" ? "Day" : "Week"}</button>`).join("")}</div>
      <strong>${dateRange(from, to)}</strong><div class="date-controls">${button("‹", "step", { value: "-1" }).replace("<button ", '<button aria-label="Previous period" ')}${button("Today", "today")}${button("›", "step", { value: "1" }).replace("<button ", '<button aria-label="Next period" ')}</div></div>
    ${entriesTable(entriesBetween(state, from, to, [USER]), "Time entries", false, true, true)}`;
}

function entriesTable(entries, title, team, timeActions = false, collapsible = false) {
  const subtitle = `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${text(hours(total(entries)))} logged`;
  const columns = ["Date", ...(team ? ["Person"] : []), "Project / task", "Time", "Duration", "Source", ...(timeActions ? ["Log time"] : [])];
  const rows = entries.map(entry => `<tr><td>${prettyDate(entry.day)}</td>${team ? `<td>${text(PEOPLE[entry.person])}</td>` : ""}
      <td><div class="v2-task-name">${taskIcon(taskInProject(state, entry.project, entry.task))}<div>${timeActions ? `<button type="button" class="text-link v2-task-title" data-action="task-details" data-value="${text(entry.task)}">${text(taskName(state, entry.task))}</button>` : `<strong>${text(taskName(state, entry.task))}</strong>`}<small class="v2-subline">${text(projectName(state, entry.project))}</small></div></div></td>
      <td>${clock(entry.start)}–${dayKey(new Date(entry.end)) !== entry.day ? "24:00" : clock(entry.end)}</td><td class="duration">${text(hours(secondsFor(entry)))}</td><td><span class="badge ${entry.source === "Manual" ? "manual" : ""}">${text(entry.source)}</span></td>${timeActions ? `<td>${entryTimerButton(entry.project, entry.task)}</td>` : ""}</tr>`).join("");
  if (collapsible) return `<details class="card v2-entries-dropdown" open><summary><span><strong>${title}</strong><small>${subtitle}</small></span><span class="v2-dropdown-chevron" aria-hidden="true">⌄</span></summary>
    ${rows ? `<div class="table-scroll"><table><thead><tr>${columns.map(label => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">No time entries for this period.</p>'}</details>`;
  return table(title, subtitle, columns, rows);
}

function reportContext() {
  const values = params();
  const scope = values.get("scope") || (employee() ? "personal" : "team");
  const allowed = scope === "personal" ? employee() : scope === "team" && admin();
  const people = scope === "personal" ? [USER] : reportPeople(state.role);
  const roster = Object.fromEntries([["all", "All authorized team members"], ...people.map(person => [person, PEOPLE[person]])]);
  const member = values.get("member");
  const person = scope === "personal" ? USER : people.includes(member) ? member : "all";
  const historicalProjects = new Set(state.entries.filter(entry => people.includes(entry.person)).map(entry => entry.project));
  const reportProjects = state.projects.filter(item => historicalProjects.has(item.id) ||
    (!item.deleted && (scope === "team" || item.members.includes(USER))));
  const project = reportProjects.some(item => item.id === values.get("project")) ? values.get("project") : "all";
  const mode = Object.hasOwn(RANGES, values.get("range")) ? values.get("range") : "week";
  const interval = Object.hasOwn(INTERVALS, values.get("interval")) ? values.get("interval") : "week";
  const visiblePeople = person === "all" ? people : [person];
  const pinnedDates = [values.get("from"), values.get("to")].map(value => parseDate(prettyDate(value)));
  const fromTo = mode === "custom" || (pinnedDates.every(Boolean) && pinnedDates[0] <= pinnedDates[1]) ? pinnedDates :
    presetRange(mode, dayKey(), state.entries.filter(entry => visiblePeople.includes(entry.person)));
  const [from, to] = fromTo;
  const active = { scope, member: person, project, range: mode, interval, from, to };
  const entries = from && to && from <= to ? entriesBetween(state, from, to, visiblePeople, project) : [];
  return { allowed, roster, active, entries, reportProjects };
}

function reportsPage(details = false) {
  const { allowed, roster, active, entries, reportProjects } = reportContext();
  const { scope, member, project, range, interval, from, to } = active;
  if (!allowed) return restricted("This report is unavailable for the current demo role.");
  const title = scope === "personal" ? "Personal reports" : "Team reports";
  if (details) {
    const periodStart = params().get("bucket");
    const chartProject = params().get("chartProject");
    const matches = entries.filter(entry => (!periodStart || bucketRange(entry.day, interval)[0] === periodStart) &&
      (!chartProject || entry.project === chartProject));
    return header(`Reports / ${title}`, "Time entry details", dateRange(from, to), link("Back to report", slug("reports", active))) +
      `<div class="v2-filters-summary"><span class="filter-tag">${text(RANGES[range])}</span><span class="filter-tag">${project === "all" ? "All projects" : text(projectName(state, project))}</span><span class="filter-tag">${text(member === "all" ? roster.all : PEOPLE[member])}</span>
      ${periodStart && parseDate(prettyDate(periodStart)) ? `<span class="filter-tag">${prettyDate(periodStart)}</span>` : ""}
      ${chartProject && reportProjects.some(item => item.id === chartProject) ? `<span class="filter-tag">Breakdown: ${text(projectName(state, chartProject))}</span>` : ""}</div>` +
      entriesTable(matches, "Entries included in the chart", scope === "team");
  }
  const totals = new Map();
  const byProject = new Map();
  for (const entry of entries) {
    const [start, end] = bucketRange(entry.day, interval);
    const group = totals.get(start) ?? { start, end, seconds: 0 };
    group.seconds += secondsFor(entry);
    totals.set(start, group);
    byProject.set(entry.project, (byProject.get(entry.project) ?? 0) + secondsFor(entry));
  }
  const groups = [...totals.values()].sort((left, right) => left.start.localeCompare(right.start));
  const peak = Math.max(1, ...groups.map(group => group.seconds));
  const chart = groups.map(({ start, end, seconds }) => `<div class="v2-chart-row">
      <span class="v2-chart-label">${dateRange(start, end)}</span><div class="v2-track" aria-hidden="true"><span style="width:${seconds / peak * 100}%"></span></div>
      <strong>${text(hours(seconds))}</strong><a class="text-link" aria-label="View details for ${dateRange(start, end)}" href="${text(slug("report-details", { ...active, bucket: start }))}">View details</a></div>`).join("");
  const totalSeconds = total(entries);
  const projectChart = [...byProject].sort((a, b) => b[1] - a[1]).map(([id, seconds]) => {
    const name = text(projectName(state, id));
    const portion = 100 * seconds / totalSeconds;
    return `<div class="v2-chart-row"><span class="v2-chart-label">${name}</span><div class="v2-track" aria-hidden="true"><span style="width:${portion}%"></span></div>
      <strong>${text(hours(seconds))}<small class="v2-subline">${portion.toFixed(1)}%</small></strong>
      <a class="text-link" aria-label="View details for project ${name}" href="${text(slug("report-details", { ...active, chartProject: id }))}">View details</a></div>`;
  }).join("");
  const valid = Boolean(from && to && from <= to);
  const reportActions = button("Share report", "share-report", { disabled: !valid }) +
    button("Export CSV", "export-report", { kind: "primary", disabled: !entries.length });
  return header("Reports", title, scope === "team" ? "Review logged time for your authorized team." : "Review your logged hours and drill down to the original entries.", reportActions) +
    `<section class="card card-pad"><h2>Report filters</h2><form id="report-filters" class="v2-report-filters">
      ${scope === "team" ? field("Team member", `<select name="member">${options(roster, member)}</select>`) : ""}
      ${field("Project", `<select name="project">${option("all", "All projects", project)}${projectOptions(reportProjects, project)}</select>`)}
      ${field("Date range", `<select name="range" id="report-range">${options(RANGES, range)}</select>`)}
      ${field("Group chart by", `<select name="interval">${options(INTERVALS, interval)}</select>`)}
      <div class="v2-inline" id="custom-dates"${range === "custom" ? "" : " hidden"}>${dateField("From", "from", from, range !== "custom")}${dateField("To", "to", to, range !== "custom")}</div>
      <button class="button primary" type="submit">Apply filters</button><p class="form-error" role="alert" hidden></p>
    </form></section>
    <div class="v2-stats">${stat("Total logged hours", hours(total(entries)), from && to ? dateRange(from, to) : "Choose a valid date range")}${stat("Time entries", entries.length, "Included in these filters")}${stat("Projects with time", new Set(entries.map(entry => entry.project)).size, "Based on saved time entries")}</div>
    <section class="card card-pad v2-chart"><div class="card-header"><div><h2>Logged hours by ${interval}</h2><p>Each bar sums the original durations for the selected filters.</p></div>${entries.length ? link("All entry details", slug("report-details", active)) : ""}</div>
    <div class="v2-chart-body">${chart || "<p>No hours match these filters.</p>"}</div></section>
    <section class="card card-pad v2-chart"><div class="card-header"><div><h2>Hours by project</h2><p>Each project’s share of the filtered total.</p></div></div>
    <div class="v2-chart-body">${projectChart || "<p>No project hours match these filters.</p>"}</div></section>`;
}

function exportReport() {
  if (page !== "reports") return;
  const { allowed, active, entries } = reportContext();
  if (!allowed || !entries.length) return;
  const csvCell = value => {
    const string = String(value);
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(string) ? "'" + string : string;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [["Date", "Person", "Project", "Task", "Start", "End", "Duration (seconds)", "Source"], ...entries.map(entry => [
    prettyDate(entry.day), PEOPLE[entry.person], projectName(state, entry.project), taskName(state, entry.task),
    clock(entry.start), dayKey(new Date(entry.end)) === entry.day ? clock(entry.end) : "24:00", secondsFor(entry), entry.source
  ])];
  const url = URL.createObjectURL(new Blob(["\uFEFF", rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const download = document.createElement("a");
  download.href = url;
  download.download = `peopledesk-${active.scope}-${active.from}-${active.to}.csv`;
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  save("Filtered report exported.");
}

function shareReport(source) {
  if (page !== "reports") return;
  const { allowed, active } = reportContext();
  if (!allowed || !active.from || !active.to || active.from > active.to) return;
  const url = new URL(slug("reports", active), location.href).href;
  showModal("Share report", "Copy a link to this report with its current filters.", "share",
    `${field("Filtered report link", `<input id="report-share-link" type="url" readonly value="${text(url)}">`)}
     <p>Anyone opening the link needs the appropriate demo role. The link contains filters only. Demo entries remain in the browser.</p>
     <div class="v2-actions">${button("Copy link", "copy-report-link", { kind: "primary" })}<small id="share-result" role="status"></small></div>`,
    "", "primary", source);
}

async function copyReportLink() {
  const input = modal.querySelector("#report-share-link");
  const result = modal.querySelector("#share-result");
  if (!input || !result) return;
  try {
    await navigator.clipboard.writeText(input.value);
    result.textContent = "Link copied.";
  } catch {
    input.select();
    result.textContent = "Link selected. Use your copy shortcut.";
  }
}

function invoicesPage() {
  if (!admin()) return restricted("Invoice creation is available to authorized Admin / HR and Manager roles.");
  const authorized = invoiceProjects(state);
  const requested = params().get("project");
  if (requested && !authorized.some(project => project.id === requested)) return restricted("You do not have invoice access for this project.");
  const filtered = state.invoices.filter(invoice => authorized.some(project => project.id === invoice.project) && (!requested || invoice.project === requested));
  return header("Finance", "Invoices", "Create invoices from saved work on projects you can invoice.", button("Create invoice", "invoice", { value: requested, kind: "primary", disabled: !authorized.length })) +
    `<section class="card card-pad v2-invoice-scope"><div><h2>Project access</h2><p>${authorized.length ? authorized.map(item => text(item.name)).join(" · ") : "No invoicing access for this role."}</p></div>${field("Filter invoices by project", `<select id="invoice-project-filter">${option("", "All authorized projects", requested ?? "")}${projectOptions(authorized, requested)}</select>`)}</section>` +
    table("Created invoices", "Demo records cover several project billing cycles; new invoices use saved work entries.", ["Invoice", "Date", "Project", "Recipient", "Hours", "Amount", "Status", "Action"],
      filtered.map(invoice => `<tr><td><strong>${text(invoice.number)}</strong></td><td>${prettyDate(invoice.date)}</td><td>${text(projectName(state, invoice.project))}</td><td>${text(invoice.recipient)}</td><td>${text(hours(invoice.seconds))}</td><td>${invoice.amount == null ? "—" : `${text(invoice.currency ?? "USD")} ${Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</td><td><span class="badge ${invoice.status === "Paid" ? "saved" : "manual"}">${text(invoice.status ?? "Draft")}</span></td><td>${button("View invoice", "view-invoice", { value: invoice.id })}</td></tr>`).join(""));
}

function leavePage() {
  if (!employee()) return restricted("Switch to Employee to request leave.");
  const requests = state.leave.filter(item => item.person === USER);
  return header("Calendar &amp; leave", "Leave requests", "Request leave when missing work hours should be covered by an absence.", button("New leave request", "leave", { kind: "primary" })) +
    table("My requests", `${requests.length} requests · status reflects the demo approval workflow.`, ["Dates", "Type", "Notes", "Status"], requests.map(item => `<tr><td>${dateRange(item.from, item.to)}</td><td>${text(item.type)}</td><td>${text(item.notes)}</td><td><span class="badge ${item.status === "Approved" ? "saved" : item.status === "Pending" ? "manual" : ""}">${text(item.status ?? "Pending")}</span></td></tr>`).join(""),
      link("Back to time tracking", "#time"));
}

const hiring = createHiring({ state, params, slug, text, option, options, button, link, field, header, table,
  restricted, showModal, inlineError, finish, render, save, modal });
const views = { overview, projects: projectsPage, time: timePage, reports: reportsPage,
  "report-details": () => reportsPage(true), invoices: invoicesPage, leave: leavePage, ...hiring.views };
const hiringNav = new Set(["jobs", "pipeline", "hiring-workflows", "assessments", "email-templates"]);

function render({ focus = false } = {}) {
  const requested = location.hash.slice(1).split("?")[0];
  page = Object.hasOwn(views, requested) ? requested : "overview";
  roleInput.value = state.role;
  main.innerHTML = views[page]();
  document.title = `peopleDesk v2 · ${main.querySelector("h1").textContent}`;
  for (const item of document.querySelectorAll(".v2-nav a")) {
    const permission = item.dataset.permission;
    item.hidden = (permission === "log" && !employee()) || (permission === "manage" && !admin()) ||
      (permission === "hiring" && state.role !== "admin");
    const route = page === "report-details" ? "reports" : page === "candidate-portal" ? "careers" : hiringNav.has(page) ? "jobs" : page;
    const active = item.dataset.route === route &&
      (item.dataset.route !== "reports" || item.hash.includes(`scope=${params().get("scope") || (employee() ? "personal" : "team")}`));
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  if (focus) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}

function showModal(title, intro, formName, contents, submit = "Save", kind = "primary", source, extraActions = "") {
  if (!modal.open) invoker = source ?? document.activeElement;
  modal.innerHTML = `<form data-form="${formName}" class="v2-dialog" novalidate>
    <div class="dialog-header"><div><h2 id="modal-title">${title}</h2><p>${intro}</p></div>${button("×", "close").replace("<button ", '<button aria-label="Close dialog" ')}
    </div><div class="v2-dialog-body">${contents}<p class="form-error" role="alert" hidden></p></div>
    <div class="dialog-actions">${button("Cancel", "close")}${extraActions}${submit ? `<button type="submit" class="button ${kind}">${submit}</button>` : ""}</div></form>`;
  if (!modal.open) modal.showModal();
  else modal.querySelector("input:not([type=hidden]), select, textarea, .dialog-actions button")?.focus();
}

function inlineError(form, message, name) {
  const target = form.querySelector(".form-error");
  target.textContent = message;
  target.hidden = false;
  if (name) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLElement) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }
}

function selectTracker(project, task = "") {
  state.project = project;
  state.task = task;
  history.replaceState(null, "", "#time");
  save();
  render();
}

function editProject(id, source) {
  if (!admin()) return;
  const project = projectById(id);
  if (id && !project) return;
  showModal(project ? "Edit project" : "New project", "Set the project name and workspace access.", "project",
    `<input name="id" type="hidden" value="${text(id)}">
    ${field("Project name", `<input name="name" maxlength="70" value="${text(project?.name)}" required>`)}
    ${field("Description", `<textarea name="description" rows="3" maxlength="180">${text(project?.description)}</textarea>`)}
    <label class="v2-check"><input type="checkbox" name="assign"${!project || project.members.includes(USER) ? " checked" : ""}> Assign this project to Hà Linh</label>`,
    project ? "Save changes" : "Create project", "primary", source);
}

function editTask(project, source, taskId = "", parentId = "") {
  const current = taskId ? state.tasks.find(item => item.id === taskId && !item.deleted) : null;
  if (taskId && !canManageTask(current)) return;
  const selectedProject = current?.project ?? project;
  if (!projectById(selectedProject) || (employee() && !memberProjects(state).some(item => item.id === selectedProject))) return;
  const descendants = taskId ? descendantTaskIds([taskId]) : new Set();
  const parents = state.tasks.filter(task => !task.deleted && task.project === selectedProject && !descendants.has(task.id));
  const title = current ? "Edit task" : parentId ? "Create subtask" : "New task";
  showModal(title, `${text(projectName(state, selectedProject))} · Add task details, ownership and discussion notes.`, "task",
    `<input name="id" type="hidden" value="${text(taskId)}"><input name="project" type="hidden" value="${text(selectedProject)}">
     ${field("Task name", `<input name="name" maxlength="85" value="${text(current?.name)}" required>`)}
     ${field("Task type", `<select name="type">${options(Object.fromEntries(Object.entries(TYPES).map(([id, type]) => [id, `${type.symbol} ${type.name}`])), current?.type ?? "task")}</select>`)}
     ${field("Parent task", `<select name="parent">${option("", "None · top-level task", current?.parent ?? parentId)}${parents.map(task => option(task.id, task.name, current?.parent ?? parentId)).join("")}</select>`)}
     <div class="v2-form-cols">${field("Priority", `<select name="priority">${options({ Low: "Low", Medium: "Medium", High: "High" }, current?.priority ?? "Medium")}</select>`)}
       ${field("Due date", `<input name="due" type="date" value="${text(current?.due ?? "")}">`)}
       ${field("Estimate (hours)", `<input name="estimate" type="number" min="0" max="500" step="0.5" value="${text(current?.estimate ?? "")}">`)}
       ${field("Label", `<input name="label" maxlength="40" value="${text(current?.label ?? "")}">`)}</div>
     ${field("Description", `<textarea name="description" rows="4" maxlength="1200" required>${text(current ? taskDescription(current) : "")}</textarea>`)}
     ${field(current ? "Add a comment" : "First comment (optional)", '<textarea name="comment" rows="2" maxlength="600"></textarea>')}`,
    current ? "Save changes" : parentId ? "Create subtask" : "Create task", "primary", source);
}

function changeTask(id, status) {
  const task = state.tasks.find(item => item.id === id);
  if (!task || task.deleted || !projectById(task.project) || !canManageTask(task)) return;
  if (state.active?.task === id || state.pending?.task === id) {
    save("Save or discard the current time entry before changing this task.");
    return;
  }
  task.status = status;
  save(status === "open" ? "Task reopened. You can log time on it." : "Task marked complete.");
  render();
  [...main.querySelectorAll('[data-action="task-details"]')].find(item => item.dataset.value === id)?.focus();
}

function canLog(project, task) {
  return employee() && memberProjects(state).some(item => item.id === project) && taskInProject(state, project, task)?.status === "open";
}

function showEntryForm(draft = null, source, preset = null) {
  if (!employee()) return;
  const { projects, project: currentProject, task: currentTask } = trackerSelection();
  const project = draft?.project ?? preset?.project ?? currentProject;
  const task = draft?.task ?? preset?.task ?? currentTask;
  const day = draft ? dayKey(new Date(draft.start)) : selectedDay > dayKey() ? dayKey() : selectedDay;
  const endDay = draft ? dayKey(new Date(draft.end)) : day;
  showModal(draft ? "Correct time entry" : "Log time manually", "Confirm the task and the actual time you worked.", "entry",
    `<div class="v2-form-cols">
      ${field("Project", `<select name="project" id="entry-project">${projectOptions(projects, project)}</select>`)}
      ${field("Task", `<select name="task">${option("", "Select a task", task)}${taskChoices(project, task)}</select>`)}
      ${dateField("Work date", "day", day)}
      ${draft?.source === "Timer" ? dateField("End date", "endDay", endDay) : ""}
      ${field("Start time", `<input name="start" type="time" value="${draft ? clock(draft.start) : ""}" required>`)}
      ${field("End time", `<input name="end" type="time" value="${draft ? clock(draft.end) : ""}" required>`)}
    </div>`, draft ? "Check corrected time" : "Save entry", "primary", source);
}

function showReview(source) {
  if (!employee() || !state.pending) return;
  const draft = state.pending;
  const parts = splitEntry(draft);
  const warnings = aboveTarget(state, parts);
  const conflicts = conflictingEntry(state, draft);
  showModal("Review recorded time", `${text(projectName(state, draft.project))} · ${text(taskName(state, draft.task))}`, "review",
    `<p><strong>${text(hours(total(parts)))}</strong> recorded from ${prettyDate(dayKey(new Date(draft.start)))} at ${clock(draft.start)} to ${prettyDate(dayKey(new Date(draft.end)))} at ${clock(draft.end)}.</p>
    ${warnings.length ? `<div class="v2-alert"><strong>Daily total would exceed 8 hours</strong><p>${warnings.map(item => `${prettyDate(item.day)} · ${text(hours(item.seconds))} after saving`).join("<br>")}</p></div>` : ""}
    ${conflicts ? '<div class="v2-alert"><strong>This time overlaps an existing entry.</strong><p>Correct the recorded times before saving.</p></div>' : ""}
    <div class="v2-actions">${button("Correct duration", "correct")}${button("Discard entry", "discard", { kind: "danger" })}</div>`,
    conflicts ? "" : "Keep actual duration", "primary", source);
}

function approveEntry(draft) {
  const parts = splitEntry(draft);
  state.entries.push(...parts);
  state.pending = null;
  selectedDay = parts[0].day;
  if (modal.open) modal.close();
  save(`${draft.source === "Manual" ? "Manual entry" : "Time entry"} saved successfully.`);
  render();
  if (page === "time") main.querySelector(".v2-period")?.scrollIntoView({ block: "nearest" });
}

function logDraft(draft) {
  if (!canLog(draft.project, draft.task)) return;
  const parts = splitEntry(draft);
  if (aboveTarget(state, parts).length || conflictingEntry(state, draft)) {
    state.pending = draft;
    save();
    render();
    showReview();
  } else approveEntry(draft);
}

function timer(source) {
  if (!employee()) return;
  if (state.active) {
    const active = state.active;
    const pausedMs = (active.pausedMs ?? 0) + (active.pausedAt ? Date.now() - active.pausedAt : 0);
    const workedMs = Math.max(0, Date.now() - active.start - pausedMs);
    state.active = null;
    const draft = { ...active, pausedAt: null, pausedMs, end: Math.max(Date.now(), active.start + 1000), source: "Timer" };
    if (dayKey(new Date(active.start)) !== dayKey() || workedMs > TARGET * 1000) {
      state.pending = draft;
      save();
      render();
      showReview(source);
    } else logDraft(draft);
    return;
  }
  const { project, task } = trackerSelection();
  if (state.pending || !canLog(project, task)) return;
  state.active = { project, task, start: Date.now(), pausedMs: 0, pausedAt: null };
  save("Timer started.");
  render();
  main.querySelector('[data-action="timer"]')?.focus();
}

function toggleTaskTimer(project, task) {
  if (!employee() || state.pending) return;
  if (state.active) {
    if (state.active.project !== project || state.active.task !== task) return;
    if (state.active.pausedAt) {
      state.active.pausedMs = (state.active.pausedMs ?? 0) + Date.now() - state.active.pausedAt;
      state.active.pausedAt = null;
      save("Timer resumed.");
    } else {
      state.active.pausedAt = Date.now();
      save("Timer paused.");
    }
    render();
    main.querySelector(`[data-action="task-timer"][data-value="${CSS.escape(`${project}::${task}`)}"]`)?.focus();
    return;
  }
  if (!canLog(project, task)) return;
  state.project = project;
  state.task = task;
  timer();
}

function invoiceChoices(project) {
  return state.entries.filter(entry => entry.project === project)
    .sort((left, right) => right.start - left.start)
    .map(entry => `<label class="v2-check"><input type="checkbox" name="entries" value="${text(entry.id)}"> <span>${prettyDate(entry.day)} · ${text(taskName(state, entry.task))} · <strong>${text(hours(secondsFor(entry)))}</strong></span></label>`).join("");
}

function openInvoice(project, source) {
  const projects = invoiceProjects(state);
  if (!projects.length) return;
  const selected = projects.some(item => item.id === project) ? project : projects[0].id;
  showModal("Create invoice", "Choose logged work and enter the billing details.", "invoice",
    `${field("Project", `<select name="project" id="billing-project">${projectOptions(projects, selected)}</select>`)}
     <fieldset class="v2-entry-picker"><legend>Logged hours</legend><div id="invoice-entries">${invoiceChoices(selected) || "<p>No work logged for this project.</p>"}</div><p id="invoice-total" aria-live="polite">0h 00m selected</p></fieldset>
     <div class="v2-form-cols">
       ${field("Invoice number", '<input name="number" maxlength="45" required>')}
       ${dateField("Invoice date", "date", dayKey())}
       ${field("Sender", '<textarea name="sender" maxlength="300" rows="2" required></textarea>')}
       ${field("Recipient", '<textarea name="recipient" maxlength="300" rows="2" required></textarea>')}
     </div>${field("Service details", '<textarea name="service" maxlength="450" rows="3" required></textarea>')}`,
    "Review invoice", "primary", source);
}

let invoiceDraft;
function invoicePreview(invoice, existing = false) {
  showModal(existing ? `Invoice ${text(invoice.number)}` : "Review invoice", "Invoice details and selected hours.", existing ? "view" : "confirm-invoice",
    `<dl class="v2-invoice-details">
      <div><dt>Invoice number</dt><dd>${text(invoice.number)}</dd></div><div><dt>Date</dt><dd>${prettyDate(invoice.date)}</dd></div>
      <div><dt>Project</dt><dd>${text(projectName(state, invoice.project))}</dd></div><div><dt>Logged hours</dt><dd>${text(hours(invoice.seconds))}</dd></div>
      ${invoice.amount == null ? "" : `<div><dt>Total</dt><dd>${text(invoice.currency ?? "USD")} ${Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>`}
      ${invoice.status ? `<div><dt>Status</dt><dd>${text(invoice.status)}</dd></div>` : ""}
      <div><dt>Sender</dt><dd>${text(invoice.sender)}</dd></div><div><dt>Recipient</dt><dd>${text(invoice.recipient)}</dd></div>
      <div class="v2-invoice-service"><dt>Services</dt><dd>${text(invoice.service)}</dd></div></dl>`,
    existing ? "" : "Create invoice");
}

function setProjectSelection() {
  const count = main.querySelector("#project-selection");
  if (count) count.textContent = `${selectedProjects.size} selected`;
  const remove = main.querySelector('[data-action="delete-projects"]');
  if (remove) remove.disabled = !selectedProjects.size;
  const all = main.querySelector("#all-projects");
  if (all) {
    all.checked = selectedProjects.size === projectList(state).length && selectedProjects.size > 0;
    all.indeterminate = selectedProjects.size > 0 && !all.checked;
  }
}

function deleteProjects(source) {
  if (!admin() || !selectedProjects.size) return;
  const selected = projectList(state).filter(project => selectedProjects.has(project.id));
  const blocked = selected.some(project => [state.active?.project, state.pending?.project].includes(project.id));
  showModal("Delete selected projects?", blocked ? "Stop and save or discard the active entry before deleting its project." :
    "These projects and tasks will be removed from active lists. Saved hours remain in historical reports.", "delete-projects",
    `<ul class="v2-delete-list">${selected.map(project => `<li>${text(project.name)}</li>`).join("")}</ul>`,
    blocked ? "" : "Delete projects", "danger", source);
}

function descendantTaskIds(ids) {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of state.tasks) if (task.parent && result.has(task.parent) && !result.has(task.id)) {
      result.add(task.id);
      changed = true;
    }
  }
  return result;
}

function deleteTasks(source, ids = [...selectedTasks]) {
  if (!ids.length || ids.some(id => !canManageTask(state.tasks.find(task => task.id === id)))) return;
  const expanded = descendantTaskIds(ids);
  const tasks = [...expanded].map(id => state.tasks.find(task => task.id === id)).filter(task => task && !task.deleted && canManageTask(task));
  const blocked = tasks.some(task => state.active?.task === task.id || state.pending?.task === task.id);
  showModal(tasks.length === 1 ? "Delete task?" : `Delete ${tasks.length} tasks?`,
    blocked ? "Stop or save the active time entry before deleting these tasks." : "Tasks are removed from active lists. Existing time records stay in reports.",
    "delete-tasks", `${tasks.map(task => `<input type="hidden" name="ids" value="${text(task.id)}">`).join("")}<ul class="v2-delete-list">${tasks.map(task => `<li>${text(task.name)}</li>`).join("")}</ul>`,
    blocked ? "" : "Delete tasks", "danger", source);
}

function bulkTaskStatus(status) {
  const tasks = [...selectedTasks].map(id => state.tasks.find(task => task.id === id)).filter(task => task && !task.deleted && canManageTask(task));
  if (!tasks.length || !["open", "done"].includes(status)) return;
  if (tasks.some(task => state.active?.task === task.id || state.pending?.task === task.id)) {
    save("Stop or save the active time entry before changing selected tasks.");
    return;
  }
  tasks.forEach(task => { task.status = status; });
  selectedTasks.clear();
  save(`${tasks.length} task${tasks.length === 1 ? "" : "s"} ${status === "open" ? "reopened" : "completed"}.`);
  render();
}

function setTaskSelection() {
  const tasks = state.tasks.filter(task => !task.deleted && canManageTask(task) && memberProjects(state).some(project => project.id === task.project));
  const visible = tasks.filter(task => selectedTasks.has(task.id));
  const count = main.querySelector("#task-selection-count");
  if (count) count.textContent = `${visible.length} selected`;
  const complete = main.querySelector('[data-action="bulk-task-status"][data-value="done"]');
  const reopen = main.querySelector('[data-action="bulk-task-status"][data-value="open"]');
  const remove = main.querySelector('[data-action="bulk-task-delete"]');
  if (complete) complete.disabled = !visible.length || visible.every(task => task.status === "done");
  if (reopen) reopen.disabled = !visible.length || visible.every(task => task.status === "open");
  if (remove) remove.disabled = !visible.length;
  const all = main.querySelector("#all-tasks");
  if (all) {
    all.checked = tasks.length > 0 && tasks.every(task => selectedTasks.has(task.id));
    all.indeterminate = selectedTasks.size > 0 && !all.checked;
  }
}

function showLeave(source) {
  if (!employee()) return;
  const date = parseDate(prettyDate(params().get("day"))) || dayKey();
  showModal("Request leave", "Select the absence dates and leave type.", "leave", `
    ${field("Leave type", '<select name="type"><option>Annual leave</option><option>Sick leave</option><option>Unpaid leave</option></select>')}
    <div class="v2-form-cols">${dateField("From", "from", date)}${dateField("To", "to", date)}</div>
    ${field("Notes (optional)", '<textarea name="notes" rows="3" maxlength="250"></textarea>')}`, "Submit request", "primary", source);
}

const actions = {
  "new-project": (_, source) => editProject("", source),
  "edit-project": editProject,
  "delete-projects": (_, source) => deleteProjects(source),
  "new-task": editTask,
  "edit-task": (id, source) => { const task = state.tasks.find(item => item.id === id); if (task) editTask(task.project, source, id); },
  "new-subtask": (id, source) => { const task = state.tasks.find(item => item.id === id); if (task && canManageTask(task)) editTask(task.project, source, "", task.id); },
  "task-details": (id, source) => showTaskDetails(id, source),
  "log-task": (id, source) => {
    const task = state.tasks.find(item => item.id === id);
    if (employee() && task && task.status === "open") showEntryForm(null, source, { project: task.project, task: task.id });
  },
  "task-timer": value => { const [project, task] = value.split("::"); toggleTaskTimer(project, task); },
  "delete-task": (id, source) => deleteTasks(source, [id]),
  "bulk-task-status": status => bulkTaskStatus(status),
  "bulk-task-delete": (_, source) => deleteTasks(source),
  reopen: id => changeTask(id, "open"),
  complete: id => changeTask(id, "done"),
  timer: (_, source) => timer(source),
  manual: (_, source) => { if (!state.pending) showEntryForm(null, source); },
  review: (_, source) => showReview(source),
  correct: (_, source) => { if (state.pending) showEntryForm(state.pending, source); },
  discard: () => {
    if (!employee() || !state.pending) return;
    state.pending = null;
    modal.close();
    save("Unsaved time entry discarded.");
    render();
  },
  period: value => { period = value; render(); main.querySelector(`[data-action="period"][data-value="${period}"]`)?.focus(); },
  step: value => { selectedDay = addDays(selectedDay, Number(value) * (period === "day" ? 1 : 7)); render(); },
  today: () => { selectedDay = dayKey(); render(); main.querySelector('[data-action="today"]')?.focus(); },
  invoice: openInvoice,
  "export-report": exportReport,
  "share-report": (_, source) => shareReport(source),
  "copy-report-link": copyReportLink,
  "view-invoice": id => {
    const invoice = state.invoices.find(item => item.id === id);
    if (invoice && invoiceProjects(state).some(project => project.id === invoice.project)) invoicePreview(invoice, true);
  },
  leave: (_, source) => showLeave(source),
  close: () => modal.close()
};

const dialogForms = {
  project(form, data) {
    if (!admin()) return;
    const name = data.get("name").trim();
    const id = data.get("id");
    const current = projectById(id);
    if (id && !current) return inlineError(form, "This project is no longer available.");
    if (!name) return inlineError(form, "Enter a project name.", "name");
    if (projectList(state).some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
      return inlineError(form, "This project name already exists.", "name");
    }
    const assigned = data.has("assign");
    if (!assigned && [state.active?.project, state.pending?.project].includes(id)) {
      return inlineError(form, "Finish the active or pending time entry before removing project access.", "assign");
    }
    const members = (current?.members ?? []).filter(member => member !== USER);
    if (assigned) members.push(USER);
    const fields = { name, description: data.get("description").trim(), members };
    if (current) Object.assign(current, fields);
    else state.projects.push({ id: uid(), ...fields, invoiceRoles: ["admin", "manager"] });
    finish(current ? "Project changes saved." : "Project created.");
  },
  "delete-projects"() {
    if (!admin() || !selectedProjects.size) return;
    const projects = projectList(state).filter(project => selectedProjects.has(project.id));
    if (projects.some(project => [state.active?.project, state.pending?.project].includes(project.id))) return;
    for (const project of projects) project.deleted = true;
    if (selectedProjects.has(state.project)) {
      state.project = memberProjects(state)[0]?.id ?? "";
      state.task = "";
    }
    selectedProjects.clear();
    finish(`${projects.length === 1 ? "Project" : `${projects.length} projects`} deleted.`);
  },
  task(form, data) {
    const project = data.get("project");
    const name = data.get("name").trim();
    const type = data.get("type");
    const parent = data.get("parent");
    const id = data.get("id");
    const current = id ? state.tasks.find(task => task.id === id && !task.deleted) : null;
    if (!projectById(project) || (employee() && !memberProjects(state).some(item => item.id === project))) return;
    if (id && (!current || !canManageTask(current))) return;
    if (!name) return inlineError(form, "Enter a task name.", "name");
    if (!Object.hasOwn(TYPES, type)) return inlineError(form, "Select a task type.", "type");
    if (parent && (!taskInProject(state, project, parent) || parent === id)) return inlineError(form, "Select a parent task in this project.", "parent");
    if (current && (state.active?.task === id || state.pending?.task === id)) return inlineError(form, "Stop or save the active time entry before editing this task.");
    const fields = { project, name, type, parent, priority: data.get("priority"), due: data.get("due") || "",
      estimate: Number(data.get("estimate")) || 0, label: data.get("label").trim(), description: data.get("description").trim() };
    if (!fields.description) return inlineError(form, "Add a short task description.", "description");
    const comment = data.get("comment").trim();
    if (current) {
      Object.assign(current, fields);
      if (comment) (current.comments ??= []).push({ id: uid(), author: PEOPLE[USER], date: dayKey(), body: comment });
    } else {
      const task = { id: uid(), ...fields, owner: USER, createdBy: USER, status: "open", comments: comment ? [{ id: uid(), author: PEOPLE[USER], date: dayKey(), body: comment }] : [] };
      state.tasks.push(task);
      if (page === "time" && !state.active) {
        state.project = project;
        state.task = task.id;
        history.replaceState(null, "", "#time");
      }
    }
    finish(current ? "Task changes saved." : parent ? "Subtask created." : "Task created.");
  },
  "delete-tasks"(form, data) {
    const ids = new Set(data.getAll("ids"));
    const tasks = [...ids].map(id => state.tasks.find(task => task.id === id)).filter(task => task && !task.deleted && canManageTask(task));
    if (!tasks.length || tasks.some(task => state.active?.task === task.id || state.pending?.task === task.id)) return;
    tasks.forEach(task => { task.deleted = true; task.deletedAt = dayKey(); });
    state.tasks.forEach(task => { if (!task.deleted && ids.has(task.parent)) task.parent = ""; });
    selectedTasks.clear();
    finish(`${tasks.length} task${tasks.length === 1 ? "" : "s"} deleted from active lists.`);
  },
  entry(form, data) {
    if (!employee()) return;
    const project = data.get("project");
    const task = data.get("task");
    const day = parseDate(data.get("day"));
    const endDay = data.has("endDay") ? parseDate(data.get("endDay")) : day;
    if (!project) return inlineError(form, "Select a project.", "project");
    if (!canLog(project, task)) return inlineError(form, "Select an open task in the selected project. Reopen completed tasks from Projects & tasks.", "task");
    if (!day || day > dayKey()) return inlineError(form, "Enter a valid work date on or before today in dd/mm/yyyy.", "day");
    if (!endDay || endDay > dayKey()) return inlineError(form, "Enter a valid end date on or before today.", "endDay");
    const startTime = data.get("start");
    const endTime = data.get("end");
    if (!startTime) return inlineError(form, "Enter the start time.", "start");
    if (!endTime) return inlineError(form, "Enter the end time.", "end");
    const start = +at(day, startTime);
    const end = +at(endDay, endTime);
    if (end <= start) return inlineError(form, "End time must be after start time.", "end");
    if (end > Date.now()) return inlineError(form, "Enter an end time on or before the current time.", "end");
    const source = state.pending?.source ?? "Manual";
    const draft = { start, end, project, task, source };
    if (conflictingEntry(state, draft)) return inlineError(form, "This time overlaps one of your saved entries. Enter a different time range.", "start");
    logDraft(draft);
  },
  review(form) {
    const draft = state.pending;
    if (!draft || !canLog(draft.project, draft.task)) return inlineError(form, "This task is no longer available to log time.");
    if (conflictingEntry(state, draft)) return inlineError(form, "This entry overlaps saved work. Correct the duration first.");
    approveEntry(draft);
  },
  invoice(form, data) {
    const project = data.get("project");
    if (!invoiceProjects(state).some(item => item.id === project)) return inlineError(form, "You do not have invoice access for this project.", "project");
    const chosen = new Set(data.getAll("entries"));
    const entries = state.entries.filter(entry => entry.project === project && chosen.has(entry.id));
    if (!entries.length) return inlineError(form, "Choose at least one time entry.");
    const number = data.get("number").trim();
    if (!number) return inlineError(form, "Enter an invoice number.", "number");
    if (state.invoices.some(invoice => invoice.number.toLowerCase() === number.toLowerCase())) return inlineError(form, "This invoice number already exists.", "number");
    const date = parseDate(data.get("date"));
    if (!date) return inlineError(form, "Enter the invoice date in dd/mm/yyyy.", "date");
    const sender = data.get("sender").trim();
    const recipient = data.get("recipient").trim();
    const service = data.get("service").trim();
    if (!sender) return inlineError(form, "Enter the sender.", "sender");
    if (!recipient) return inlineError(form, "Enter the recipient.", "recipient");
    if (!service) return inlineError(form, "Enter the service details.", "service");
    invoiceDraft = { id: uid(), project, number, date, sender, recipient, service, entries: entries.map(entry => entry.id), seconds: total(entries) };
    invoicePreview(invoiceDraft);
  },
  "confirm-invoice"(form) {
    const draft = invoiceDraft;
    if (!draft || !invoiceProjects(state).some(item => item.id === draft.project)) return inlineError(form, "You no longer have invoice access for this project.");
    if (state.invoices.some(invoice => invoice.number.toLowerCase() === draft.number.toLowerCase())) return inlineError(form, "This invoice number already exists.");
    state.invoices.unshift(draft);
    if (params().get("project") && params().get("project") !== draft.project) {
      history.replaceState(null, "", slug("invoices", { project: draft.project }));
    }
    finish(`Invoice ${draft.number} created.`);
  },
  leave(form, data) {
    if (!employee()) return;
    const from = parseDate(data.get("from"));
    const to = parseDate(data.get("to"));
    if (!from) return inlineError(form, "Enter a valid leave start date.", "from");
    if (!to || to < from) return inlineError(form, "The end date must be on or after the start date.", "to");
    state.leave.unshift({ id: uid(), from, to, type: data.get("type"), notes: data.get("notes").trim() });
    finish("Leave request submitted.");
  }
};

function finish(message) {
  modal.close();
  save(message);
  render();
  main.querySelector("h1")?.scrollIntoView({ block: "nearest" });
}

document.addEventListener("click", event => {
  const openMenu = event.target.closest(".v2-floating-menu");
  if (openMenu) openMenu.closest("details")?.removeAttribute("open");
  main.querySelectorAll(".v2-floating-actions[open]").forEach(menu => {
    if (!menu.contains(event.target)) menu.removeAttribute("open");
  });
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const { action, value } = control.dataset;
  if (action.startsWith("h-")) hiring.action(action, value);
  else actions[action]?.(value, control);
});
main.addEventListener("toggle", event => {
  const details = event.target;
  if (!(details instanceof HTMLDetailsElement) || !details.matches(".v2-floating-actions") || !details.open) return;
  main.querySelectorAll(".v2-floating-actions[open]").forEach(menu => { if (menu !== details) menu.removeAttribute("open"); });
  requestAnimationFrame(() => {
    if (!details.isConnected || !details.open) return;
    const trigger = details.querySelector("summary");
    const menu = details.querySelector(".v2-floating-menu");
    if (!trigger || !menu) return;
    const anchor = trigger.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(10, Math.min(anchor.right - width, innerWidth - width - 10));
    const top = anchor.bottom + height + 10 <= innerHeight ? anchor.bottom + 7 : Math.max(10, anchor.top - height - 7);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  });
}, true);
modal.addEventListener("click", event => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) modal.close();
});
modal.addEventListener("close", () => {
  invoiceDraft = null;
  if (invoker?.isConnected) invoker.focus({ preventScroll: true });
  else main.focus({ preventScroll: true });
  invoker = null;
});
modal.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  form.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute("aria-invalid"));
  if (form.dataset.form.startsWith("h-")) hiring.modalSubmit(form, new FormData(form));
  else dialogForms[form.dataset.form]?.(form, new FormData(form));
});
modal.addEventListener("input", event => hiring.draftInput(event.target.form));
modal.addEventListener("change", event => {
  const field = event.target;
  hiring.modalChange(field);
  if (field.id === "entry-project") {
    field.form.elements.task.innerHTML = option("", "Select a task", "") + taskChoices(field.value, "");
  }
  if (field.id === "billing-project") {
    modal.querySelector("#invoice-entries").innerHTML = invoiceChoices(field.value) || "<p>No work logged for this project.</p>";
  }
  if (field.id === "billing-project" || field.name === "entries") {
    const selected = new Set(new FormData(field.form).getAll("entries"));
    modal.querySelector("#invoice-total").textContent = `${hours(total(state.entries.filter(entry => selected.has(entry.id))))} selected`;
  }
});
main.addEventListener("change", event => {
  const field = event.target;
  if (field.id === "all-tasks") {
    const available = state.tasks.filter(task => !task.deleted && canManageTask(task) && memberProjects(state).some(project => project.id === task.project));
    selectedTasks = new Set(field.checked ? available.map(task => task.id) : []);
    main.querySelectorAll("[data-task-check]").forEach(box => { box.checked = field.checked; });
    setTaskSelection();
    return;
  }
  if (field.dataset.taskCheck) {
    if (field.checked) selectedTasks.add(field.dataset.taskCheck);
    else selectedTasks.delete(field.dataset.taskCheck);
    setTaskSelection();
    return;
  }
  if (field.id === "track-project" && !state.active) {
    selectTracker(field.value);
    main.querySelector("#track-project")?.focus();
  }
  if (field.id === "track-task" && !state.active) {
    selectTracker(main.querySelector("#track-project").value, field.value);
    main.querySelector("#track-task")?.focus();
  }
  if (field.id === "all-projects" && admin()) {
    selectedProjects = new Set(field.checked ? projectList(state).map(project => project.id) : []);
    main.querySelectorAll("[data-project-check]").forEach(box => { box.checked = field.checked; });
    setProjectSelection();
  }
  if (field.dataset.projectCheck && admin()) {
    if (field.checked) selectedProjects.add(field.dataset.projectCheck);
    else selectedProjects.delete(field.dataset.projectCheck);
    setProjectSelection();
  }
  if (field.id === "report-range") {
    const custom = field.value === "custom";
    const box = main.querySelector("#custom-dates");
    box.hidden = !custom;
    box.querySelectorAll("input").forEach(input => { input.readOnly = !custom; });
  }
  if (field.id === "invoice-project-filter") {
    location.hash = field.value ? slug("invoices", { project: field.value }) : "#invoices";
  }
});
main.addEventListener("submit", event => {
  const form = event.target;
  if (form.dataset.hiringMain) {
    event.preventDefault();
    hiring.mainSubmit(form, new FormData(form));
    return;
  }
  if (form.id !== "report-filters") return;
  event.preventDefault();
  const { active } = reportContext();
  const values = new FormData(form);
  const range = values.get("range");
  const from = range === "custom" ? parseDate(values.get("from")) : "";
  const to = range === "custom" ? parseDate(values.get("to")) : "";
  if (range === "custom" && (!from || !to || from > to)) {
    inlineError(form, "Enter a valid date range in dd/mm/yyyy.", !from ? "from" : "to");
    return;
  }
  history.replaceState(null, "", slug("reports", {
    scope: active.scope, member: values.get("member") ?? USER, project: values.get("project"),
    range, interval: values.get("interval"), ...(range === "custom" ? { from, to } : {})
  }));
  render();
  main.querySelector('[form="report-filters"], #report-filters button')?.focus();
});

roleInput.addEventListener("change", () => {
  state.role = roleInput.value;
  selectedProjects.clear();
  selectedTasks.clear();
  if (modal.open) modal.close();
  if ((["time", "leave"].includes(page) && !employee()) || (page === "invoices" && employee())) {
    history.replaceState(null, "", "#overview");
  } else if (["reports", "report-details"].includes(page)) {
    history.replaceState(null, "", slug("reports", { scope: employee() ? "personal" : "team" }));
  }
  save();
  render();
});
window.addEventListener("hashchange", () => {
  if (modal.open) modal.close();
  render({ focus: true });
});
document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});
window.addEventListener("storage", event => {
  if (event.key !== STORAGE_KEY) return;
  Object.assign(state, load());
  selectedProjects.clear();
  if (modal.open) modal.close();
  render();
});
setInterval(() => {
  const counter = document.querySelector("#elapsed");
  if (counter && state.active) counter.textContent = elapsed(Math.max(0, Date.now() - state.active.start - (state.active.pausedMs ?? 0) - (state.active.pausedAt ? Date.now() - state.active.pausedAt : 0)) / 1000);
  hiring.tick();
}, 250);

render();
