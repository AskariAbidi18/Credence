/**
 * pages/analytics.js — Document Processing Analytics
 *
 * Derives all analytics data from the backend database
 * through GET /api/applications.
 *
 * Uses Chart.js (CDN) for charts.
 * Shows an empty state when there is insufficient data.
 * Does NOT fabricate data.
 */

import { getApplications } from "../api.js";
import { setActiveNav, setBreadcrumb } from "../sidebar.js";
import { escHtml } from "./dashboard.js";

let chartInstances = [];
let analyticsData = {
  docs: [],
  stats: {
    total: 0,
    success: 0,
    partial: 0,
    failed: 0,
    avgConfidence: 0,
  },
};

export async function renderAnalytics() {
  setActiveNav("analytics");
  setBreadcrumb(["Credence", "Analytics"]);

  const content = document.getElementById("page-content");

  if (!content) return;

  content.className = "page-content page-enter";

  content.innerHTML = `
    <div class="page-loading" style="height:60vh;">
      <div class="spinner"></div>
      <span>Loading analytics...</span>
    </div>
  `;

  try {
    const applications = await getApplications();

    const docs = applications.flatMap((application) =>
      (application.documents || []).map((document) => ({
        ...document,
        application_id: application.id,
        applicant_name: application.applicant_name,
        uploaded_at: application.updated_at || application.created_at,
      })),
    );

    const stats = calculateStats(docs);

    analyticsData = {
      docs,
      stats,
    };

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-subtitle">
            Document processing insights from Credence
          </p>
        </div>

        ${
          docs.length > 0
            ? `
          <a href="#/upload" class="btn btn-primary btn-sm">
            <i data-lucide="upload" class="icon-sm"></i>
            Upload More
          </a>
        `
            : ""
        }
      </div>

      ${
        docs.length === 0
          ? renderEmptyAnalytics()
          : renderAnalyticsContent(docs, stats)
      }
    `;

    lucide.createIcons({ nodes: [content] });

    if (docs.length > 0) {
      initCharts(docs, stats);
    }

    window.removeEventListener("theme-change", handleThemeChange);

    window.addEventListener("theme-change", handleThemeChange);
  } catch (error) {
    console.error("Analytics load failed:", error);

    content.innerHTML = `
      <div class="empty-state" style="height:60vh;">
        <div class="empty-state-icon">
          <i data-lucide="circle-alert" class="icon-lg"></i>
        </div>

        <h3 class="empty-state-title">
          Unable to load analytics
        </h3>

        <p class="empty-state-desc">
          ${escHtml(error.message)}
        </p>
      </div>
    `;

    lucide.createIcons({ nodes: [content] });
  }
}

function handleThemeChange() {
  const { docs, stats } = analyticsData;

  if (!docs.length) return;

  // Only redraw if the Analytics page is currently visible.
  if (!document.getElementById("chart-by-type")) return;

  initCharts(docs, stats);
}

function calculateStats(docs) {
  const total = docs.length;

  const success = docs.filter(
    (doc) => doc.extraction_status === "success",
  ).length;

  const partial = docs.filter(
    (doc) => doc.extraction_status === "partial",
  ).length;

  const failed = docs.filter(
    (doc) => doc.extraction_status === "failed",
  ).length;

  const confidenceValues = docs
    .map((doc) => doc.extraction_confidence ?? doc.classification_confidence)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  const avgConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length
      : 0;

  return {
    total,
    success,
    partial,
    failed,
    avgConfidence,
  };
}
function getDocsByType(docs = analyticsData.docs) {
  return {
    payslip: docs.filter((doc) => doc.document_type === "payslip").length,

    bank_statement: docs.filter((doc) => doc.document_type === "bank_statement")
      .length,

    tax_return: docs.filter((doc) => doc.document_type === "tax_return").length,

    kyc: docs.filter((doc) => doc.document_type === "kyc").length,
  };
}

function renderEmptyAnalytics() {
  return `
    <div class="empty-state" style="height:55vh;">
      <div class="empty-state-icon">
        <i data-lucide="chart-area" class="icon-lg"></i>
      </div>
      <h3 class="empty-state-title">No data to analyse yet</h3>
      <p class="empty-state-desc">
        Upload and process documents to see analytics here. Charts will appear
        automatically once you have at least one processed document.
      </p>
      <a href="#/upload" class="btn btn-primary" style="margin-top:0.5rem;">
        <i data-lucide="upload" class="icon-sm"></i>
        Upload a Document
      </a>
    </div>
  `;
}

function renderAnalyticsContent(docs, stats) {
  const successRate =
    stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
  const avgConf =
    stats.avgConfidence != null ? Math.round(stats.avgConfidence * 100) : 0;

  return `
    <div class="session-banner" style="margin-bottom:1.25rem;">
      <i data-lucide="info" class="icon-sm" style="flex-shrink:0;"></i>
      <span>
  Analytics are derived from
  <strong>${docs.length}</strong>
  document(s) processed and stored by Credence.
</span>
    </div>

    <!-- Summary stats row -->
    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12); color:#818cf8;">
            <i data-lucide="files" class="icon-sm"></i>
          </div>
          Total Processed
        </div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-change">Documents</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background:rgba(16,185,129,0.12); color:#34d399;">
            <i data-lucide="trending-up" class="icon-sm"></i>
          </div>
          Success Rate
        </div>
        <div class="stat-value">${successRate}<span style="font-size:1.25rem; color:var(--fg-muted);">%</span></div>
        <div class="stat-change positive">${stats.success} successful</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12); color:#fbbf24;">
            <i data-lucide="cpu" class="icon-sm"></i>
          </div>
          Avg. Confidence
        </div>
        <div class="stat-value">${avgConf}<span style="font-size:1.25rem; color:var(--fg-muted);">%</span></div>
        <div class="stat-change">Extraction + classification</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          <div class="stat-icon" style="background:rgba(239,68,68,0.12); color:#f87171;">
            <i data-lucide="alert-circle" class="icon-sm"></i>
          </div>
          Needs Attention
        </div>
        <div class="stat-value">${stats.partial + stats.failed}</div>
        <div class="stat-change">${stats.partial} partial + ${stats.failed} failed</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="flex gap-4" style="flex-wrap:wrap; align-items:flex-start; margin-bottom:1.5rem;">

      <!-- Documents by Type (doughnut) -->
      <div class="card" style="flex:1; min-width:280px;">
        <div class="card-header">
          <div class="card-title">Documents by Type</div>
          <div class="card-description">Classification distribution</div>
        </div>
        <div class="card-content">
          <div class="chart-container" style="height:220px; display:flex; align-items:center; justify-content:center;">
            <canvas id="chart-by-type"></canvas>
          </div>
        </div>
      </div>

      <!-- Extraction Status (bar) -->
      <div class="card" style="flex:1; min-width:280px;">
        <div class="card-header">
          <div class="card-title">Extraction Status</div>
          <div class="card-description">Success vs partial vs failed</div>
        </div>
        <div class="card-content">
          <div class="chart-container" style="height:220px;">
            <canvas id="chart-status"></canvas>
          </div>
        </div>
      </div>

    </div>

    <!-- Confidence over time (line) -->
    ${
      docs.length >= 2
        ? `
      <div class="card" style="margin-bottom:1.5rem;">
        <div class="card-header">
          <div class="card-title">Confidence Over Time</div>
          <div class="card-description">Extraction confidence per document (newest first shown on right)</div>
        </div>
        <div class="card-content">
          <div class="chart-container" style="height:200px;">
            <canvas id="chart-confidence-time"></canvas>
          </div>
        </div>
      </div>
    `
        : ""
    }

    <!-- Confidence distribution histogram -->
    ${
      docs.length >= 3
        ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Confidence Distribution</div>
          <div class="card-description">How extraction confidence values are spread across all documents</div>
        </div>
        <div class="card-content">
          <div class="chart-container" style="height:180px;">
            <canvas id="chart-conf-dist"></canvas>
          </div>
        </div>
      </div>
    `
        : ""
    }
  `;
}

function initCharts(docs, stats) {
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.font.size = 12;

  // ── Chart 1: By Type (doughnut) ──────────────────────────
  const byType = getDocsByType();
  const typeCanvas = document.getElementById("chart-by-type");
  if (typeCanvas) {
    const typeChart = new Chart(typeCanvas, {
      type: "doughnut",
      data: {
        labels: ["Payslip", "Bank Statement", "Tax Return", "KYC"],
        datasets: [
          {
            data: [
              byType.payslip,
              byType.bank_statement,
              byType.tax_return,
              byType.kyc,
            ],
            backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6"],
            borderColor: isDark ? "#111827" : "#ffffff",
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "right",
            labels: { padding: 16, usePointStyle: true, pointStyle: "circle" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${ctx.label}: ${ctx.raw} doc${ctx.raw !== 1 ? "s" : ""}`,
            },
          },
        },
      },
    });
    chartInstances.push(typeChart);
  }

  // ── Chart 2: Status (horizontal bar) ─────────────────────
  const statusCanvas = document.getElementById("chart-status");
  if (statusCanvas) {
    const statusChart = new Chart(statusCanvas, {
      type: "bar",
      data: {
        labels: ["Success", "Partial", "Failed"],
        datasets: [
          {
            data: [stats.success, stats.partial, stats.failed],
            backgroundColor: [
              "rgba(16,185,129,0.8)",
              "rgba(245,158,11,0.8)",
              "rgba(239,68,68,0.8)",
            ],
            borderColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} document${ctx.raw !== 1 ? "s" : ""}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { stepSize: 1, precision: 0 },
          },
          y: { grid: { display: false } },
        },
      },
    });
    chartInstances.push(statusChart);
  }

  // ── Chart 3: Confidence over time ─────────────────────────
  const timeCanvas = document.getElementById("chart-confidence-time");
  if (timeCanvas && docs.length >= 2) {
    const ordered = [...docs].reverse(); // oldest first for time axis
    const labels = ordered.map((d, i) => `#${i + 1}`);
    const classData = ordered.map((d) =>
      Math.round(d.classification_confidence * 100),
    );
    const extData = ordered.map((d) =>
      d.extraction_confidence != null
        ? Math.round(d.extraction_confidence * 100)
        : null,
    );

    const timeChart = new Chart(timeCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Classification",
            data: classData,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.08)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#6366f1",
          },
          {
            label: "Extraction",
            data: extData,
            borderColor: "#10b981",
            backgroundColor: "transparent",
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { usePointStyle: true, pointStyle: "circle", padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${ctx.raw != null ? ctx.raw + "%" : "N/A"}`,
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor } },
          y: {
            grid: { color: gridColor },
            min: 0,
            max: 100,
            ticks: { callback: (v) => v + "%" },
          },
        },
      },
    });
    chartInstances.push(timeChart);
  }

  // ── Chart 4: Confidence distribution ─────────────────────
  const distCanvas = document.getElementById("chart-conf-dist");
  if (distCanvas && docs.length >= 3) {
    const buckets = {
      "0–59%": 0,
      "60–69%": 0,
      "70–79%": 0,
      "80–89%": 0,
      "90–100%": 0,
    };

    docs.forEach((d) => {
      const pct = Math.round(
        (d.extraction_confidence ?? d.classification_confidence) * 100,
      );
      if (pct < 60) buckets["0–59%"]++;
      else if (pct < 70) buckets["60–69%"]++;
      else if (pct < 80) buckets["70–79%"]++;
      else if (pct < 90) buckets["80–89%"]++;
      else buckets["90–100%"]++;
    });

    const distChart = new Chart(distCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(buckets),
        datasets: [
          {
            data: Object.values(buckets),
            backgroundColor: [
              "rgba(239,68,68,0.8)",
              "rgba(245,158,11,0.7)",
              "rgba(251,191,36,0.8)",
              "rgba(52,211,153,0.8)",
              "rgba(16,185,129,0.9)",
            ],
            borderRadius: 6,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: gridColor },
            ticks: { stepSize: 1, precision: 0 },
          },
        },
      },
    });
    chartInstances.push(distChart);
  }
}
