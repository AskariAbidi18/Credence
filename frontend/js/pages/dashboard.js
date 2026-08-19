/**
 * pages/dashboard.js
 *
 * Database-backed Credence dashboard.
 *
 * Source of truth:
 * GET /api/applications
 *
 * The dashboard is application-centric.
 * Documents are shown as part of the application pipeline.
 */

import { getApplications } from "../api.js";
import { navigate } from "../router.js";
import { setActiveNav, setBreadcrumb } from "../sidebar.js";


/* ============================================================
   PUBLIC PAGE RENDERER
   ============================================================ */

export async function renderDashboard() {
  setActiveNav("dashboard");
  setBreadcrumb(["Credence", "Dashboard"]);

  const content = document.getElementById("page-content");

  if (!content) return;

  content.className = "page-content page-enter";

  // Show loading state while fetching database state.
  content.innerHTML = `
    <div class="empty-state" style="height:60vh;">
      <div class="empty-state-icon">
        <span class="spinner"></span>
      </div>

      <h3 class="empty-state-title">
        Loading dashboard...
      </h3>

      <p class="empty-state-desc">
        Fetching applications and processing data.
      </p>
    </div>
  `;

  try {
    const applications = await getApplications();
    console.log("DASHBOARD APPLICATIONS:", applications);
    renderDashboardContent(content, applications);

  } catch (error) {
    console.error("Dashboard load failed:", error);

    content.innerHTML = `
      <div class="empty-state" style="height:60vh;">
        <div class="empty-state-icon">
          <i data-lucide="circle-alert" class="icon-lg"></i>
        </div>

        <h3 class="empty-state-title">
          Unable to load dashboard
        </h3>

        <p class="empty-state-desc">
          ${escHtml(error.message)}
        </p>

        <button
          type="button"
          class="btn btn-primary"
          id="dashboard-retry-btn"
        >
          <i data-lucide="refresh-cw" class="icon-sm"></i>
          Retry
        </button>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons({ nodes: [content] });
    }

    content
      .querySelector("#dashboard-retry-btn")
      ?.addEventListener("click", () => {
        renderDashboard();
      });
  }
}


/* ============================================================
   DASHBOARD CONTENT
   ============================================================ */

function renderDashboardContent(content, applications) {

  const stats = calculateStats(applications);

  const recentApplications = [...applications]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 7);

  content.innerHTML = `
    <div class="page-header">

      <div>
        <h1 class="page-title">
          Dashboard
        </h1>

        <p class="page-subtitle">
          AI-powered loan application processing overview
        </p>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        id="dashboard-new-application-btn"
      >
        <i data-lucide="plus" class="icon-sm"></i>
        New Application
      </button>

    </div>


    <!-- ======================================================
         STATS
         ====================================================== -->

    <div
      class="stats-grid"
      style="margin-bottom:1.5rem;"
    >

      ${renderStatCard(
        "Total Applications",
        stats.total,
        "files",
        "All applications"
      )}

      ${renderStatCard(
        "Approved",
        stats.approved,
        "check-circle",
        "Risk model approved"
      )}

      ${renderStatCard(
        "Review Required",
        stats.reviewRequired,
        "alert-triangle",
        "Needs human review"
      )}

      ${renderStatCard(
        "Rejected",
        stats.rejected,
        "x-circle",
        "Risk model rejected"
      )}

    </div>


    <!-- ======================================================
         PROCESSING OVERVIEW
         ====================================================== -->

    <div
      class="flex gap-4"
      style="
        flex-wrap:wrap;
        align-items:flex-start;
        margin-bottom:1.5rem;
      "
    >

      <div
        class="card"
        style="flex:1; min-width:260px;"
      >

        <div class="card-header">
          <div>
            <div class="card-title">
              Processing Overview
            </div>

            <div class="card-description">
              Current state across the application pipeline
            </div>
          </div>
        </div>

        <div class="card-content">

          ${renderPipelineRow(
            "Applications",
            stats.total,
            stats.total,
            "briefcase-business"
          )}

          ${renderPipelineRow(
            "Documents",
            stats.documents,
            stats.documents,
            "files"
          )}

          ${renderPipelineRow(
            "Validated",
            stats.validated,
            stats.total,
            "shield-check"
          )}

          ${renderPipelineRow(
            "Risk Assessed",
            stats.riskAssessed,
            stats.total,
            "chart-no-axes-combined"
          )}

          ${renderPipelineRow(
            "Summaries Generated",
            stats.summaries,
            stats.total,
            "sparkles"
          )}

        </div>

      </div>


      <!-- ====================================================
           DOCUMENT PROCESSING
           ==================================================== -->

      <div
        class="card"
        style="flex:1; min-width:260px;"
      >

        <div class="card-header">

          <div>
            <div class="card-title">
              Document Processing
            </div>

            <div class="card-description">
              Documents attached to applications
            </div>
          </div>

        </div>

        <div class="card-content">

          <div
            class="stat-value"
            style="
              font-size:2.5rem;
              margin-bottom:0.25rem;
            "
          >
            ${stats.documents}
          </div>

          <p class="text-sm text-muted">
            Documents processed across all applications
          </p>

          <div
            style="
              margin-top:1.25rem;
              padding-top:1rem;
              border-top:1px solid var(--border);
            "
          >

            ${renderDocumentBreakdown(stats.documentsByType)}

          </div>

        </div>

      </div>

    </div>


    <!-- ======================================================
         RECENT APPLICATIONS
         ====================================================== -->

    <div class="card">

      <div class="card-header">

        <div>
          <div class="card-title">
            Recent Applications
          </div>

          <div class="card-description">
            Latest loan applications in the system
          </div>
        </div>

        <button
          type="button"
          class="btn btn-outline btn-sm"
          id="dashboard-view-applications-btn"
        >
          View all
          <i data-lucide="chevron-right" class="icon-xs"></i>
        </button>

      </div>

      <div
        class="card-content"
        style="padding-top:0.75rem;"
      >

        ${
          recentApplications.length === 0
            ? `
              <div
                class="empty-state"
                style="padding:3rem 1rem;"
              >
                <div class="empty-state-icon">
                  <i data-lucide="inbox" class="icon-lg"></i>
                </div>

                <h3 class="empty-state-title">
                  No applications yet
                </h3>

                <p class="empty-state-desc">
                  Create your first loan application to begin processing.
                </p>
              </div>
            `
            : renderRecentApplications(recentApplications)
        }

      </div>

    </div>
  `;


  /* ============================================================
     EVENTS
     ============================================================ */

  content
    .querySelector("#dashboard-new-application-btn")
    ?.addEventListener("click", () => {
      navigate("/application/new");
    });

  content
    .querySelector("#dashboard-view-applications-btn")
    ?.addEventListener("click", () => {
      navigate("/applications");
    });


  content
    .querySelectorAll("[data-application-id]")
    .forEach((row) => {

      row.addEventListener("click", () => {

        const id = row.dataset.applicationId;

        if (id) {
          navigate(`/application/${id}`);
        }

      });

    });


  if (window.lucide) {
    lucide.createIcons({ nodes: [content] });
  }
}


/* ============================================================
   STATISTICS
   ============================================================ */

function calculateStats(applications) {

  const stats = {
    total: applications.length,

    approved: 0,
    rejected: 0,
    reviewRequired: 0,

    documents: 0,
    validated: 0,
    riskAssessed: 0,
    summaries: 0,

    documentsByType: {
      payslip: 0,
      bank_statement: 0,
      tax_return: 0,
      kyc: 0,
    },
  };


  for (const application of applications) {

    const status = String(
      application.status || ""
    ).toLowerCase();


    /* --------------------------------------------------------
       Application status
       -------------------------------------------------------- */

    if (status === "approved") {
      stats.approved++;
    }

    if (status === "rejected") {
      stats.rejected++;
    }

    if (
      status === "review_required" ||
      status === "review"
    ) {
      stats.reviewRequired++;
    }


    /* --------------------------------------------------------
       Documents
       -------------------------------------------------------- */

    const documents = application.documents || [];

    stats.documents += documents.length;

    for (const document of documents) {

      const type = document.document_type;

      if (
        Object.prototype.hasOwnProperty.call(
          stats.documentsByType,
          type
        )
      ) {
        stats.documentsByType[type]++;
      }

    }


    /* --------------------------------------------------------
       Pipeline stages
       -------------------------------------------------------- */

    if (application.validation) {
      stats.validated++;
    }

    if (application.risk_assessment) {
      stats.riskAssessed++;
    }

    if (application.summary) {
      stats.summaries++;
    }

  }


  return stats;
}


/* ============================================================
   UI HELPERS
   ============================================================ */

function renderStatCard(
  label,
  value,
  icon,
  description
) {

  return `
    <div class="stat-card">

      <div class="stat-label">

        <div
          class="stat-icon"
          style="
            background:rgba(99,102,241,0.12);
            color:#818cf8;
          "
        >
          <i
            data-lucide="${icon}"
            class="icon-sm"
          ></i>
        </div>

        ${label}

      </div>

      <div class="stat-value">
        ${value}
      </div>

      <div class="stat-change">
        ${description}
      </div>

    </div>
  `;
}


function renderPipelineRow(
  label,
  value,
  total,
  icon
) {

  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return `
    <div
      style="
        display:flex;
        align-items:center;
        gap:0.75rem;
        margin-bottom:1rem;
      "
    >

      <div
        style="
          width:2rem;
          height:2rem;
          border-radius:var(--radius);
          background:var(--bg-muted);
          border:1px solid var(--border);
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
        "
      >
        <i
          data-lucide="${icon}"
          class="icon-xs"
        ></i>
      </div>

      <div style="flex:1;">

        <div
          style="
            display:flex;
            justify-content:space-between;
            margin-bottom:0.375rem;
          "
        >

          <span class="text-sm">
            ${label}
          </span>

          <span
            class="text-xs font-semibold tabular-nums"
          >
            ${value}/${total}
          </span>

        </div>

        <div
          class="confidence-track"
          style="height:0.375rem;"
        >
          <div
            class="confidence-fill ${
              percentage >= 80
                ? "high"
                : percentage >= 50
                  ? "medium"
                  : "low"
            }"
            style="width:${percentage}%;"
          ></div>
        </div>

      </div>

    </div>
  `;
}


function renderDocumentBreakdown(byType) {

  const config = {
    payslip: {
      label: "Payslips",
      cls: "payslip",
    },

    bank_statement: {
      label: "Bank Statements",
      cls: "bank",
    },

    tax_return: {
      label: "Tax Returns",
      cls: "tax",
    },

    kyc: {
      label: "KYC",
      cls: "kyc",
    },
  };


  const total = Object.values(byType)
    .reduce(
      (sum, value) => sum + value,
      0
    );


  if (total === 0) {

    return `
      <p class="text-sm text-muted">
        No documents processed yet.
      </p>
    `;
  }


  return Object.entries(config)
    .filter(
      ([key]) =>
        byType[key] > 0
    )
    .map(([key, cfg]) => {

      const count = byType[key];

      const percentage =
        Math.round(
          (count / total) * 100
        );

      return `
        <div
          style="
            display:flex;
            align-items:center;
            gap:0.75rem;
            margin-bottom:0.625rem;
          "
        >

          <span
            class="doc-type-dot ${cfg.cls}"
          ></span>

          <span
            class="text-sm"
            style="flex:1;"
          >
            ${cfg.label}
          </span>

          <span
            class="text-xs font-semibold tabular-nums"
          >
            ${count}
          </span>

          <div
            class="confidence-track"
            style="
              width:4rem;
              height:0.375rem;
            "
          >
            <div
              class="confidence-fill high"
              style="width:${percentage}%;"
            ></div>
          </div>

        </div>
      `;

    })
    .join("");
}


function renderRecentApplications(applications) {

  const rows = applications
    .map((application) => {

      const status =
        String(
          application.status || "pending"
        ).toLowerCase();

      const statusClass =
        status === "approved"
          ? "badge-success"
          : status === "rejected"
            ? "badge-error"
            : status === "review_required"
              ? "badge-warning"
              : "badge-muted";


      const documentCount =
        (application.documents || []).length;


      return `
        <tr
          style="cursor:pointer;"
          data-application-id="${escHtml(application.id)}"
        >

          <td>

            <div
              class="table-filename"
            >

              <div
                class="table-filename-icon"
              >
                <i
                  data-lucide="user-round"
                  class="icon-xs"
                ></i>
              </div>

              <span
                class="truncate"
                style="max-width:180px;"
                title="${escHtml(application.applicant_name)}"
              >
                ${escHtml(
                  application.applicant_name ||
                  "Unnamed Applicant"
                )}
              </span>

            </div>

          </td>

          <td>
            <span class="badge badge-muted">
              ${escHtml(
                application.loan_type ||
                "—"
              )}
            </span>
          </td>

          <td>
            <span class="badge ${statusClass}">
              ${formatStatus(status)}
            </span>
          </td>

          <td class="tabular-nums text-center">
            ${documentCount}
          </td>

          <td class="text-muted text-xs">
            ${formatDate(application.created_at)}
          </td>

        </tr>
      `;
    })
    .join("");


  return `
    <div
      class="table-wrap"
      style="border-radius:var(--radius);"
    >

      <table>

        <thead>

          <tr>

            <th>
              Applicant
            </th>

            <th>
              Loan Type
            </th>

            <th>
              Status
            </th>

            <th>
              Documents
            </th>

            <th>
              Created
            </th>

          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    </div>
  `;
}


/* ============================================================
   FORMATTING
   ============================================================ */

function formatStatus(status) {

  const map = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    review_required: "Review Required",
    review: "Review",
  };

  return map[status] || capitalize(status);
}


function formatDate(value) {

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


export function capitalize(value) {

  if (!value) return "";

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


export function escHtml(value) {

  const element =
    document.createElement("div");

  element.textContent =
    String(value ?? "");

  return element.innerHTML;
}


/* ============================================================
   COMPATIBILITY HELPERS
   ============================================================ */

/*
 * upload.js currently imports these helpers from dashboard.js.
 * Keep them exported so we don't break the upload page while
 * replacing the old localStorage dashboard.
 */

export function formatRelativeTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

export function formatDocType(type) {

  const map = {
    payslip: "Payslip",
    bank_statement: "Bank Statement",
    tax_return: "Tax Return",
    kyc: "KYC",
  };

  return map[type] ?? type;
}


export function getTypeCls(type) {

  const map = {
    payslip: "payslip",
    bank_statement: "bank",
    tax_return: "tax",
    kyc: "kyc",
  };

  return map[type] ?? "muted";
}
