"use strict";

const workflowTitles = {
  leave: "Leave requests", permissions: "Access permissions", recruiting: "Candidate Management",
  "interview-scheduling": "Schedule your interview", "hiring-workflows": "Recruitment Workflow Settings", "job-postings": "Job Postings"
};
const workflowViews = {
  leave: leaveView, permissions: permissionsView, recruiting: recruitingView,
  "interview-scheduling": interviewSchedulingView, "hiring-workflows": hiringWorkflowsView, "job-postings": jobPostingsView
};
const workflowKey = "peopledesk-workflows-v1";
const leaveTypes = { annual: "Annual leave", sick: "Sick leave" };
const leaveAllowance = { annual: 7.5, sick: 5 };
const hiringCriteria = {
  Applied: { question: "Does the application show the experience needed for this job?", criteria: "Relevant experience and minimum requirements" },
  Screening: { question: "Which example best demonstrates readiness for this role?", criteria: "Relevant skills and evidence of past work" },
  Interview: { question: "Describe a challenging project, the choices you made, and the result.", criteria: "Problem-solving, communication, and ownership" },
  Offer: { question: "What did the team agree on in the final review?", criteria: "Overall fit and readiness to hire" }
};
const hiringOutcomes = ["Hired", "Rejected"];
const sampleApplications = {
  minh: { cv: "4 years in product design. Led research and interaction design for a customer onboarding redesign.", answer: "I interviewed new customers, mapped friction points, and tested simpler onboarding steps with the team." },
  nam: { cv: "5 years in software engineering. Built and maintained APIs and internal tools.", answer: "I led a service migration in stages, monitored errors, and documented rollback steps before release." },
  an: { cv: "2 years coordinating operations and maintaining process documentation.", answer: "I organized vendor requests into a single tracker and introduced a weekly follow-up process." }
};
const hiringRatings = { meets: "Meets criteria", mixed: "Partially meets criteria", fallsShort: "Does not meet criteria" };
const rejectionReasons = { requirements: "Does not meet role requirements", assessment: "Did not meet assessment criteria", withdrew: "Candidate withdrew", other: "Other" };
const permissionLabels = {
  profiles: "View employee profiles",
  time: "View time entries",
  reports: "View time reports",
  leave: "View leave requests",
  approve: "Approve leave requests",
  candidates: "View candidates",
  move: "Move candidates between stages"
};
const permissionRequires = { reports: "time", approve: "leave", move: "candidates" };
const scopeLabels = { own: "Own records", team: "Their team", project: "Their project", all: "All workspace records" };
const permissionDirectory = {
  linh: { team: "Operations", project: "Atlas" },
  tu: { team: "Product", project: "Atlas" },
  ha: { team: "Operations", project: "peopleDesk" },
  an: { team: "Operations", project: "Atlas" }
};
const demoReviewer = "tu";
let workflows;
let leaveTab = "mine";
let leaveSelection = "";
let leaveDraft = null;
let reviewDecision = "";
let overlapScope = "team";
let groupSelection = "managers";
let groupDraft = null;
let permissionPreview = false;
let previewPerson = "tu";
let recruitingJob = "";
let recruitingStage = "";
let candidateSelection = "";
let candidateDecision = "";
let dismissedUndoId = "";
let hiringWorkflowSelection = "";
let hiringWorkflowDraft = null;
let pendingWorkflowDeletion = null;
let jobDraft = null;
let workflowError = "";

function initializeRecruitment(data) {
  if (data.hiringWorkflows && data.jobs) return data;
  const stages = Object.entries(hiringCriteria).map(([name, stage]) => ({ name, ...stage, interview: name === "Interview" }));
  function withAssessment(name, question, criteria) {
    return [...stages.slice(0, 2), { name, question, criteria, interview: false }, ...stages.slice(2)];
  }
  data.hiringWorkflows = {
    design: { name: "Design", stages: withAssessment("Design exercise", "How did the candidate justify their design decisions?", "Design rationale, interaction quality, and accessibility") },
    development: { name: "Development", stages: withAssessment("Technical assessment", "How did the candidate test their solution?", "Correctness, code quality, and testing") },
    operations: { name: "Operations", stages }
  };
  data.jobs = Object.fromEntries([
    ["Product", "Product Designer", "design"],
    ["Engineering", "Software Engineer", "development"],
    ["Operations", "Operations Associate", "operations"]
  ].map(([id, title, workflow]) => [id, { title, description: "", workflow: structuredClone(data.hiringWorkflows[workflow]) }]));
  return data;
}

function workflowState() {
  if (workflows) return workflows;
  try {
    const stored = JSON.parse(localStorage.getItem(workflowKey));
    if (stored && Array.isArray(stored.requests) && stored.groups && stored.candidates) {
      workflows = initializeRecruitment(stored);
      return workflows;
    }
  } catch {
    // The demo can still run in memory.
  }
  const firstDay = nextWorkday();
  const nextDay = nextWorkday(firstDay);
  const now = new Date().toISOString();
  workflows = {
    requests: [{
      id: "sample-leave", person: "linh", type: "annual", from: firstDay, to: nextDay,
      reason: "Personal plans", status: "Pending",
      history: [{ title: "Request submitted", actor: people.linh, at: now }]
    }],
    groups: {
      managers: { name: "Team managers", members: ["tu"], scope: "team", permissions: ["profiles", "leave", "approve", "time"] },
      hiring: { name: "Recruiting team", members: ["ha"], scope: "project", permissions: ["candidates", "move"] }
    },
    candidates: {
      minh: { name: "Minh Phương", role: "Product", stage: "Screening", history: [{
        id: "demo-screening", from: "Applied", to: "Screening", actor: people.linh, at: now,
        reason: "Application reviewed and ready for screening.", email: "Not sent"
      }] },
      nam: { name: "Tuấn Nam", role: "Engineering", stage: "Interview", history: [{
        id: "demo-interview", from: "Screening", to: "Interview", actor: people.tu, at: now,
        reason: "Screening completed. Ready to schedule an interview."
      }] },
      an: { name: "An Nguyễn", role: "Operations", stage: "Applied", history: [] }
    }
  };
  return initializeRecruitment(workflows);
}

function commitWorkflow(message) {
  let saved = true;
  try {
    localStorage.setItem(workflowKey, JSON.stringify(workflowState()));
  } catch {
    saved = false;
  }
  workflowError = "";
  notify(message, saved);
}

function workflowButton(label, action, { value = "", primary = false } = {}) {
  return `<button type="button" class="button ${primary ? "primary" : "secondary"}" data-workflow-action="${action}" data-value="${escapeHtml(value)}">${label}</button>`;
}

function workflowBadge(label, color = "") {
  return `<span class="badge ${color}">${escapeHtml(label)}</span>`;
}

function workflowAlert(message, kind = "warning") {
  return `<div class="workflow-alert ${kind}" role="${kind === "error" ? "alert" : "status"}">${escapeHtml(message)}</div>`;
}

function showWorkflowError(message) {
  workflowError = message;
  const errorBox = main.querySelector("[data-workflow-error]");
  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }
}

function errorBox() {
  return `<p class="workflow-alert error" data-workflow-error role="alert" ${workflowError ? "" : "hidden"}>${escapeHtml(workflowError)}</p>`;
}

function workflowTime(value) {
  const date = new Date(value);
  return `${displayDate(date)} · ${clockFormat.format(date)}`;
}

function nextWorkday(day = dateKey()) {
  let next = addDays(day, 1);
  while ([0, 6].includes(dateAt(next).getDay())) next = addDays(next, 1);
  return next;
}

function leaveDays(from, to) {
  if (!isDate(from) || !isDate(to) || to < from) return null;
  const dayCount = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const weeks = Math.floor(dayCount / 7);
  let count = weeks * 5;
  for (let index = weeks * 7; index < dayCount; index++) {
    if (![0, 6].includes(dateAt(addDays(from, index)).getDay())) count++;
  }
  return count;
}

function leaveBalance(type, person, exclude = "") {
  return leaveAllowance[type] - workflowState().requests.filter(request =>
    request.id !== exclude && request.person === person && request.type === type && request.status === "Approved"
  ).reduce((used, request) => used + leaveDays(request.from, request.to), 0);
}

function leaveProjection(draft) {
  const count = leaveDays(draft.from, draft.to);
  const available = leaveBalance(draft.type, currentUser);
  const projected = count === null ? null : available - count;
  return `<div class="workflow-metrics">
    <div><span>Available</span><strong>${available} days</strong></div>
    <div><span>Requested</span><strong>${count === null ? "–" : `${count} days`}</strong></div>
    <div><span>Projected balance</span><strong>${projected === null ? "–" : `${projected} days`}</strong></div>
  </div>${count === null ? workflowAlert("Choose a valid date range. The end date must be on or after the start date.") : count === 0 ? workflowAlert("Select at least one weekday.") : projected < 0 ? workflowAlert("The request exceeds the available leave balance.") : ""}`;
}

function leaveStatus(status) {
  return workflowBadge(status, { Pending: "warning", Approved: "saved", Declined: "overdue" }[status]);
}

function leaveForm() {
  const draft = leaveDraft;
  return `<section class="card card-pad workflow-editor">
    <div class="workflow-card-header"><div><h2>${draft.id ? "Edit leave request" : "Request leave"}</h2><p>Projected balance updates as you change leave type or dates.</p></div></div>
    <form class="workflow-form" data-workflow-form="leave" novalidate>
      <div class="fields-inline">
        <label class="field">Leave type<select name="type">${options(leaveTypes, draft.type)}</select></label>
        <label class="field">From<input name="from" type="text" placeholder="dd/mm/yyyy" maxlength="10" value="${escapeHtml(displayDate(draft.from))}" required></label>
        <label class="field">To<input name="to" type="text" placeholder="dd/mm/yyyy" maxlength="10" value="${escapeHtml(displayDate(draft.to))}" required></label>
      </div>
      <div id="leave-projection" aria-live="polite">${leaveProjection(draft)}</div>
      <label class="field">Reason<textarea name="reason" rows="3" maxlength="250" placeholder="Add a note for your approver">${escapeHtml(draft.reason)}</textarea></label>
      ${errorBox()}
      <div class="workflow-actions">${workflowButton("Cancel", "leave-close")}<button class="button primary" type="submit">${draft.id ? "Save changes" : "Submit request"}</button></div>
    </form>
  </section>`;
}

function overlapList(request) {
  const day = nextWorkday();
  const entries = [
    { id: "team-overlap", person: "an", from: day, to: day, status: "Approved", team: "Operations", project: "Atlas" },
    { id: "project-overlap", person: "ha", from: day, to: nextWorkday(day), status: "Approved", team: "Product", project: "Atlas" },
    ...workflowState().requests.filter(other => other.status === "Approved").map(other => ({ ...other, team: "Operations", project: "Atlas" }))
  ].filter(other => other.id !== request.id && other.person !== request.person &&
    other.from <= request.to && other.to >= request.from && (overlapScope === "project" || other.team === "Operations"));
  return `<section class="workflow-subsection"><h3>Overlapping leave</h3>
    <div class="segmented" aria-label="Overlap context">
      <button type="button" data-workflow-action="overlap" data-value="team" aria-pressed="${overlapScope === "team"}">Team</button>
      <button type="button" data-workflow-action="overlap" data-value="project" aria-pressed="${overlapScope === "project"}">Project</button>
    </div>
    ${entries.length ? `<ul class="workflow-overlap">${entries.map(other => `<li><strong>${people[other.person]}</strong><span>${dateRange(other.from, other.to)} · ${overlapScope === "team" ? other.team : other.project}</span>${leaveStatus(other.status)}</li>`).join("")}</ul>`
      : '<p class="workflow-empty">No overlapping leave in this scope.</p>'}
  </section>`;
}

function leaveDetails(request) {
  if (!request) return '<section class="card card-pad"><p>No request selected.</p></section>';
  const pending = request.status === "Pending";
  const reviewing = leaveTab === "review" && pending;
  return `<section class="card card-pad workflow-editor">
    <div class="workflow-card-header"><div><h2>${leaveTypes[request.type]}</h2><p>${people[request.person]} · ${dateRange(request.from, request.to)} · ${leaveDays(request.from, request.to)} days</p></div>${leaveStatus(request.status)}</div>
    ${pending ? `<p class="workflow-owner">Waiting for ${people[demoReviewer]}</p>` : ""}
    ${request.reason ? `<p class="workflow-description">${escapeHtml(request.reason)}</p>` : ""}
    ${reviewing ? overlapList(request) : ""}
    ${reviewing ? `<div class="workflow-actions">${workflowButton("Decline", "leave-review", { value: "Declined" })}${workflowButton("Approve", "leave-review", { value: "Approved", primary: true })}</div>` : ""}
    ${reviewing && reviewDecision ? `<form class="workflow-form workflow-subsection" data-workflow-form="review" novalidate>
      <label class="field">${reviewDecision === "Declined" ? "Reason for declining" : "Approval note (optional)"}<textarea name="note" maxlength="250" rows="2"></textarea></label>
      ${errorBox()}<div class="workflow-actions">${workflowButton("Cancel", "review-close")}<button class="button primary">Confirm ${reviewDecision === "Declined" ? "decline" : "approval"}</button></div>
    </form>` : ""}
    ${pending && leaveTab === "mine" ? `<div class="workflow-actions">${workflowButton("Cancel request", "leave-cancel")}${workflowButton("Edit request", "leave-edit", { primary: true })}</div>` : ""}
    <section class="workflow-subsection"><h3>Request history</h3>
      <ol class="workflow-timeline">${request.history.slice().reverse().map(event => `<li><strong>${event.title}</strong><small>${event.actor} · ${workflowTime(event.at)}</small>${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}</li>`).join("")}</ol>
    </section>
  </section>`;
}

function leaveView() {
  const records = workflowState().requests.filter(request => leaveTab === "review" || request.person === currentUser).slice().reverse();
  const visible = records.find(request => request.id === leaveSelection) || records[0];
  leaveSelection = visible?.id || "";
  return pageHeader("Leave requests", "Request time off and review overlaps before approving.",
    leaveTab === "mine" ? workflowButton("Request leave", "leave-new", { primary: true }) : "") +
    `<div class="workflow-bar"><div class="segmented" aria-label="Leave view">
      <button type="button" data-workflow-action="leave-tab" data-value="mine" aria-pressed="${leaveTab === "mine"}">My requests</button>
      <button type="button" data-workflow-action="leave-tab" data-value="review" aria-pressed="${leaveTab === "review"}">Approvals</button>
      </div><p>${leaveTab === "mine" ? `As ${people[currentUser]}` : `Reviewing as ${people[demoReviewer]}`}</p></div>
      <div class="workflow-layout">
        <section class="card card-pad workflow-list"><h2>${leaveTab === "review" ? "Review queue" : "My requests"}</h2>
          ${records.length ? records.map(request => `<button class="workflow-record" type="button" data-workflow-action="leave-select" data-value="${escapeHtml(request.id)}" aria-pressed="${visible?.id === request.id}">
            <span><strong>${leaveTypes[request.type]}</strong><small>${dateRange(request.from, request.to)}${leaveTab === "review" ? ` · ${people[request.person]}` : ""}</small></span>${leaveStatus(request.status)}
          </button>`).join("") : '<p class="workflow-empty">No requests yet.</p>'}</section>
        ${leaveDraft ? leaveForm() : leaveDetails(visible)}
      </div>`;
}

function currentLeave() {
  return workflowState().requests.find(request => request.id === leaveSelection);
}

function addLeaveEvent(request, title, actor, note = "") {
  request.history.push({ title, actor, note, at: new Date().toISOString() });
}

function validateLeave(draft, person) {
  const count = leaveDays(draft.from, draft.to);
  if (!Object.hasOwn(leaveTypes, draft.type) || count === null) return "Choose a valid leave type and date range.";
  if (!count) return "Choose a date range that includes at least one weekday.";
  if (count > leaveBalance(draft.type, person)) return "This request exceeds the available leave balance.";
  return "";
}

function saveLeave(form) {
  const fields = readLeaveFields(form);
  if (fields.reason.length > 250) return showWorkflowError("Use no more than 250 characters for the reason.");
  const issue = validateLeave(fields, currentUser);
  if (issue) return showWorkflowError(issue);
  const existing = leaveDraft.id ? currentLeave() : null;
  if (leaveDraft.id && (existing?.person !== currentUser || existing.status !== "Pending")) {
    return showWorkflowError("Only your pending requests can be edited.");
  }
  const record = existing || { id: crypto.randomUUID?.() ?? `leave-${Date.now()}`, person: currentUser, status: "Pending", history: [] };
  Object.assign(record, fields, { reason: fields.reason.trim() });
  if (!existing) workflowState().requests.push(record);
  addLeaveEvent(record, existing ? "Request updated" : "Request submitted", people[currentUser]);
  leaveSelection = record.id;
  leaveDraft = null;
  commitWorkflow(existing ? "Leave request updated." : "Leave request submitted.");
  render();
}

function readLeaveFields(form) {
  const fields = Object.fromEntries(new FormData(form));
  for (const name of ["from", "to"]) {
    const value = fields[name].trim();
    const date = parseDisplayDate(value);
    fields[name] = isDate(date) ? date : value;
  }
  return fields;
}

function saveReview(form) {
  const record = currentLeave();
  if (leaveTab !== "review" || record?.status !== "Pending" || !reviewDecision) return;
  const note = new FormData(form).get("note").trim();
  if (reviewDecision === "Declined" && !note) return showWorkflowError("Enter a reason before declining.");
  if (reviewDecision === "Approved") {
    const issue = validateLeave(record, record.person);
    if (issue) return showWorkflowError(issue);
  }
  record.status = reviewDecision;
  addLeaveEvent(record, `Request ${reviewDecision.toLowerCase()}`, people[demoReviewer], note);
  reviewDecision = "";
  commitWorkflow(`Leave request ${record.status.toLowerCase()}.`);
  render();
}

function missingPermissions(group) {
  return [...new Set(group.permissions.map(permission => permissionRequires[permission]).filter(required => required && !group.permissions.includes(required)))];
}

function permissionNames(ids) {
  return ids.map(key => permissionLabels[key]).join(", ") || "None";
}

function groupSummary(group) {
  return `<dl class="workflow-definition">
    <div><dt>Recipients</dt><dd>${group.members.map(key => people[key]).join(", ") || "None selected"}</dd></div>
    <div><dt>Data visibility</dt><dd>${scopeLabels[group.scope]}</dd></div>
    <div><dt>Allowed actions</dt><dd>${permissionNames(group.permissions)}</dd></div>
  </dl>`;
}

function effectiveAccess() {
  const groups = Object.entries(workflowState().groups).map(([id, group]) => id === groupSelection && groupDraft ? groupDraft : group);
  const access = groups.filter(group => group.members.includes(previewPerson));
  return access.length ? `<ul class="workflow-overlap">${access.map(group =>
    `<li class="workflow-access-row"><strong>${group.name}</strong><span>${scopeLabels[group.scope]} · ${permissionNames(group.permissions)}</span>
      <span>People in scope: ${peopleInScope(group.scope, previewPerson)}</span></li>`).join("")}</ul>`
    : '<p class="workflow-empty">This person receives no access from the groups in this prototype.</p>';
}

function peopleInScope(scope, person) {
  if (scope === "own") return people[person];
  const recipient = permissionDirectory[person];
  return Object.entries(permissionDirectory).filter(([, record]) => scope === "all" || record[scope] === recipient[scope])
    .map(([id]) => people[id]).join(", ");
}

function permissionEditor() {
  const groups = workflowState().groups;
  const group = groupDraft || groups[groupSelection];
  const missing = missingPermissions(group);
  const recipients = Object.entries(people).map(([key, name]) => `<label class="workflow-check"><input type="checkbox" name="member" value="${key}" ${group.members.includes(key) ? "checked" : ""}>${name}</label>`).join("");
  const permissions = Object.entries(permissionLabels).map(([key, label]) => `<label class="workflow-check"><input type="checkbox" name="permission" value="${key}" ${group.permissions.includes(key) ? "checked" : ""}>${label}</label>`).join("");
  const preview = `<section class="workflow-subsection effective-access"><h3>Effective access by person</h3>
    <label class="field">Preview for<select data-workflow-field="preview-person">${options(people, previewPerson)}</select></label>
    <div id="effective-access">${effectiveAccess()}</div></section>`;
  if (!groupDraft) return `<section class="card card-pad workflow-editor">
    <div class="workflow-card-header"><div><h2>${group.name}</h2><p>Review who receives access and what those people can do and see.</p></div>${workflowButton("Edit group", "group-edit", { primary: true })}</div>
    ${groupSummary(group)}${preview}</section>`;
  if (permissionPreview) return `<section class="card card-pad workflow-editor">
    <div class="workflow-card-header"><div><h2>Review changes</h2><p>${group.name} · Changes take effect after you save.</p></div></div>
    <div class="workflow-compare"><section><h3>Current access</h3>${groupSummary(groups[groupSelection])}</section>
      <section><h3>Proposed access</h3>${groupSummary(group)}</section></div>
    ${preview}${errorBox()}
    <div class="workflow-actions">${workflowButton("Back to edit", "group-back")}${workflowButton("Save changes", "group-save", { primary: true })}</div>
  </section>`;
  return `<section class="card card-pad workflow-editor">
    <div class="workflow-card-header"><div><h2>Edit ${group.name}</h2><p>Choose recipients separately from the records they can see.</p></div></div>
    <form class="workflow-form" data-workflow-form="permissions">
      <fieldset><legend>Recipients</legend><div class="workflow-checks">${recipients}</div></fieldset>
      <label class="field">Data visibility<select name="scope">${options(scopeLabels, group.scope)}</select></label>
      <fieldset><legend>Allowed actions</legend><div class="workflow-checks">${permissions}</div></fieldset>
      <div id="permission-dependencies">${dependencyNotice(missing)}</div>
      ${errorBox()}
      <div class="workflow-actions">${workflowButton("Cancel", "group-cancel")}<button class="button primary" type="submit">Preview changes</button></div>
    </form>
  </section>`;
}

function dependencyNotice(missing) {
  return missing.length ? `<div class="workflow-dependency">${workflowAlert(`Required permissions: ${permissionNames(missing)}.`)}
    ${workflowButton("Enable required permissions", "group-dependencies")}</div>` : "";
}

function permissionsView() {
  const groups = workflowState().groups;
  return pageHeader("Access permissions", "Manage permission groups, data visibility, and effective access.") +
    `<div class="workflow-layout">
    <section class="card card-pad workflow-list"><h2>Permission groups</h2>
      ${Object.entries(groups).map(([id, group]) => `<button class="workflow-record" type="button" data-workflow-action="group-select" data-value="${id}" aria-pressed="${id === groupSelection}">
      <span><strong>${group.name}</strong><small>${scopeLabels[group.scope]}</small></span>${workflowBadge(`${group.members.length} ${group.members.length === 1 ? "member" : "members"}`)}</button>`).join("")}
    </section>${permissionEditor()}</div>`;
}

function updatePermissionDraft(form) {
  const data = new FormData(form);
  groupDraft.members = data.getAll("member");
  groupDraft.permissions = data.getAll("permission");
  groupDraft.scope = data.get("scope");
}

function permissionIssue(group) {
  if (!group.members.length) return "Choose at least one recipient.";
  if (!group.permissions.length) return "Choose at least one allowed action.";
  if (missingPermissions(group).length) return "Enable the required permissions or remove the actions that depend on them.";
  return "";
}

function emailBadge(status) {
  return workflowBadge(status, { Sent: "saved", Pending: "warning", Failed: "overdue" }[status]);
}

function candidateHistory(candidate) {
  const reversed = new Set(candidate.history.map(event => event.reversesEventId).filter(Boolean));
  return `<section class="workflow-subsection"><h3>Timeline</h3>
    ${candidate.history.length ? `<ol class="workflow-timeline">${candidate.history.slice().reverse().map(event =>
      `<li><div class="workflow-event-header"><strong>${escapeHtml(event.from)} → ${escapeHtml(event.to)}</strong>
      ${event.reversesEventId ? workflowBadge("Undo", "active") : ""}
      ${reversed.has(event.id) ? workflowBadge("Undone") : ""}
      ${event.email ? emailBadge(event.email) : ""}</div>
      <small>${escapeHtml(event.actor)} · ${workflowTime(event.at)}</small><p>${escapeHtml(event.reason)}</p>
      ${event.evaluation ? `<small>Evaluation: ${hiringRatings[event.evaluation.rating]} · ${escapeHtml(event.evaluation.notes)}</small>` : ""}
      ${event.sentAt ? `<small>Demo email marked sent by ${escapeHtml(event.sentBy)} · ${workflowTime(event.sentAt)}</small>` : ""}
      </li>`).join("")}</ol>` : '<p class="workflow-empty">No stage changes yet.</p>'}
  </section>`;
}

function workflowStageList(workflow) {
  return `<ol class="recruitment-stages">${workflow.stages.map(stage =>
    `<li><strong>${escapeHtml(stage.name)}</strong>${stage.interview ? workflowBadge("Interview", "active") : ""}</li>`).join("")}</ol>`;
}

function newHiringStage() {
  return { name: "", question: "", criteria: "", interview: false };
}

function hiringWorkflowEditor() {
  const { name, stages, id } = hiringWorkflowDraft;
  return `<section class="card card-pad">
    <form class="workflow-form" data-workflow-form="hiring-workflow" novalidate>
      <h2>${id ? "Edit recruitment workflow" : "New recruitment workflow"}</h2>
      <label class="field">Workflow name<input name="name" maxlength="80" required value="${escapeHtml(name)}"></label>
      ${stages.map((stage, index) => `<fieldset>
        <legend>Stage ${index + 1}</legend>
        <div class="workflow-form">
          <label class="field">Stage name<input name="stage-${index}" maxlength="60" required value="${escapeHtml(stage.name)}"></label>
          <div class="fields-inline">
            <label class="field">Evaluation question<textarea name="question-${index}" maxlength="240" rows="2" required>${escapeHtml(stage.question)}</textarea></label>
            <label class="field">Evaluation criteria<textarea name="criteria-${index}" maxlength="240" rows="2" required>${escapeHtml(stage.criteria)}</textarea></label>
          </div>
          <label class="workflow-check"><input type="checkbox" name="interview-${index}" ${stage.interview ? "checked" : ""}> Requires an interview</label>
        </div>
        <div class="workflow-actions">
          <button type="button" class="button secondary" data-workflow-action="hiring-stage-up" data-value="${index}" aria-label="Move stage ${index + 1} up" ${index === 0 ? "disabled" : ""}>Move up</button>
          <button type="button" class="button secondary" data-workflow-action="hiring-stage-down" data-value="${index}" aria-label="Move stage ${index + 1} down" ${index === stages.length - 1 ? "disabled" : ""}>Move down</button>
          <button type="button" class="button secondary" data-workflow-action="hiring-stage-remove" data-value="${index}" aria-label="Remove stage ${index + 1}" ${stages.length === 1 ? "disabled" : ""}>Remove</button>
        </div>
      </fieldset>`).join("")}
      <div>${workflowButton("Add stage", "hiring-stage-add")}</div>
      ${errorBox()}
      <div class="workflow-actions">${workflowButton("Cancel", "hiring-workflow-cancel")}<button class="button primary">Save workflow</button></div>
    </form>
  </section>`;
}

function hiringWorkflowsView() {
  const templates = workflowState().hiringWorkflows;
  const selected = Object.hasOwn(templates, hiringWorkflowSelection) ? templates[hiringWorkflowSelection] : null;
  const title = pageHeader("Recruitment Workflow Settings", "Manage the workflows available when creating a job description.",
    workflowButton("New workflow", "hiring-workflow-new", { primary: true }));
  return title + `<div class="workflow-layout">
    <section class="card card-pad workflow-list"><h2>Workflows</h2>
      ${Object.entries(templates).map(([id, workflow]) =>
        `<button type="button" class="workflow-record" data-workflow-action="hiring-workflow-view" data-value="${escapeHtml(id)}" aria-pressed="${!hiringWorkflowDraft && id === hiringWorkflowSelection}">
          <span><strong>${escapeHtml(workflow.name)}</strong><small>${workflow.stages.length} stages</small></span></button>`).join("") ||
        '<p class="workflow-empty">No recruitment workflows yet.</p>'}
    </section>
    ${hiringWorkflowDraft ? hiringWorkflowEditor() : `<section class="card card-pad">
      ${selected ? `<div class="workflow-card-header"><div><h2>${escapeHtml(selected.name)}</h2><p>Stages are shown in recruitment order.</p></div></div>
        <ol class="recruitment-stages stage-details">${selected.stages.map(stage =>
          `<li><div><strong>${escapeHtml(stage.name)}</strong>${stage.interview ? workflowBadge("Interview required", "active") : ""}
          <dl class="workflow-definition"><div><dt>Evaluation question</dt><dd>${escapeHtml(stage.question)}</dd></div>
          <div><dt>Evaluation criteria</dt><dd>${escapeHtml(stage.criteria)}</dd></div></dl></div></li>`).join("")}</ol>
        ${pendingWorkflowDeletion?.id === hiringWorkflowSelection ? `<section class="workflow-subsection" aria-labelledby="delete-workflow-title">
          <h3 id="delete-workflow-title">Delete ${escapeHtml(selected.name)}?</h3>
          <p>Existing job postings keep their workflow. You won’t be able to select this workflow for new job descriptions.</p>
          <div class="workflow-actions">${workflowButton("Cancel", "hiring-workflow-cancel-delete")}
            <button type="button" class="button decision-no" data-workflow-action="hiring-workflow-confirm-delete">Delete workflow</button>
          </div>
        </section>` : `<div class="workflow-actions">${workflowButton("Delete workflow", "hiring-workflow-review-delete")}
          ${workflowButton("Edit workflow", "hiring-workflow-edit", { primary: true })}</div>`}`
        : '<p class="workflow-empty">Select a workflow to view its stages.</p>'}
      ${errorBox()}
    </section>`}
  </div>`;
}

function readHiringWorkflowDraft(form) {
  const fields = new FormData(form);
  hiringWorkflowDraft.name = fields.get("name");
  hiringWorkflowDraft.stages = hiringWorkflowDraft.stages.map((_, index) => ({
    name: fields.get(`stage-${index}`), question: fields.get(`question-${index}`),
    criteria: fields.get(`criteria-${index}`), interview: fields.has(`interview-${index}`)
  }));
}

function handleHiringSetupAction(action, value) {
  const templates = workflowState().hiringWorkflows;
  const selected = Object.hasOwn(templates, hiringWorkflowSelection) ? templates[hiringWorkflowSelection] : null;
  if (action === "hiring-workflow-confirm-delete") {
    const pending = pendingWorkflowDeletion;
    pendingWorkflowDeletion = null;
    if (!pending || pending.id !== hiringWorkflowSelection) return;
    if (!selected || JSON.stringify(selected) !== pending.original) {
      return showWorkflowError("This workflow changed. Select it again before deleting.");
    }
    delete templates[pending.id];
    hiringWorkflowSelection = "";
    commitWorkflow("Recruitment workflow deleted.");
    return;
  }
  pendingWorkflowDeletion = action === "hiring-workflow-review-delete" && selected
    ? { id: hiringWorkflowSelection, original: JSON.stringify(selected) } : null;
  if (action.startsWith("hiring-stage-") && hiringWorkflowDraft) {
    readHiringWorkflowDraft(main.querySelector('[data-workflow-form="hiring-workflow"]'));
    const { stages } = hiringWorkflowDraft;
    const index = Number(value);
    if (action === "hiring-stage-add") stages.push(newHiringStage());
    if (action === "hiring-stage-remove" && stages.length > 1) stages.splice(index, 1);
    const target = index + (action === "hiring-stage-up" ? -1 : 1);
    if ((action === "hiring-stage-up" || action === "hiring-stage-down") && stages[index] && stages[target]) {
      [stages[index], stages[target]] = [stages[target], stages[index]];
    }
    return;
  }
  if (action === "job-new") jobDraft = { title: "", description: "", workflow: "" };
  if (action === "job-cancel") jobDraft = null;
  if (action === "hiring-workflow-cancel") hiringWorkflowDraft = null;
  if (action === "hiring-workflow-view" && Object.hasOwn(templates, value)) {
    hiringWorkflowSelection = value;
    hiringWorkflowDraft = null;
  }
  if (action === "hiring-workflow-new") {
    hiringWorkflowDraft = { id: "", name: "", stages: [newHiringStage()] };
  }
  if (action === "hiring-workflow-edit" && selected) {
    hiringWorkflowDraft = { id: hiringWorkflowSelection, ...structuredClone(selected), original: JSON.stringify(selected) };
  }
}

function saveHiringWorkflow(form) {
  readHiringWorkflowDraft(form);
  const { id, name, stages, original } = hiringWorkflowDraft;
  const workflow = { name: name.trim(), stages: stages.map(stage => ({
    name: stage.name.trim(), question: stage.question.trim(), criteria: stage.criteria.trim(), interview: stage.interview
  })) };
  const stageNames = workflow.stages.map(stage => stage.name.toLowerCase());
  const templates = workflowState().hiringWorkflows;
  if (!workflow.name || workflow.name.length > 80) return showWorkflowError("Enter a workflow name of up to 80 characters.");
  if (Object.entries(templates).some(([key, item]) => key !== id && item.name.toLowerCase() === workflow.name.toLowerCase())) {
    return showWorkflowError("A workflow with this name already exists.");
  }
  if (workflow.stages.some(stage => !stage.name || stage.name.length > 60 || !stage.question ||
      stage.question.length > 240 || !stage.criteria || stage.criteria.length > 240)) {
    return showWorkflowError("Enter a name, evaluation question and criteria for every stage.");
  }
  if (new Set(stageNames).size !== stageNames.length || hiringOutcomes.some(outcome => stageNames.includes(outcome.toLowerCase()))) {
    return showWorkflowError("Use unique stage names. Hired and Rejected are reserved outcomes.");
  }
  if (id && JSON.stringify(templates[id]) !== original) return showWorkflowError("This workflow changed in another tab. Reopen it before editing.");
  hiringWorkflowSelection = id || `workflow-${crypto.randomUUID?.() ?? Date.now()}`;
  templates[hiringWorkflowSelection] = workflow;
  hiringWorkflowDraft = null;
  commitWorkflow("Recruitment workflow saved.");
  render();
  main.querySelector('[aria-pressed="true"]')?.focus();
}

function jobPostingsView() {
  const { jobs, hiringWorkflows: templates } = workflowState();
  const title = pageHeader("Job Postings", "Create a job description and choose its recruitment workflow.",
    workflowButton("Create job description", "job-new", { primary: true }));
  if (jobDraft) {
    const selected = Object.hasOwn(templates, jobDraft.workflow) ? templates[jobDraft.workflow] : null;
    return title + `<section class="card card-pad">
      <form class="workflow-form" data-workflow-form="hiring-job" novalidate>
        <h2>New job description</h2>
        <label class="field">Job title<input name="title" maxlength="100" required value="${escapeHtml(jobDraft.title)}"></label>
        <label class="field">Job description<textarea name="description" maxlength="2000" rows="4" required>${escapeHtml(jobDraft.description)}</textarea></label>
        <label class="field">Recruitment workflow<select name="workflow" id="job-workflow" required>
          <option value="">Select a saved workflow</option>${options(Object.fromEntries(Object.entries(templates).map(([id, workflow]) => [id, workflow.name])), jobDraft.workflow)}</select></label>
        ${selected ? `<div><h3>Recruitment stages</h3>${workflowStageList(selected)}</div>` : ""}
        ${Object.keys(templates).length ? "" : '<a class="text-link" href="#hiring-workflows">Create a recruitment workflow first</a>'}
        ${errorBox()}
        <div class="workflow-actions">${workflowButton("Cancel", "job-cancel")}<button class="button primary">Save job description</button></div>
      </form></section>`;
  }
  if (!Object.keys(jobs).length) {
    return title + '<section class="card card-pad"><h2>No job postings yet</h2><p class="field-hint">Create a job description to add a posting.</p></section>';
  }
  return title + `<section class="card table-card" aria-label="Job postings"><div class="table-scroll">
    <table><thead><tr><th scope="col">Job</th><th scope="col">Recruitment workflow</th><th scope="col">Stages</th><th scope="col">Candidates</th></tr></thead>
    <tbody>${Object.entries(jobs).map(([id, job]) => `<tr><td class="row-project">${escapeHtml(job.title)}</td>
      <td>${escapeHtml(job.workflow.name)}</td><td>${job.workflow.stages.length}</td>
      <td><a class="text-link" href="#recruiting?job=${encodeURIComponent(id)}" aria-label="Open pipeline for ${escapeHtml(job.title)}">Open pipeline</a></td></tr>`).join("")}</tbody></table>
    </div></section>`;
}

function saveHiringJob(form) {
  const fields = Object.fromEntries(new FormData(form));
  const title = fields.title.trim();
  const description = fields.description.trim();
  const { jobs, hiringWorkflows: templates } = workflowState();
  if (!title || title.length > 100 || !description || description.length > 2000) {
    return showWorkflowError("Enter a job title and description within the indicated limits.");
  }
  if (!Object.hasOwn(templates, fields.workflow)) return showWorkflowError("Select a saved recruitment workflow.");
  const id = `job-${crypto.randomUUID?.() ?? Date.now()}`;
  jobs[id] = { title, description, workflow: structuredClone(templates[fields.workflow]) };
  jobDraft = null;
  commitWorkflow("Job description saved.");
  location.hash = `#recruiting?job=${encodeURIComponent(id)}`;
}

function hiringJobName(role) {
  return workflowState().jobs[role]?.title ?? role;
}

function hiringStage(candidate, name = candidate.stage) {
  return workflowState().jobs[candidate.role]?.workflow.stages.find(stage => stage.name === name);
}

function recruitingQuery() {
  return new URLSearchParams(location.hash.split("?")[1]);
}

function recruitingLink(id) {
  return `#recruiting?candidate=${encodeURIComponent(id)}`;
}

function restoreCandidateFromLink() {
  const query = recruitingQuery();
  const id = query.get("candidate");
  const job = query.get("job");
  const { candidates, jobs } = workflowState();
  if (Object.hasOwn(candidates, id)) {
    recruitingJob = candidates[id].role;
    candidateSelection = id;
  } else if (Object.hasOwn(jobs, job)) {
    recruitingJob = job;
    candidateSelection = "";
  } else {
    recruitingJob = "";
    candidateSelection = "";
  }
  recruitingStage = "";
  candidateDecision = "";
}

function candidateFields(candidate) {
  return `<input type="hidden" name="candidate" value="${escapeHtml(candidateSelection)}">
    <input type="hidden" name="stage" value="${escapeHtml(candidate.stage)}">
    <input type="hidden" name="lastEvent" value="${escapeHtml(candidate.history.at(-1)?.id ?? "")}">`;
}

function candidateApplication(candidate) {
  const application = candidate.application ?? sampleApplications[candidateSelection];
  return `<section class="workflow-subsection"><h3>Application</h3>
    <dl class="workflow-definition">
      <div><dt>CV summary</dt><dd>${escapeHtml(application?.cv ?? "No CV on file.")}</dd></div>
      <div><dt>Tell us about a relevant project and your contribution.</dt><dd>${escapeHtml(application?.answer ?? "No application answer on file.")}</dd></div>
    </dl>
  </section>`;
}

function candidateInterview(candidate) {
  const interview = candidate.interview;
  if (!interview) {
    return `<p class="workflow-description">This stage requires an interview. Create a scheduling link for the candidate.</p>
      <div class="workflow-actions hiring-actions">${workflowButton("Create scheduling link", "candidate-invite", { primary: true })}</div>`;
  }
  const link = `#interview-scheduling?candidate=${encodeURIComponent(candidateSelection)}&amp;invite=${encodeURIComponent(interview.token)}`;
  if (!interview.selectedSlot) {
    return `<p class="workflow-description">The scheduling link is ready. Share it with the candidate and wait for them to choose a time.</p>
      <div class="workflow-actions hiring-actions"><a class="button secondary" href="${link}&amp;preview=1">Preview candidate scheduling</a></div>`;
  }
  return `<p class="workflow-description">Interview ${interview.completed ? "completed" : "scheduled"} · ${workflowTime(interview.selectedSlot)}</p>
    ${interview.completed ? "" : `<div class="workflow-actions hiring-actions">${workflowButton("Mark interview complete", "candidate-interview-complete", { primary: true })}</div>`}`;
}

function interviewSchedulingView() {
  const query = recruitingQuery();
  const id = query.get("candidate");
  const candidates = workflowState().candidates;
  const candidate = Object.hasOwn(candidates, id) ? candidates[id] : null;
  const interview = candidate && hiringStage(candidate)?.interview ? candidate.interview : null;
  if (!interview || interview.token !== query.get("invite")) {
    return pageHeader("Scheduling link unavailable", "This interview link is no longer active. Ask your recruiter for a new one.");
  }
  const returnToCandidate = query.get("preview") === "1" && demoAccess("hiring")
    ? `<div class="workflow-actions hiring-actions"><a class="button secondary" href="${recruitingLink(id)}">Back to Candidate Management</a></div>` : "";
  return pageHeader("Schedule your interview", `${escapeHtml(candidate.name)} · ${escapeHtml(hiringJobName(candidate.role))}`) +
    `<section class="card card-pad hiring-scheduling">
      ${interview.selectedSlot
        ? `<h2>Interview confirmed</h2><p>Your interview is scheduled for ${workflowTime(interview.selectedSlot)}.</p>${returnToCandidate}`
        : !interview.slots.length ? '<h2>No interview times available</h2><p>Contact the recruiting team for another time.</p>'
        : `<form class="workflow-form" data-workflow-form="candidate-book" novalidate>
            <fieldset><legend>Available times (local time)</legend>
              ${interview.slots.map(slot => `<label class="workflow-check"><input type="radio" name="slot" value="${escapeHtml(slot)}">${workflowTime(slot)}</label>`).join("")}
            </fieldset>
            ${errorBox()}
            <div class="workflow-actions hiring-actions"><button class="button primary">Confirm interview time</button></div>
          </form>`}
    </section>`;
}

function candidateEvaluation(candidate) {
  const { question, criteria } = hiringStage(candidate);
  const evaluation = candidate.evaluation;
  return `<form class="workflow-form workflow-subsection" data-workflow-form="candidate-evaluate" novalidate>
    <h3>Stage evaluation</h3>
    ${candidateFields(candidate)}
    <dl class="workflow-definition">
      <div><dt>Question</dt><dd>${escapeHtml(question)}</dd></div>
      <div><dt>Criteria</dt><dd>${escapeHtml(criteria)}</dd></div>
    </dl>
    <div class="fields-inline">
      <label class="field">Rating<select name="rating" required><option value="">Select a rating</option>${options(hiringRatings, evaluation?.rating)}</select></label>
      <label class="field">Evaluation notes<textarea name="notes" rows="2" maxlength="500" required>${escapeHtml(evaluation?.notes ?? "")}</textarea></label>
    </div>
    ${evaluation ? '<p class="workflow-description">Evaluation saved for this stage.</p>' : ""}
    ${errorBox()}
    <div class="workflow-actions hiring-actions"><button class="button ${evaluation ? "secondary" : "primary"}">${evaluation ? "Update evaluation" : "Save evaluation"}</button></div>
  </form>`;
}

function candidateStageChoices(candidate) {
  const stages = workflowState().jobs[candidate.role].workflow.stages.map(stage => stage.name);
  const next = stages[stages.indexOf(candidate.stage) + 1];
  return { next, alternatives: stages.filter(target => target !== candidate.stage && target !== next) };
}

function undoableStageChange(candidate) {
  const last = candidate.history.at(-1);
  if (!last || last.reversesEventId || last.to !== candidate.stage || last.from === last.to) return null;
  return hiringStage(candidate, last.from) && hiringStage(candidate, last.to) ? last : null;
}

function candidateUndo(candidate) {
  const last = undoableStageChange(candidate);
  if (!last || dismissedUndoId === last.id) return "";
  if (candidateDecision !== "undo") {
    return `<section class="workflow-subsection"><h3>Undo last stage change?</h3>
      <div class="workflow-actions hiring-actions">
        <button type="button" class="button decision-no" data-workflow-action="candidate-undo" data-value="continue">No, continue</button>
        <button type="button" class="button decision-yes" data-workflow-action="candidate-undo" data-value="${escapeHtml(last.id)}">Yes, review undo</button>
      </div>
    </section>`;
  }
  return `<form class="workflow-form workflow-subsection" data-workflow-form="candidate-undo" novalidate>
    <h3>Undo stage change</h3>
    ${candidateFields(candidate)}
    <div class="fields-inline">
      <dl class="workflow-definition"><div><dt>Current stage</dt><dd>${escapeHtml(candidate.stage)}</dd></div></dl>
      <dl class="workflow-definition"><div><dt>Restore to</dt><dd>${escapeHtml(last.from)}</dd></div></dl>
    </div>
    <p class="workflow-description">Both changes will stay in the timeline.${candidate.interview ? " The current interview invitation will close." : ""}</p>
    <label class="field">Reason (optional)<textarea name="reason" rows="2" maxlength="250"></textarea></label>
    ${errorBox()}
    <div class="workflow-actions">${workflowButton("Cancel", "candidate-undo")}<button class="button primary">Confirm undo</button></div>
  </form>`;
}

function candidateNextStep(candidate) {
  const { next, alternatives } = candidateStageChoices(candidate);
  if (!candidateDecision) {
    return `<section class="workflow-subsection"><h3 id="hiring-decision" tabindex="-1">Next step</h3>
      <div class="workflow-actions hiring-actions">
        ${next ? workflowButton("Advance to next stage", "candidate-decision", { value: "advance", primary: true }) : ""}
        ${alternatives.length ? workflowButton("Change stage", "candidate-decision", { value: "change" }) : ""}
        ${workflowButton("Reject candidate", "candidate-decision", { value: "reject" })}
        ${workflowButton("Hire candidate", "candidate-decision", { value: "hire" })}
      </div>
    </section>`;
  }
  const stageMove = candidateDecision === "advance" || candidateDecision === "change";
  const heading = { advance: "Advance to next stage", change: "Skip or return to a stage", reject: "Reject candidate", hire: "Hire candidate" }[candidateDecision];
  const confirmation = stageMove ? "Confirm stage change" : candidateDecision === "reject" ? "Confirm rejection" : "Confirm hire";
  const target = candidateDecision === "advance" ? next : candidateDecision === "reject" ? "Rejected" : "Hired";
  return `<form class="workflow-form workflow-subsection" data-workflow-form="candidate-decision" novalidate>
    <h3 id="hiring-decision" tabindex="-1">${heading}</h3>
    ${candidateFields(candidate)}
    <input type="hidden" name="decision" value="${candidateDecision}">
    <div class="fields-inline">
      <dl class="workflow-definition"><div><dt>Current stage</dt><dd>${escapeHtml(candidate.stage)}</dd></div></dl>
      ${candidateDecision === "change"
        ? `<label class="field">Target stage<select name="target" required><option value="">Select a stage</option>${options(alternatives.map(stage => [stage, stage]), "")}</select></label>`
        : `<dl class="workflow-definition"><div><dt>${stageMove ? "Target stage" : "Outcome"}</dt><dd>${escapeHtml(target)}</dd></div></dl>`}
    </div>
    ${stageMove ? '<label class="field">Reason for moving<textarea name="reason" rows="2" maxlength="250" required></textarea></label>' : ""}
    ${candidateDecision === "reject"
      ? `<label class="field">Rejection reason<select name="reason" required><option value="">Select a reason</option>${options(rejectionReasons, "")}</select></label>
         <label class="field">Additional details<textarea name="details" rows="2" maxlength="250"></textarea></label>` : ""}
    ${errorBox()}
    <div class="workflow-actions">${workflowButton("Cancel", "candidate-decision")}<button class="button primary">${confirmation}</button></div>
  </form>`;
}

function recruitingView() {
  const { candidates, jobs } = workflowState();
  const title = pageHeader("Candidate Management", "Review applications and manage candidates by recruitment stage.");
  const query = recruitingQuery();
  if ((query.has("candidate") && !Object.hasOwn(candidates, query.get("candidate"))) ||
      (query.has("job") && !Object.hasOwn(jobs, query.get("job")))) {
    return title + '<section class="card card-pad page-state" role="alert"><p>This candidate or job could not be found.</p><a class="button secondary" href="#recruiting">Back to Candidate Management</a></section>';
  }
  const [firstJob] = Object.keys(jobs);
  if (firstJob === undefined) return title + '<section class="card card-pad"><h2>No job postings yet</h2><p class="field-hint">Candidates are listed after a job posting is created.</p></section>';
  if (!Object.hasOwn(jobs, recruitingJob)) {
    recruitingJob = firstJob;
    recruitingStage = "";
    candidateSelection = "";
    candidateDecision = "";
  }
  const job = jobs[recruitingJob];
  const jobOptions = Object.fromEntries(Object.entries(jobs).map(([id, item]) => [id, item.title]));
  const matching = Object.entries(candidates).filter(([, candidate]) => candidate.role === recruitingJob);
  const filtered = matching.filter(([, candidate]) => !recruitingStage || candidate.stage === recruitingStage);
  const current = filtered.find(([id]) => id === candidateSelection)?.[1];
  const stage = current && hiringStage(current);
  const needsInterview = stage?.interview && !current.interview?.completed;
  const canEvaluate = stage && candidateDecision !== "undo" && !needsInterview;
  const stages = [...job.workflow.stages.map(stage => stage.name), ...hiringOutcomes];
  const pipeline = `<section class="card card-pad hiring-pipeline" aria-label="Recruitment pipeline">
    <label class="field">Job<select id="hiring-job" data-workflow-field="hiring-job">${options(jobOptions, recruitingJob)}</select></label>
    <div class="workflow-card-header hiring-pipeline-header"><div><h2>Pipeline</h2><p>${escapeHtml(job.workflow.name)} workflow</p></div>
      <label class="field">Filter by stage<select id="hiring-stage-filter" data-workflow-field="hiring-stage"><option value="">All stages</option>
        ${options(stages.map(name => [name, name]), recruitingStage)}</select></label></div>
      <div class="workflow-metrics hiring-stage-counts">
      ${stages.map(name => `<div><span>${escapeHtml(name)}</span><strong>${matching.filter(([, candidate]) => candidate.stage === name).length}</strong></div>`).join("")}
    </div>
  </section>`;
  return title + pipeline +
    `<div class="workflow-layout"><section class="card card-pad workflow-list"><h2>Candidates</h2>
      ${filtered.map(([id, candidate]) => `<button type="button" class="workflow-record" data-workflow-action="candidate-select" data-value="${escapeHtml(id)}" aria-pressed="${id === candidateSelection}"><span><strong>${escapeHtml(candidate.name)}</strong></span>${workflowBadge(candidate.stage, "active")}</button>`).join("") || '<p class="workflow-empty">No candidates match this selection.</p>'}
      </section><section class="card card-pad workflow-editor">
        ${current ? `<div class="workflow-card-header"><div><h2 id="candidate-heading" tabindex="-1">${escapeHtml(current.name)}</h2><p>${escapeHtml(hiringJobName(current.role))}</p></div>${workflowBadge(current.stage, current.stage === "Hired" ? "saved" : current.stage === "Rejected" ? "overdue" : "active")}</div>
          ${candidateDecision === "undo" || (!candidateDecision && !needsInterview) ? candidateUndo(current) : ""}
          ${candidateApplication(current)}
          ${stage && candidateDecision !== "undo" ? `<section class="workflow-subsection">
            <h3>Interview still needed? ${workflowBadge(needsInterview ? "Yes" : "No", needsInterview ? "saved" : "overdue")}</h3>
            ${stage.interview ? candidateInterview(current) : ""}</section>` : ""}
          ${canEvaluate ? candidateEvaluation(current) : ""}
          ${canEvaluate && current.evaluation ? candidateNextStep(current) : ""}
          ${candidateHistory(current)}
          ${!candidateDecision && needsInterview ? candidateUndo(current) : ""}` : '<p class="workflow-empty">Select a candidate to view their application.</p>'}
      </section></div>`;
}

function saveCandidateBooking(form) {
  const { slot } = Object.fromEntries(new FormData(form));
  const id = recruitingQuery().get("candidate");
  const candidates = workflowState().candidates;
  const candidate = Object.hasOwn(candidates, id) ? candidates[id] : null;
  const interview = candidate?.interview;
  if (!candidate || !hiringStage(candidate)?.interview || !interview || interview.token !== recruitingQuery().get("invite")) {
    return showWorkflowError("This interview invitation is no longer active.");
  }
  if (interview.selectedSlot) return render();
  if (!interview.slots.includes(slot)) return showWorkflowError("Choose an available time.");
  interview.selectedSlot = slot;
  commitWorkflow("Interview time confirmed.");
  render();
}

function saveCandidateEvaluation(candidate, fields) {
  const notes = fields.notes?.trim();
  if (!Object.hasOwn(hiringRatings, fields.rating) || !notes || notes.length > 500) {
    return showWorkflowError("Select a rating and enter up to 500 characters of evaluation notes.");
  }
  candidate.evaluation = { rating: fields.rating, notes };
  commitWorkflow("Evaluation saved.");
  renderAndFocus("#hiring-decision");
}

function saveCandidateDecision(candidate, fields) {
  if (!candidate.evaluation || !candidateDecision || fields.decision !== candidateDecision) {
    return showWorkflowError("Save the current stage evaluation and choose a next step.");
  }
  const { next, alternatives } = candidateStageChoices(candidate);
  let target;
  let reason = fields.reason?.trim() ?? "";
  switch (candidateDecision) {
    case "advance":
      target = next;
      break;
    case "change":
      target = alternatives.find(stage => stage === fields.target);
      break;
    case "reject": {
      if (!Object.hasOwn(rejectionReasons, reason)) return showWorkflowError("Select a rejection reason.");
      const details = fields.details?.trim();
      if (reason === "other" && !details) return showWorkflowError("Enter a reason when selecting Other.");
      if (details?.length > 250) return showWorkflowError("Enter up to 250 characters of additional details.");
      reason = details ? `${rejectionReasons[reason]} · ${details}` : rejectionReasons[reason];
      target = "Rejected";
      break;
    }
    case "hire":
      target = "Hired";
      reason = "Hire confirmed.";
      break;
  }
  if (!target) return showWorkflowError("Choose a valid target stage.");
  if (target !== "Rejected" && (!reason || reason.length > 250)) {
    return showWorkflowError("Enter a reason of up to 250 characters before moving the candidate.");
  }
  recordCandidateStageChange(candidate, target, reason);
  commitWorkflow(target === "Hired" ? "Candidate hired." : target === "Rejected" ? "Candidate rejected." : `Moved to ${target}.`);
  renderAndFocus("#candidate-heading");
}

function recordCandidateStageChange(candidate, target, reason, undone) {
  candidate.history.push({
    id: crypto.randomUUID?.() ?? `stage-${Date.now()}`,
    from: candidate.stage, to: target, actor: people[currentUser], at: new Date().toISOString(),
    reason, evaluation: candidate.evaluation, interview: candidate.interview,
    ...(undone ? { reversesEventId: undone.id } : {})
  });
  candidate.stage = target;
  delete candidate.evaluation;
  delete candidate.interview;
  if (undone?.evaluation) candidate.evaluation = undone.evaluation;
  if (undone?.interview?.completed) candidate.interview = undone.interview;
  candidateDecision = "";
  recruitingStage = "";
}

function saveCandidateUndo(candidate, fields) {
  const last = undoableStageChange(candidate);
  if (!last || last.id !== fields.lastEvent || candidateDecision !== "undo") {
    return showWorkflowError("This stage change is no longer available to undo.");
  }
  const reason = fields.reason?.trim();
  if (reason?.length > 250) return showWorkflowError("Enter up to 250 characters for the undo reason.");
  recordCandidateStageChange(candidate, last.from, reason || "Stage change undone.", last);
  commitWorkflow(`Stage change undone. Returned to ${last.from}.`);
  renderAndFocus("#candidate-heading");
}

function saveCandidate(form, kind) {
  const fields = Object.fromEntries(new FormData(form));
  const candidate = workflowState().candidates[candidateSelection];
  if (!candidate || fields.candidate !== candidateSelection || fields.stage !== candidate.stage ||
      fields.lastEvent !== (candidate.history.at(-1)?.id ?? "") || !hiringStage(candidate)) {
    return showWorkflowError("This application has changed. Reopen it before continuing.");
  }
  if (kind === "candidate-undo") return saveCandidateUndo(candidate, fields);
  if (hiringStage(candidate).interview && !candidate.interview?.completed) {
    return showWorkflowError("Complete the interview before evaluating or moving this candidate.");
  }
  if (kind === "candidate-evaluate") saveCandidateEvaluation(candidate, fields);
  else saveCandidateDecision(candidate, fields);
}

function handleLeaveAction(action, value) {
  const selected = currentLeave();
  switch (action) {
    case "leave-tab":
      leaveTab = value;
      leaveDraft = null;
      reviewDecision = "";
      overlapScope = "team";
      break;
    case "leave-select":
      leaveSelection = value;
      leaveDraft = null;
      reviewDecision = "";
      overlapScope = "team";
      break;
    case "leave-new": {
      const day = nextWorkday();
      leaveDraft = { type: "annual", from: day, to: day, reason: "" };
      break;
    }
    case "leave-edit":
      if (leaveTab === "mine" && selected?.status === "Pending" && selected.person === currentUser) leaveDraft = { ...selected };
      break;
    case "leave-close":
      leaveDraft = null;
      break;
    case "leave-cancel":
      if (leaveTab === "mine" && selected?.status === "Pending" && selected.person === currentUser) {
        selected.status = "Cancelled";
        addLeaveEvent(selected, "Request cancelled", people[currentUser]);
        commitWorkflow("Leave request cancelled.");
      }
      break;
    case "overlap":
      overlapScope = value;
      break;
    case "leave-review":
      reviewDecision = value;
      break;
    case "review-close":
      reviewDecision = "";
      break;
  }
}

function handleGroupAction(action, value) {
  switch (action) {
    case "group-select":
      groupSelection = value;
      groupDraft = null;
      permissionPreview = false;
      break;
    case "group-edit":
      groupDraft = structuredClone(workflowState().groups[groupSelection]);
      break;
    case "group-cancel":
      groupDraft = null;
      break;
    case "group-dependencies":
      groupDraft.permissions.push(...missingPermissions(groupDraft));
      break;
    case "group-back":
      permissionPreview = false;
      break;
    case "group-save": {
      const issue = permissionIssue(groupDraft);
      if (issue) return showWorkflowError(issue);
      workflowState().groups[groupSelection] = groupDraft;
      groupDraft = null;
      permissionPreview = false;
      commitWorkflow("Permission group updated.");
      break;
    }
  }
}

function handleCandidateAction(action, value) {
  const candidates = workflowState().candidates;
  if (action === "candidate-select") {
    if (Object.hasOwn(candidates, value) && candidates[value].role === recruitingJob) {
      candidateSelection = value;
      candidateDecision = "";
      history.replaceState(null, "", recruitingLink(value));
    }
    return;
  }
  const candidate = candidates[candidateSelection];
  if (!candidate) return;
  if (action === "candidate-undo") {
    if (value === "continue") dismissedUndoId = undoableStageChange(candidate)?.id ?? "";
    else if (!value) candidateDecision = "";
    else if (undoableStageChange(candidate)?.id === value) candidateDecision = "undo";
  } else if (action === "candidate-invite" && hiringStage(candidate)?.interview && !candidate.interview) {
    const first = nextWorkday();
    const second = nextWorkday(first);
    candidate.interview = {
      token: crypto.randomUUID?.() ?? `interview-${Date.now()}`,
      slots: [dateAt(first, "10:00"), dateAt(first, "14:00"), dateAt(second, "11:00")].map(date => date.toISOString())
    };
    commitWorkflow("Scheduling link is ready.");
  } else if (action === "candidate-interview-complete" && hiringStage(candidate)?.interview && candidate.interview?.selectedSlot) {
    candidate.interview.completed = true;
    commitWorkflow("Interview marked complete.");
  } else if (action === "candidate-decision" && hiringStage(candidate) && candidate.evaluation) {
    if (["", "advance", "change", "reject", "hire"].includes(value)) candidateDecision = value;
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-workflow-action]");
  if (!button) return;
  const { workflowAction: action, value } = button.dataset;
  const permission = routeAccess[currentRoute];
  if (permission && !demoAccess(permission)) return;
  workflowError = "";
  if (currentRoute === "leave") handleLeaveAction(action, value);
  if (currentRoute === "permissions") handleGroupAction(action, value);
  if (currentRoute === "recruiting") handleCandidateAction(action, value);
  if (currentRoute === "hiring-workflows" || currentRoute === "job-postings") handleHiringSetupAction(action, value);
  render();
  if (action === "hiring-workflow-review-delete") {
    main.querySelector('[data-workflow-action="hiring-workflow-cancel-delete"]')?.focus();
    return;
  }
  if (action === "hiring-workflow-confirm-delete") {
    (main.querySelector('[data-workflow-action="hiring-workflow-view"], [data-workflow-action="hiring-workflow-new"]') || main).focus();
    return;
  }
  if (action === "hiring-stage-add") {
    main.querySelector(`[name="stage-${hiringWorkflowDraft.stages.length - 1}"]`)?.focus();
    return;
  }
  if (action === "hiring-stage-up" || action === "hiring-stage-down") {
    const index = Number(value) + (action === "hiring-stage-up" ? -1 : 1);
    main.querySelector(`[name="stage-${index}"]`)?.focus();
    return;
  }
  const target = [...main.querySelectorAll("[data-workflow-action]")].find(item =>
    item.dataset.workflowAction === action && item.dataset.value === value
  );
  (target || main.querySelector("form input:not([type=hidden]), form select, form textarea, form button") || main).focus({ preventScroll: true });
});

document.addEventListener("submit", event => {
  const form = event.target;
  const kind = form.dataset.workflowForm;
  if (!kind) return;
  event.preventDefault();
  const permission = routeAccess[currentRoute];
  if (permission && !demoAccess(permission)) return;
  if (kind === "leave") saveLeave(form);
  if (kind === "review") saveReview(form);
  if (currentRoute === "recruiting" && ["candidate-evaluate", "candidate-decision", "candidate-undo"].includes(kind)) saveCandidate(form, kind);
  if (currentRoute === "interview-scheduling" && kind === "candidate-book") saveCandidateBooking(form);
  if (currentRoute === "hiring-workflows" && kind === "hiring-workflow" && hiringWorkflowDraft) saveHiringWorkflow(form);
  if (currentRoute === "job-postings" && kind === "hiring-job" && jobDraft) saveHiringJob(form);
  if (kind === "permissions") {
    updatePermissionDraft(form);
    const issue = permissionIssue(groupDraft);
    if (issue) return showWorkflowError(issue);
    permissionPreview = true;
    workflowError = "";
    render();
    main.querySelector('[data-workflow-action="group-back"]').focus({ preventScroll: true });
  }
});

document.addEventListener("input", event => {
  const field = event.target;
  const form = field.form;
  if (!form || form.dataset.workflowForm !== "leave") return;
  const draft = readLeaveFields(form);
  Object.assign(leaveDraft, draft);
  if (field.name !== "reason") main.querySelector("#leave-projection").innerHTML = leaveProjection(leaveDraft);
});

document.addEventListener("change", event => {
  const field = event.target;
  const form = field.form;
  if (field.dataset.workflowField === "preview-person") {
    previewPerson = field.value;
    main.querySelector("#effective-access").innerHTML = effectiveAccess();
  }
  if (currentRoute === "recruiting" && demoAccess("hiring") && field.dataset.workflowField === "hiring-job") {
    if (!Object.hasOwn(workflowState().jobs, field.value)) return;
    recruitingJob = field.value;
    recruitingStage = "";
    candidateSelection = "";
    candidateDecision = "";
    workflowError = "";
    history.replaceState(null, "", `#recruiting?job=${encodeURIComponent(recruitingJob)}`);
    renderAndFocus("#hiring-job");
  }
  if (currentRoute === "recruiting" && demoAccess("hiring") && field.dataset.workflowField === "hiring-stage") {
    recruitingStage = field.value;
    const candidate = workflowState().candidates[candidateSelection];
    if (recruitingStage && candidate?.stage !== recruitingStage) {
      candidateSelection = "";
      candidateDecision = "";
      history.replaceState(null, "", `#recruiting?job=${encodeURIComponent(recruitingJob)}`);
    }
    renderAndFocus("#hiring-stage-filter");
  }
  if (currentRoute === "job-postings" && demoAccess("hiringSetup") && field.id === "job-workflow") {
    jobDraft = Object.fromEntries(new FormData(form));
    workflowError = "";
    renderAndFocus("#job-workflow");
  }
  if (form?.dataset.workflowForm === "permissions") {
    updatePermissionDraft(form);
    main.querySelector("#permission-dependencies").innerHTML = dependencyNotice(missingPermissions(groupDraft));
  }
});

window.addEventListener("storage", event => {
  if (event.key !== workflowKey) return;
  workflows = null;
  if (!leaveDraft && !reviewDecision && !groupDraft && !candidateDecision && !hiringWorkflowDraft && !jobDraft &&
      ["overview", ...Object.keys(workflowViews)].includes(currentRoute)) render();
});
