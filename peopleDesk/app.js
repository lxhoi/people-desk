"use strict";

const icons = {
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>',
  chart: '<path d="M4 19h16M7 15v-4m5 4V6m5 9V9"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M8 4v4m8-4v4"/>',
  play: '<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>'
};

const people = { linh: "Hà Linh", tu: "Mai Tú", ha: "Võ Hà", an: "An Nguyễn" };
const projects = { atlas: "Atlas", peopleDesk: "peopleDesk" };
const currentUser = "linh";
const demoRoles = {
  employee: "Normal user · Employee",
  manager: "Normal user · Manager",
  recruiter: "Normal user · HR Recruiter",
  admin: "Full Access · Admin"
};
const rolePermissions = {
  employee: {}, manager: { teamReports: true }, recruiter: { hiring: true },
  admin: { teamReports: true, hiring: true, hiringSetup: true, administration: true, invoices: ["atlas"] }
};
const sampleInvoices = [
  { number: "INV-1042", project: "atlas", amount: 2400, status: "Paid" },
  { number: "INV-1043", project: "peopleDesk", amount: 1800, status: "Open" }
];
const storageKey = "peopledesk-prototype-v1";
const main = document.querySelector("#main");
const dialog = document.querySelector("#manual-dialog");
const form = document.querySelector("#manual-form");
const error = document.querySelector("#manual-error");
const toast = document.querySelector("#notification");

const clockFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

function icon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function dateKey(value = new Date()) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function dateAt(day, time = "00:00") {
  return new Date(`${day}T${time}`);
}

function addDays(day, amount) {
  const date = dateAt(day);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function weekStart(day) {
  return addDays(day, -((dateAt(day).getDay() + 6) % 7));
}

function weekEnd(day) {
  return addDays(weekStart(day), 6);
}

function dateRange(start, end) {
  return start === end ? displayDate(start) : `${displayDate(start)} – ${displayDate(end)}`;
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(+dateAt(value)) && dateKey(dateAt(value)) === value;
}

function displayDate(value) {
  const date = typeof value === "string" ? value : dateKey(new Date(value));
  return isDate(date) ? date.split("-").reverse().join("/") : date;
}

function parseDisplayDate(value) {
  const displayed = value.trim();
  return /^\d{2}\/\d{2}\/\d{4}$/.test(displayed) ? displayed.split("/").reverse().join("-") : "";
}

function secondsFor(entry) {
  return (entry.end - entry.start) / 1000;
}

function totalSeconds(entries) {
  return entries.reduce((total, entry) => total + secondsFor(entry), 0);
}

function hours(seconds) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

function elapsed(seconds) {
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(pad).join(":");
}

function sampleEntries(today) {
  const week = weekStart(today);
  const offset = (dateAt(today).getDay() + 6) % 7;
  const samples = [
    [today, "linh", "atlas", "09:00", "11:30"],
    [today, "linh", "peopleDesk", "13:30", "15:00"],
    [today, "tu", "atlas", "09:00", "12:00"],
    [today, "ha", "peopleDesk", "09:15", "11:45"],
    [today, "an", "atlas", "08:45", "11:00"],
    [addDays(today, -1), "linh", "atlas", "10:00", "11:30", "Forgot to start the timer during project work."],
    [addDays(week, -4), "linh", "peopleDesk", "09:00", "12:30"]
  ];
  for (let index = 0; index < Math.min(offset, 5); index++) {
    const day = addDays(week, index);
    samples.push([day, "linh", index % 2 ? "peopleDesk" : "atlas", "08:45", ["14:00", "15:15", "12:30", "14:30", "13:15"][index]]);
    samples.push([day, index % 2 ? "tu" : "an", "atlas", "09:00", "13:00"]);
  }
  return samples.map(([day, person, project, start, end, reason], index) => ({
    id: `sample-${index}`, date: day, person, project, start: +dateAt(day, start), end: +dateAt(day, end),
    type: reason ? "manual" : "timer", reason: reason || ""
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.entries)) return saved;
  } catch {
    // Continue with sample data when storage is unavailable or invalid.
  }
  return { entries: sampleEntries(dateKey()), active: null, project: "" };
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const state = loadState();
const roleSelect = document.querySelector("#demo-role");
roleSelect.innerHTML = options(demoRoles, Object.hasOwn(demoRoles, state.role) ? state.role : "admin");
const roundingOptions = { none: "No rounding", nearest15: "Nearest 15 minutes" };
const reportIncrement = 15 * 60;
let selectedDay = dateKey();
let timeMode = "week";
let lastSaved = null;
let noticeTimeout;
let formInvoker;
const defaultReport = { scope: "", person: currentUser, project: "all", from: weekStart(dateKey()), to: weekEnd(dateKey()), rounding: "none" };
let report = { ...defaultReport };
let currentRoute = "overview";
let routeLoadTimer;
persist();

function options(choices, current) {
  const entries = Array.isArray(choices) ? choices : Object.entries(choices);
  return entries.map(([value, label]) =>
    `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function demoAccess(permission) {
  return rolePermissions[roleSelect.value][permission];
}

function accessRestricted(message) {
  return pageHeader("Access restricted", message) + '<a class="button secondary" href="#overview">Back to Overview</a>';
}

function visibleEntries({ from, to, person = "all", project = "all" }) {
  return state.entries.filter(entry => entry.date >= from && entry.date <= to &&
    (person === "all" || entry.person === person) && (project === "all" || entry.project === project))
    .sort((left, right) => right.start - left.start);
}

function pageHeader(title, subtitle, action = "") {
  return `<div class="page-header"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}

function timerCard() {
  const project = state.active?.project ?? state.project;
  const canStart = Object.hasOwn(projects, project);
  const status = state.active ? "Timer running" : canStart ? "Ready to start" : "Select a project";
  return `<section class="card timer-card" aria-labelledby="timer-title">
    <div class="card-header">
      <div><h2 id="timer-title">Time tracker</h2><p>Log work against a project.</p></div>
      <span class="timer-status ${state.active ? "running" : ""}"><span class="timer-dot"></span>${status}</span>
    </div>
    <div class="timer-display" id="elapsed" aria-label="Elapsed time">00:00:00</div>
    <label class="timer-field">Project <select id="timer-project" ${state.active ? "disabled" : ""}><option value="">Select a project</option>${options(projects, project)}</select></label>
    <div class="timer-actions">
      <button class="button primary" data-action="timer" ${!state.active && !canStart ? "disabled" : ""}>${icon(state.active ? "stop" : "play")} ${state.active ? "Stop timer" : "Start timer"}</button>
      <button class="button secondary" data-action="manual">${icon("plus")} Manual Entry</button>
    </div>
    <p class="timer-note">${state.active ? "The timer keeps running while you browse peopleDesk." : "Forgot to start the timer? Add a manual entry."}</p>
  </section>`;
}

function entryTable(entries, { title, subtitle = "", action = "", showPerson = false, showReason = false, duration = hours, rounding = "none", empty = "No time entries for this period.", id = "entry-list" }) {
  const heading = `<div class="table-header"><div><h2 id="${id}-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</div>`;
  if (!entries.length) return `<section class="card table-card" aria-labelledby="${id}-title">${heading}<p class="empty">${empty}</p></section>`;
  const rows = entries.map(entry => `<tr ${entry.id === lastSaved ? 'class="row-saved" tabindex="-1"' : ""}>
    <td>${displayDate(entry.date)}</td>
    ${showPerson ? `<td>${people[entry.person]}</td>` : ""}
    <td class="row-project">${projects[entry.project]}</td>
    <td>${clockFormat.format(entry.start)} – ${clockFormat.format(entry.end)}${dateKey(new Date(entry.end)) !== entry.date ? ` (${displayDate(entry.end)})` : ""}</td>
    <td class="duration">${duration(secondsFor(entry))}</td>
    ${rounding === "none" ? "" : `<td class="duration">${duration(reportEntrySeconds(entry, rounding))}</td>`}
    <td><span class="badge ${entry.type === "manual" ? "manual" : ""}">${entry.type === "manual" ? "Manual Entry" : "Timer"}</span>
    ${entry.id === lastSaved ? '<span class="badge saved">Just saved</span>' : ""}</td>
    ${showReason ? `<td class="reason">${entry.reason ? escapeHtml(entry.reason) : "–"}</td>` : ""}
  </tr>`).join("");
  return `<section class="card table-card" aria-labelledby="${id}-title">${heading}
    <div class="table-scroll" tabindex="0" role="region" aria-label="${title} table">
      <table><thead><tr><th scope="col">Date</th>${showPerson ? '<th scope="col">Person</th>' : ""}<th scope="col">Project</th><th scope="col">Time</th><th scope="col">${rounding === "none" ? "Duration" : "Original duration"}</th>${rounding === "none" ? "" : '<th scope="col">Rounded duration</th>'}<th scope="col">Source</th>${showReason ? '<th scope="col">Reason</th>' : ""}</tr></thead>
      <tbody>${rows}</tbody></table>
    </div></section>`;
}

function overviewIcon(name) {
  return `<span class="tile-icon"><img src="assets/Icon${name}.svg" alt=""></span>`;
}

function overviewWidget(title, symbol, content, className = "") {
  return `<section class="card overview-widget ${className}" aria-label="${title}">
    <div class="card-header"><h2>${title}</h2>${overviewIcon(symbol)}</div>
    ${content}
  </section>`;
}

function overviewTasks(today) {
  const tasks = [
    ["Review new employee records", "Hà Linh", -3, -1, "Overdue", "overdue"],
    ["Review weekly timesheets", "Mai Tú", -2, 0, "In progress", "active"],
    ["Update Atlas project roster", "Hà Linh", -1, 0, "To do", ""],
    ["Confirm onboarding checklist", "Võ Hà", -1, 0, "To do", ""]
  ];
  const rows = tasks.map(([title, reporter, start, due, status, type]) => `<tr class="${type}">
    <td class="row-project">${title === "Review weekly timesheets" ? `<a class="text-link" href="#reports">${title}</a>` : title}</td>
    <td>${reporter}</td><td>${displayDate(addDays(today, start))}</td><td>${displayDate(addDays(today, due))}</td>
    <td><span class="badge ${type}">${status}</span></td>
  </tr>`).join("");
  return `<section class="card table-card overview-tasks" id="overview-tasks" tabindex="-1" aria-labelledby="overview-tasks-title">
    <div class="table-header"><h2 id="overview-tasks-title">Due today &amp; overdue</h2><div class="chip-group"><span class="badge">3 due today</span><span class="badge overdue">1 overdue</span></div></div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Tasks table">
      <table><thead><tr><th scope="col">Task</th><th scope="col">Reporter</th><th scope="col">Start date</th><th scope="col">Due date</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </section>`;
}

function overviewPerson(initials, name, subtitle, status = "") {
  return `<div class="workspace-person"><span class="avatar">${initials}</span><div><strong>${name}</strong><small class="${status}">${subtitle}</small></div></div>`;
}

function overview() {
  const today = dateKey();
  const logged = totalSeconds(visibleEntries({ from: today, to: today, person: currentUser }));
  const target = 8 * 3600;
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(dateAt(today));
  const annualBalance = leaveBalance("annual", currentUser);
  const leave = overviewWidget("Leave balance", "Calendar", `
    <div class="widget-value"><strong>${annualBalance}</strong><span>days remaining</span></div>
    <p class="widget-note">${(12 - annualBalance).toFixed(1)} of 12 days used · ${dateAt(today).getFullYear()}</p>
    <div class="progress" role="progressbar" aria-label="Annual leave used" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${(12 - annualBalance).toFixed(1)}"><span style="width:${(12 - annualBalance) / 12 * 100}%"></span></div>
    <a class="text-link" href="#leave">Open leave requests</a>
  `);
  const attendance = overviewWidget("Attendance status", "Clock", `
    <div class="widget-value"><strong>8:56 AM</strong></div>
    <div class="widget-note"><span class="badge saved">Clocked in</span><span>Not clocked out</span></div>
  `);
  const work = overviewWidget("Work logged today", "Clock", `
    <div class="widget-value"><strong>${hours(logged)}</strong><span>of 8h target</span><span class="badge ${logged >= target ? "saved" : "warning"}">${logged >= target ? "Target reached" : `${hours(target - logged)} remaining`}</span></div>
    <div class="progress" role="progressbar" aria-label="Daily hours target" aria-valuemin="0" aria-valuemax="480" aria-valuenow="${Math.min(480, Math.round(logged / 60))}"><span style="width:${Math.min(100, logged / target * 100)}%"></span></div>
    <a class="text-link" href="#time">Open time tracking</a>
    ${state.active ? '<p class="widget-note"><span class="badge saved">Timer running</span></p>' : ""}
  `);
  const team = overviewWidget("Team members", "Team", `
    <p class="widget-note">Atlas project · 12 members</p>
    <div class="chip-group"><span class="badge saved">8 Available</span><span class="badge warning">2 Away</span><span class="badge">2 Off</span></div>
    <div class="workspace-person-list team">
      ${overviewPerson("HL", people.linh, "Available", "availability")}
      ${overviewPerson("MT", people.tu, "Available", "availability")}
      ${overviewPerson("VH", people.ha, "Away", "away")}
      ${overviewPerson("AN", people.an, "Off")}
    </div>
    <p class="widget-foot">Showing 4 of 12</p>
  `);
  const joiners = overviewWidget("New joiners", "Spark", `
    <p class="widget-note">2 people start this week</p>
    <div class="workspace-person-list">
      ${overviewPerson("MP", "Minh Phương", "Product · Starts today")}
      ${overviewPerson("TN", "Tuấn Nam", `Engineering · Starts ${displayDate(addDays(today, 2))}`)}
    </div>
  `, "new-joiners");
  const celebrations = overviewWidget("Celebrations", "Gift", `
    <p class="widget-note">Coming up in ${month}</p>
    <div class="workspace-person-list">
      <div class="workspace-person"><span class="workspace-event-date">${displayDate(`${today.slice(0, 7)}-21`)}</span><div><strong>Birthday · Võ Hà</strong><small>Operations</small></div></div>
      <div class="workspace-person"><span class="workspace-event-date">${displayDate(`${today.slice(0, 7)}-25`)}</span><div><strong>2-year anniversary · Mai Tú</strong><small>Product</small></div></div>
    </div>
  `, "celebrations");
  return `<div class="overview-page">
    ${pageHeader("Overview", displayDate(today), `<div class="fields-inline overview-actions">
      <a class="button secondary" href="#reports">Open Reports</a>
      <button type="button" class="button primary" data-action="view-tasks">View tasks</button>
    </div>`)}
    <div class="overview-top">${leave}${attendance}${work}</div>
    <div class="overview-content"><div class="overview-stack">${overviewTasks(today)}${team}</div><div class="overview-stack">${joiners}${celebrations}</div></div>
  </div>`;
}

function timeEntriesPanel(from, to, loading) {
  const status = (role, content) => `<section class="card card-pad" aria-labelledby="entry-list-title">
    <h2 id="entry-list-title">Time entries</h2><div class="page-state" role="${role}">${content}</div>
  </section>`;
  if (loading) return status("status", '<span class="loading-spinner" aria-hidden="true"></span>Loading time entries…');
  try {
    const entries = visibleEntries({ from, to, person: currentUser })
      .sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0));
    return entryTable(entries, { title: "Time entries", subtitle: `${hours(totalSeconds(entries))} logged`, showReason: true });
  } catch (error) {
    console.error("Unable to load time entries.", error);
    return status("alert", '<p>Time entries could not be loaded.</p><button class="button secondary" type="button" data-action="retry-page">Retry</button>');
  }
}

function tracking(loading = false) {
  const today = dateKey();
  const from = timeMode === "day" ? selectedDay : weekStart(selectedDay);
  const to = timeMode === "day" ? selectedDay : weekEnd(selectedDay);
  let todayTotal = null;
  try {
    todayTotal = totalSeconds(visibleEntries({ from: today, to: today, person: currentUser }));
  } catch {
    // Keep the tracker available when entry data is unavailable.
  }
  const goal = 8 * 3600;
  return pageHeader("Daily &amp; Weekly Time Tracking", "Log your own time and review your entries by day or week.") +
    `<div class="time-grid">${timerCard()}
      <section class="card card-pad" aria-labelledby="today-title">
        <div class="card-header stat-heading"><div><h2 id="today-title">Work logged today</h2><p>${displayDate(today)}</p></div><span class="tile-icon">${icon("clock")}</span></div>
        ${Number.isFinite(todayTotal) ? `<div class="stat-number">${hours(todayTotal)}</div>
        <div class="progress" role="progressbar" aria-label="Daily target" aria-valuemin="0" aria-valuemax="480" aria-valuenow="${Math.min(480, Math.round(todayTotal / 60))}"><span style="width:${Math.min(100, todayTotal / goal * 100)}%"></span></div>
        <p>${todayTotal >= goal ? "8h target reached" : `${hours(goal - todayTotal)} remaining of your 8h target`}</p>` : '<p>Today’s total is unavailable.</p>'}
      </section></div>
    <section class="card card-pad section-space" aria-label="Time entry period"><div class="card-header">
      <div class="segmented" aria-label="Period view">
        <button data-action="time-mode" data-mode="day" aria-pressed="${timeMode === "day"}">Day</button>
        <button data-action="time-mode" data-mode="week" aria-pressed="${timeMode === "week"}">Week</button>
      </div>
      <div class="date-controls">
        <button class="icon-button" data-action="step-date" data-step="-1" aria-label="Previous ${timeMode}">${icon("left")}</button>
        <button class="icon-button" data-action="step-date" data-step="1" aria-label="Next ${timeMode}">${icon("right")}</button>
        <button class="button secondary" data-action="today">Today</button>
      </div></div><p class="timer-note">${dateRange(from, to)}</p>
    </section>
    <div class="section-space">${timeEntriesPanel(from, to, loading)}</div>`;
}

function reportUrl(snapshot, route = "reports") {
  return `#${route}?${new URLSearchParams(snapshot)}`;
}

function teamReportPeople() {
  const team = permissionDirectory[currentUser].team;
  return Object.fromEntries(Object.entries(people).filter(([id]) => permissionDirectory[id].team === team));
}

function reportFilters(query, defaults, defaultScope) {
  const requestedScope = query.get("scope");
  const scope = ["personal", "team"].includes(requestedScope) ? requestedScope : defaultScope;
  const fallbackPerson = defaults.scope === "team" ? defaults.person : "all";
  const person = query.get("person") ?? fallbackPerson;
  const project = query.get("project") ?? defaults.project;
  const rounding = query.get("rounding") ?? defaults.rounding;
  return {
    scope, person: scope === "personal" ? currentUser : Object.hasOwn(teamReportPeople(), person) ? person : "all",
    project: Object.hasOwn(projects, project) ? project : "all",
    rounding: Object.hasOwn(roundingOptions, rounding) ? rounding : "none",
    from: query.get("from") ?? defaults.from, to: query.get("to") ?? defaults.to
  };
}

function reportScopeUrl(scope) {
  const person = scope === "personal" ? currentUser : report.scope === "team" ? report.person : "all";
  return reportUrl({ ...report, scope, person });
}

function reportDetailsUrl(project = report.project) {
  return reportUrl({ ...report, project, summaryProject: report.project }, "report-details");
}

function validReportRange({ from, to }) {
  return isDate(from) && isDate(to) && from <= to;
}

function reportEntries(snapshot) {
  const allowed = snapshot.scope === "team" ? teamReportPeople() : { [currentUser]: people[currentUser] };
  return visibleEntries(snapshot).filter(entry => Object.hasOwn(allowed, entry.person));
}

function reportEntrySeconds(entry, rounding) {
  const seconds = secondsFor(entry);
  return rounding === "nearest15" ? Math.round(seconds / reportIncrement) * reportIncrement : seconds;
}

function reportTotal(entries, rounding) {
  return reportDuration(entries.reduce((total, entry) => total + reportEntrySeconds(entry, rounding), 0));
}

function reportDuration(seconds) {
  return elapsed(Math.floor(seconds));
}

function roundingDescription(rounding) {
  return rounding === "nearest15"
    ? "Each entry is rounded to the nearest 15 minutes before summing. Original durations are retained."
    : "No rounding. Total uses original entry durations and is displayed in hours, minutes and seconds.";
}

function summary() {
  if (report.scope === "team" && !demoAccess("teamReports")) return accessRestricted("Team Reports require access to team time entries.");
  const scopes = demoAccess("teamReports") ? ["personal", "team"] : ["personal"];
  const reportChoices = `<div class="segmented" role="group" aria-label="Report type">
    ${scopes.map(scope => `<a href="${escapeHtml(reportScopeUrl(scope))}" ${report.scope === scope ? 'aria-current="page"' : ""}>${scope === "personal" ? "Personal Reports" : "Team Reports"}</a>`).join("")}
  </div>`;
  if (!report.scope) {
    return pageHeader("Reports", "Choose a time report.") +
      `<section class="card card-pad report-filters" aria-label="Choose a report">${reportChoices}</section>`;
  }
  const valid = validReportRange(report);
  const entries = valid ? reportEntries(report) : [];
  const total = reportTotal(entries, report.rounding);
  const dateHint = valid ? "report-date-format" : "report-date-format report-error";
  const invalid = !valid ? 'aria-invalid="true"' : "";
  const projectRows = Object.entries(projects).map(([project, label]) => {
    const matching = entries.filter(entry => entry.project === project);
    if (!matching.length) return "";
    return `<tr><td class="row-project">${label}</td><td>${matching.length}</td><td><a class="text-link duration" href="${escapeHtml(reportDetailsUrl(project))}" aria-label="View ${label} time entries">${reportTotal(matching, report.rounding)}</a></td></tr>`;
  }).join("");
  return pageHeader(report.scope === "personal" ? "Personal Reports" : "Team Reports", report.scope === "personal" ? "Review your logged time by date and project." : "Review logged time for your authorized team.") +
    `<section class="card card-pad report-filters" aria-label="Report filters">
      ${reportChoices}
      <form id="report-filters-form" novalidate>
        <div class="fields-inline">
          <label class="field">Person <select name="person" ${report.scope === "personal" ? "disabled" : ""}>${options(report.scope === "personal" ? { [currentUser]: people[currentUser] } : { all: "All team members", ...teamReportPeople() }, report.person)}</select></label>
          <label class="field">From <input type="text" name="from" placeholder="dd/mm/yyyy" maxlength="10" value="${escapeHtml(displayDate(report.from))}" aria-describedby="${dateHint}" ${invalid}></label>
          <label class="field">To <input type="text" name="to" placeholder="dd/mm/yyyy" maxlength="10" value="${escapeHtml(displayDate(report.to))}" aria-describedby="${dateHint}" ${invalid}></label>
          <label class="field">Project <select name="project">${options({ all: "All projects", ...projects }, report.project)}</select></label>
          <button class="button secondary" type="submit">Apply filters</button>
        </div>
        <p class="field-hint" id="report-date-format">Dates use dd/mm/yyyy.</p>
        ${valid ? "" : '<p class="form-error" id="report-error" role="alert">Enter valid dates in dd/mm/yyyy. The end date must be on or after the start date.</p>'}
      </form>
    </section>
    <section class="card report-total" aria-labelledby="report-total-title">
      <div>
        <h2 id="report-total-title">Total logged hours</h2>
        ${entries.length ? `<a class="text-link total-button" href="${escapeHtml(reportDetailsUrl())}" aria-label="View entries for ${total}">${total}</a>` : `<div class="stat-number">${valid ? total : "–"}</div>`}
        <p>${roundingDescription(report.rounding)}</p>
      </div>
      ${entries.length ? `<a class="button secondary" href="${escapeHtml(reportDetailsUrl())}">View time entries</a>` : ""}
    </section>
    <section class="card table-card section-space" aria-labelledby="project-heading">
      <div class="table-header"><div><h2 id="project-heading">Hours by project</h2></div></div>
      ${projectRows ? `<div class="table-scroll"><table><thead><tr><th scope="col">Project</th><th scope="col">Entries</th><th scope="col">Total logged hours</th></tr></thead><tbody>${projectRows}</tbody></table></div>`
        : `<p class="empty">${valid ? "No time entries match these filters." : "Correct the date range to see project totals."}</p>`}
    </section>`;
}

function details() {
  const query = new URLSearchParams(location.hash.split("?")[1]);
  const snapshot = reportFilters(query, defaultReport, "personal");
  if (snapshot.scope === "team" && !demoAccess("teamReports")) return accessRestricted("Team Reports require access to team time entries.");
  const summaryProject = query.get("summaryProject");
  const project = summaryProject === "all" || Object.hasOwn(projects, summaryProject) ? summaryProject : snapshot.project;
  const back = `<a class="button secondary" href="${escapeHtml(reportUrl({ ...snapshot, project }))}">Back to report</a>`;
  if (!validReportRange(snapshot)) {
    return pageHeader("Time Entry Details", "This report has an invalid date range.", back);
  }
  const entries = reportEntries(snapshot);
  const labels = [snapshot.scope === "team" ? "Team Reports" : "Personal Reports",
    snapshot.person === "all" ? "All team members" : people[snapshot.person], dateRange(snapshot.from, snapshot.to),
    snapshot.project === "all" ? "All projects" : projects[snapshot.project], roundingOptions[snapshot.rounding]];
  return pageHeader("Time Entry Details", "Entries included in the selected total.", back) +
    `<section class="card card-pad">
      <h2>Report filters</h2><div class="filter-tags">${labels.map(label => `<span class="filter-tag">${escapeHtml(label)}</span>`).join("")}</div>
    </section>
    <div class="section-space">${entryTable(entries, { title: "Filtered time entries",
      subtitle: `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${reportTotal(entries, snapshot.rounding)} total logged hours`,
      showPerson: true, showReason: true, duration: reportDuration, rounding: snapshot.rounding, empty: "No time entries match these filters." })}</div>`;
}

function invoices() {
  const allowed = demoAccess("invoices");
  if (!allowed?.length) return accessRestricted("Invoices require permission for the project.");
  const project = new URLSearchParams(location.hash.split("?")[1]).get("project");
  if (project && !allowed.includes(project)) return accessRestricted("You do not have invoice access for this project.");
  const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });
  const rows = sampleInvoices.filter(invoice => allowed.includes(invoice.project) && (!project || invoice.project === project))
    .map(invoice => `<tr><td>${invoice.number}</td><td>${projects[invoice.project]}</td><td>${money.format(invoice.amount)}</td><td>${workflowBadge(invoice.status)}</td></tr>`).join("");
  return pageHeader("Invoices", "View invoices for projects you can access.") +
    `<section class="card table-card" aria-label="Project invoices">${rows ? `<div class="table-scroll">
      <table><thead><tr><th scope="col">Invoice</th><th scope="col">Project</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
      <tbody>${rows}</tbody></table></div>` : '<p class="empty">No invoices for the projects you can access.</p>'}</section>`;
}

function updateTimer() {
  const display = document.querySelector("#elapsed");
  if (display) display.textContent = state.active ? elapsed(Math.max(0, Math.floor((Date.now() - state.active.start) / 1000))) : "00:00:00";
}

const views = { overview, time: tracking, reports: summary, "report-details": details, invoices, ...workflowViews };
const viewTitles = { overview: "Overview", time: "Daily & Weekly Time Tracking", reports: "Reports", "report-details": "Time Entry Details", invoices: "Invoices", ...workflowTitles };
const routeAccess = { recruiting: "hiring", "hiring-workflows": "hiringSetup", "job-postings": "hiringSetup", permissions: "administration" };
const dataRoutes = new Set(["time", "reports", "report-details", "invoices", "recruiting", "hiring-workflows", "job-postings", "interview-scheduling"]);

function render(loadingTimeEntries = false) {
  clearTimeout(routeLoadTimer);
  main.removeAttribute("aria-busy");
  document.body.classList.toggle("candidate-scheduling-page", currentRoute === "interview-scheduling");
  const permission = routeAccess[currentRoute];
  try {
    main.innerHTML = permission && !demoAccess(permission)
      ? accessRestricted(permission === "hiring" ? "Candidate Management requires Admin or HR Recruiter access."
        : permission === "hiringSetup" ? "Recruitment setup requires Full Access." : "Permission Matrix requires Full Access.")
      : currentRoute === "time" ? tracking(loadingTimeEntries) : views[currentRoute]();
  } catch (error) {
    console.error("Unable to render this page.", error);
    main.innerHTML = pageHeader(escapeHtml(viewTitles[currentRoute]), "This page could not be loaded.") +
      `<section class="card card-pad page-state" role="alert"><p>${currentRoute === "recruiting" ? "Select Retry to reload Candidate Management." : "Try loading the page again."}</p><button class="button secondary" type="button" data-action="retry-page">Retry</button></section>`;
  }
  document.title = `peopleDesk · ${viewTitles[currentRoute]}`;
  const activeNav = currentRoute === "report-details" ? "reports" : currentRoute;
  let activeScope = report.scope;
  if (currentRoute === "report-details") {
    const scope = new URLSearchParams(location.hash.split("?")[1]).get("scope");
    activeScope = scope === "team" ? "team" : "personal";
  }
  document.querySelectorAll("[data-report-scope]").forEach(link => {
    link.href = reportScopeUrl(link.dataset.reportScope);
  });
  document.querySelectorAll("[data-route]").forEach(link => {
    if (link.dataset.route === activeNav && (!link.dataset.reportScope || link.dataset.reportScope === activeScope)) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelectorAll(".workspace-nav [data-access]").forEach(item => {
    item.hidden = !demoAccess(item.dataset.access);
  });
  filterSearch();
  updateTimer();
}

function renderAndFocus(selector) {
  render();
  document.querySelector(selector)?.focus({ preventScroll: true });
}

function navigate(focus = true, showLoading = true) {
  clearTimeout(routeLoadTimer);
  const hashRoute = location.hash.slice(1).split("?")[0];
  currentRoute = Object.hasOwn(views, hashRoute) ? hashRoute : "overview";
  if (currentRoute !== "hiring-workflows") pendingWorkflowDeletion = null;
  if (currentRoute === "reports") report = reportFilters(new URLSearchParams(location.hash.split("?")[1]), report, "");
  if (currentRoute === "recruiting" && demoAccess("hiring")) restoreCandidateFromLink();
  if (focus) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  const showPage = () => {
    render();
    let section = document.querySelector('.workspace-nav [aria-current="page"]')?.closest('.nav-section');
    while (section) {
      section.open = true;
      section = section.parentElement.closest('.nav-section');
    }
  };
  if (showLoading && dataRoutes.has(currentRoute)) {
    if (currentRoute === "time") {
      render(true);
    } else {
      document.body.classList.toggle("candidate-scheduling-page", currentRoute === "interview-scheduling");
      main.setAttribute("aria-busy", "true");
      main.innerHTML = `<header class="page-header"><h1>${escapeHtml(viewTitles[currentRoute])}</h1></header>
        <div class="card card-pad page-state" role="status"><span class="loading-spinner" aria-hidden="true"></span>${currentRoute === "recruiting" ? "Loading candidates…" : "Loading…"}</div>`;
    }
    routeLoadTimer = setTimeout(showPage, 180);
  } else showPage();
}

function notify(message, saved = true) {
  clearTimeout(noticeTimeout);
  toast.textContent = saved ? message : `${message} Browser storage is unavailable. Changes will reset on reload.`;
  noticeTimeout = setTimeout(() => { toast.textContent = ""; }, 5500);
}

function makeEntry({ date, start, end, project, type, reason = "" }) {
  const savedAt = Date.now();
  return { id: globalThis.crypto?.randomUUID?.() ?? `entry-${savedAt}-${Math.random()}`,
    date, start, end, project, type, reason, person: currentUser, savedAt };
}

function saveTimeEntry(entry, message) {
  state.entries.push(entry);
  lastSaved = entry.id;
  selectedDay = entry.date;
  notify(message, persist());
  if (currentRoute === "time") {
    render();
  } else {
    history.pushState(null, "", "#time");
    navigate(false, false);
  }
  const row = main.querySelector(".row-saved");
  row?.focus({ preventScroll: true });
  row?.scrollIntoView({ block: "nearest" });
}

function toggleTimer() {
  if (state.active) {
    const { start, project } = state.active;
    const date = dateKey(new Date(start));
    state.active = null;
    const entry = makeEntry({ date, start, end: Math.max(Date.now(), start + 1), project, type: "timer" });
    saveTimeEntry(entry, "Time entry saved.");
    return;
  }
  if (!Object.hasOwn(projects, state.project)) return;
  state.active = { start: Date.now(), project: state.project };
  notify("Timer started.", persist());
  renderAndFocus('[data-action="timer"]');
}

function openManual(button) {
  formInvoker = button;
  form.reset();
  form.elements.date.value = displayDate(currentRoute === "time" && selectedDay <= dateKey() ? selectedDay : dateKey());
  form.elements.project.innerHTML = '<option value="">Select a project</option>' + options(projects, state.project);
  form.querySelector('[aria-invalid="true"]')?.removeAttribute("aria-invalid");
  error.hidden = true;
  dialog.showModal();
}

function showFormError(message, field) {
  error.textContent = message;
  error.hidden = false;
  form.elements[field].setAttribute("aria-invalid", "true");
  form.elements[field].focus();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  form.querySelector('[aria-invalid="true"]')?.removeAttribute("aria-invalid");
  const fields = Object.fromEntries(new FormData(form));
  const date = parseDisplayDate(fields.date);
  if (!isDate(date) || date > dateKey()) {
    showFormError("Enter a valid work date on or before today in dd/mm/yyyy.", "date");
    return;
  }
  if (!Object.hasOwn(projects, fields.project)) {
    showFormError("Select a project.", "project");
    return;
  }
  const start = +dateAt(date, fields.start);
  const end = +dateAt(date, fields.end);
  if (!Number.isFinite(start)) {
    showFormError("Enter a start time.", "start");
    return;
  }
  if (!Number.isFinite(end) || end <= start) {
    showFormError("End time must be after start time on the selected date.", "end");
    return;
  }
  const reason = fields.reason.trim();
  if (!reason || reason.length > 240) {
    showFormError("Enter a reason for the manual entry using up to 240 characters.", "reason");
    return;
  }
  const entry = makeEntry({ date, start, end, project: fields.project, type: "manual", reason });
  formInvoker = null;
  dialog.close();
  saveTimeEntry(entry, "Manual entry saved.");
});

dialog.addEventListener("close", () => {
  if (formInvoker?.isConnected) formInvoker.focus({ preventScroll: true });
  formInvoker = null;
});

const sidebarToggle = document.querySelector('[data-action="toggle-sidebar"]');

function setSidebarExpanded(expanded) {
  sidebarToggle.setAttribute("aria-expanded", String(expanded));
  sidebarToggle.setAttribute("aria-label", expanded ? "Collapse sidebar" : "Expand sidebar");
}

document.querySelector(".workspace-nav").addEventListener("click", event => {
  const summary = event.target.closest(".nav-section > summary");
  if (summary && matchMedia("(min-width: 801px)").matches && sidebarToggle.getAttribute("aria-expanded") === "false") {
    event.preventDefault();
    setSidebarExpanded(true);
    summary.parentElement.open = true;
  }
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action } = button.dataset;
  if (action === "toggle-sidebar") {
    setSidebarExpanded(button.getAttribute("aria-expanded") === "false");
  }
  if (action === "view-tasks") document.querySelector("#overview-tasks")?.focus();
  if (action === "retry-page") navigate(currentRoute !== "time");
  if (action === "timer") toggleTimer();
  if (action === "manual") openManual(button);
  if (action === "close-manual") dialog.close();
  if (action === "time-mode") {
    timeMode = button.dataset.mode;
    renderAndFocus(`[data-mode="${timeMode}"]`);
  }
  if (action === "step-date") {
    const { step } = button.dataset;
    selectedDay = addDays(selectedDay, Number(step) * (timeMode === "week" ? 7 : 1));
    renderAndFocus(`[data-step="${step}"]`);
  }
  if (action === "today") {
    selectedDay = dateKey();
    renderAndFocus('[data-action="today"]');
  }
});

main.addEventListener("change", event => {
  const { id, value } = event.target;
  if (id === "timer-project" && !state.active && (value === "" || Object.hasOwn(projects, value))) {
    state.project = value;
    persist();
    renderAndFocus("#timer-project");
  }
});

main.addEventListener("submit", event => {
  if (event.target.id !== "report-filters-form" || currentRoute !== "reports") return;
  event.preventDefault();
  const values = new FormData(event.target);
  for (const field of ["from", "to"]) {
    const value = values.get(field).trim();
    const date = parseDisplayDate(value);
    report[field] = isDate(date) ? date : value;
  }
  if (values.has("person")) report.person = values.get("person");
  report.project = values.get("project");
  history.replaceState(null, "", reportUrl(report));
  renderAndFocus(validReportRange(report) ? "#report-filters-form button" : `#report-filters-form [name="${isDate(report.from) ? "to" : "from"}"]`);
});

document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});

const quickSearch = document.querySelector(".workspace-search");
const searchInput = quickSearch.querySelector("input");
const searchLinks = Array.from(quickSearch.querySelectorAll("a"));
function filterSearch() {
  const term = searchInput.value.trim().toLowerCase();
  for (const link of searchLinks) {
    link.hidden = (link.dataset.access && !demoAccess(link.dataset.access)) || !link.textContent.toLowerCase().includes(term);
  }
  quickSearch.querySelector("p").hidden = searchLinks.some(link => !link.hidden);
}
searchInput.addEventListener("input", filterSearch);
roleSelect.addEventListener("change", () => {
  state.role = roleSelect.value;
  persist();
  navigate(false);
});
quickSearch.addEventListener("click", event => {
  if (event.target.closest("a")) quickSearch.open = false;
});
quickSearch.addEventListener("toggle", () => {
  if (quickSearch.open) searchInput.focus();
});
window.addEventListener("hashchange", () => navigate());
window.addEventListener("storage", event => {
  if (event.key !== storageKey) return;
  Object.assign(state, loadState());
  roleSelect.value = Object.hasOwn(demoRoles, state.role) ? state.role : "admin";
  if (!dialog.open) render();
});
setInterval(updateTimer, 250);
navigate(false);
