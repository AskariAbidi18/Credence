import {
  getApplication,
  uploadApplicationDocument,
  validateApplication,
  assessApplicationRisk,
  generateApplicationSummary,
} from '../api.js';

import {
  setActiveNav,
  setBreadcrumb,
} from '../sidebar.js';

import { navigate } from '../router.js';


function formatCurrency(value) {
  if (value == null) return '—';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}


function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}


function statusLabel(status) {
  switch (status) {
    case 'review_required':
      return 'Review Required';

    case 'approved':
      return 'Approved';

    case 'rejected':
      return 'Rejected';

    case 'pending':
      return 'Pending';

    default:
      return status || 'Unknown';
  }
}


function statusBadgeClass(status) {
  switch (status) {
    case 'approved':
      return 'badge-success';

    case 'rejected':
      return 'badge-error';

    case 'review_required':
      return 'badge-warning';

    default:
      return 'badge-neutral';
  }
}


function probability(value) {
  if (value == null) return '—';

  return `${(Number(value) * 100).toFixed(1)}%`;
}


function escapeHtml(value) {
  if (value == null) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function renderLoading(container, text = 'Loading application...') {
  container.innerHTML = `
    <div class="page-loading">
      <div class="spinner"></div>
      <span>${text}</span>
    </div>
  `;
}


function renderError(container, title, message) {
  container.innerHTML = `
    <div class="empty-state" style="min-height:50vh;">
      <div class="empty-state-icon">
        <i data-lucide="circle-alert" class="icon-lg"></i>
      </div>

      <h3 class="empty-state-title">
        ${escapeHtml(title)}
      </h3>

      <p class="empty-state-desc">
        ${escapeHtml(message)}
      </p>

      <button
        type="button"
        class="btn btn-primary"
        id="back-to-applications"
        style="margin-top:0.75rem;"
      >
        <i data-lucide="arrow-left" class="icon-sm"></i>
        Back to Applications
      </button>
    </div>
  `;

  if (window.lucide) {
    lucide.createIcons({ nodes: [container] });
  }

  container
    .querySelector('#back-to-applications')
    ?.addEventListener('click', () => {
      navigate('/applications');
    });
}


function renderDocuments(documents) {
  if (!documents || documents.length === 0) {
    return `
      <div class="empty-state" style="min-height:180px;">
        <div class="empty-state-icon">
          <i data-lucide="file-x" class="icon-md"></i>
        </div>

        <h3 class="empty-state-title">
          No documents attached
        </h3>

        <p class="empty-state-desc">
          Upload the required loan documents for this application.
        </p>
      </div>
    `;
  }

  return documents.map((doc) => `
    <div class="document-item">

      <div style="display:flex;align-items:center;gap:12px;min-width:0;">

        <div
          style="
            width:36px;
            height:36px;
            display:flex;
            align-items:center;
            justify-content:center;
            border:1px solid var(--border);
            border-radius:9px;
            background:var(--surface);
            flex-shrink:0;
          "
        >
          <i data-lucide="file-text" class="icon-sm"></i>
        </div>

        <div style="min-width:0;">
          <strong
            style="
              display:block;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            "
          >
            ${escapeHtml(doc.filename || 'Unnamed document')}
          </strong>

          <span style="display:block;margin-top:3px;">
            ${escapeHtml(doc.document_type || 'Unknown type')}
          </span>
        </div>

      </div>

      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">

        <span class="badge badge-success">
          ${escapeHtml(doc.extraction_status || 'unknown')}
        </span>

        ${
          doc.extraction_confidence != null
            ? `
              <span class="text-xs text-muted">
                ${(Number(doc.extraction_confidence) * 100).toFixed(0)}%
              </span>
            `
            : ''
        }

      </div>

    </div>
  `).join('');
}


function renderValidation(validation) {
  if (!validation) {
    return `
      <div class="empty-state" style="min-height:180px;">
        <div class="empty-state-icon">
          <i data-lucide="shield-question" class="icon-md"></i>
        </div>

        <h3 class="empty-state-title">
          Validation not run
        </h3>

        <p class="empty-state-desc">
          Run validation to check document completeness and consistency.
        </p>
      </div>
    `;
  }

  const flags = validation.flags || [];

  return `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:14px 16px;
          border:1px solid var(--border);
          border-radius:10px;
          background:var(--surface-elevated);
        "
      >
        <div>
          <div class="text-xs text-muted">
            VALIDATION RESULT
          </div>

          <div
            style="
              margin-top:5px;
              font-size:15px;
              font-weight:650;
            "
          >
            ${validation.passed ? 'Validation Passed' : 'Validation Failed'}
          </div>
        </div>

        <span class="badge ${
          validation.passed
            ? 'badge-success'
            : 'badge-error'
        }">
          ${validation.passed ? 'Passed' : 'Failed'}
        </span>
      </div>

      <div class="detail-grid">

        <div>
          <span>Confidence</span>
          <strong>
            ${
              validation.validation_confidence != null
                ? `${(
                    Number(validation.validation_confidence) * 100
                  ).toFixed(0)}%`
                : '—'
            }
          </strong>
        </div>

        <div>
          <span>Flags</span>
          <strong>${flags.length}</strong>
        </div>

        <div>
          <span>Missing Documents</span>
          <strong>
            ${
              validation.missing_documents?.length || 0
            }
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            ${validation.passed ? 'Clear' : 'Issues Found'}
          </strong>
        </div>

      </div>

      ${
        validation.missing_documents?.length
          ? `
            <div>
              <div class="text-xs text-muted" style="margin-bottom:8px;">
                MISSING DOCUMENTS
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${validation.missing_documents.map(
                  (doc) => `
                    <span class="badge badge-warning">
                      ${escapeHtml(doc)}
                    </span>
                  `
                ).join('')}
              </div>
            </div>
          `
          : ''
      }

      ${
        flags.length
          ? `
            <div>
              <div class="text-xs text-muted" style="margin-bottom:8px;">
                VALIDATION FLAGS
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;">
                ${flags.map(
                  (flag) => `
                    <div
                      style="
                        padding:13px 15px;
                        border:1px solid var(--border);
                        border-radius:9px;
                        background:var(--surface-elevated);
                      "
                    >
                      <div
                        style="
                          display:flex;
                          justify-content:space-between;
                          gap:12px;
                          align-items:flex-start;
                        "
                      >
                        <strong>
                          ${escapeHtml(flag.title)}
                        </strong>

                        <span class="badge ${
                          flag.severity === 'critical'
                            ? 'badge-error'
                            : 'badge-warning'
                        }">
                          ${escapeHtml(flag.severity)}
                        </span>
                      </div>

                      <p style="margin-top:7px;">
                        ${escapeHtml(flag.reason)}
                      </p>
                    </div>
                  `
                ).join('')}
              </div>
            </div>
          `
          : `
            <p>
              No validation flags were found.
            </p>
          `
      }

    </div>
  `;
}


function renderRisk(risk) {
  if (!risk) {
    return `
      <div class="empty-state" style="min-height:180px;">
        <div class="empty-state-icon">
          <i data-lucide="chart-no-axes-combined" class="icon-md"></i>
        </div>

        <h3 class="empty-state-title">
          Risk assessment not run
        </h3>

        <p class="empty-state-desc">
          Run the risk model to generate an approval decision.
        </p>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:16px;
          border:1px solid var(--border);
          border-radius:10px;
          background:var(--surface-elevated);
        "
      >
        <div>
          <div class="text-xs text-muted">
            MODEL DECISION
          </div>

          <div
            style="
              margin-top:5px;
              font-size:20px;
              font-weight:700;
            "
          >
            ${escapeHtml(risk.decision || 'Unknown')}
          </div>
        </div>

        <span class="badge ${
          risk.decision === 'Approved'
            ? 'badge-success'
            : 'badge-error'
        }">
          ${escapeHtml(risk.decision || 'Unknown')}
        </span>
      </div>

      <div class="detail-grid">

        <div>
          <span>Approval Probability</span>
          <strong>
            ${probability(risk.approval_probability)}
          </strong>
        </div>

        <div>
          <span>Rejection Probability</span>
          <strong>
            ${probability(risk.rejection_probability)}
          </strong>
        </div>

      </div>

    </div>
  `;
}


function renderSummary(summary) {
  if (!summary) {
    return `
      <div class="empty-state" style="min-height:180px;">
        <div class="empty-state-icon">
          <i data-lucide="sparkles" class="icon-md"></i>
        </div>

        <h3 class="empty-state-title">
          AI summary not generated
        </h3>

        <p class="empty-state-desc">
          Run the risk assessment first, then generate the reviewer summary.
        </p>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:18px;">

      ${
        summary.overall_assessment
          ? `
            <div>
              <div class="text-xs text-muted" style="margin-bottom:7px;">
                OVERALL ASSESSMENT
              </div>

              <p>
                ${escapeHtml(summary.overall_assessment)}
              </p>
            </div>
          `
          : ''
      }

      ${
        summary.income_assessment
          ? `
            <div>
              <div class="text-xs text-muted" style="margin-bottom:7px;">
                INCOME ASSESSMENT
              </div>

              <p>
                ${escapeHtml(summary.income_assessment)}
              </p>
            </div>
          `
          : ''
      }

      <div class="detail-grid">

        <div>
          <span>Risk Level</span>
          <strong>
            ${escapeHtml(summary.risk_level || '—')}
          </strong>
        </div>

        <div>
          <span>Model Risk</span>
          <strong>
            ${escapeHtml(summary.model_risk || '—')}
          </strong>
        </div>

        <div>
          <span>Recommendation</span>
          <strong>
            ${escapeHtml(summary.recommendation || '—')}
          </strong>
        </div>

        <div>
          <span>Review Required</span>
          <strong>
            ${summary.review_required ? 'Yes' : 'No'}
          </strong>
        </div>

      </div>

      ${
        summary.reviewer_summary
          ? `
            <div
              style="
                padding:16px;
                border:1px solid var(--border);
                border-radius:10px;
                background:var(--surface-elevated);
              "
            >
              <div class="text-xs text-muted" style="margin-bottom:8px;">
                REVIEWER SUMMARY
              </div>

              <p>
                ${escapeHtml(summary.reviewer_summary)}
              </p>
            </div>
          `
          : ''
      }

      ${
        summary.review_reasons?.length
          ? `
            <div>
              <div class="text-xs text-muted" style="margin-bottom:8px;">
                REVIEW REASONS
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${summary.review_reasons.map(
                  (reason) => `
                    <span class="badge badge-warning">
                      ${escapeHtml(reason)}
                    </span>
                  `
                ).join('')}
              </div>
            </div>
          `
          : ''
      }

    </div>
  `;
}


function renderApplication(container, application) {
  const loan = application.loan_data || {};

  container.innerHTML = `
    <div class="page-header">

      <div>
        <div class="eyebrow">
          LOAN APPLICATION
        </div>

        <h1 class="page-title">
          ${escapeHtml(
            application.applicant_name || 'Unnamed Applicant'
          )}
        </h1>

        <p class="page-subtitle">
          Application ID:
          <span class="font-mono">
            ${escapeHtml(application.id)}
          </span>
        </p>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        "
      >
        <span class="badge ${statusBadgeClass(application.status)}">
          ${escapeHtml(statusLabel(application.status))}
        </span>

        <button
          type="button"
          class="btn btn-ghost btn-sm"
          id="back-applications-btn"
        >
          <i data-lucide="arrow-left" class="icon-sm"></i>
          Applications
        </button>
      </div>

    </div>


    <!-- ======================================================
         APPLICATION OVERVIEW
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        "
      >
        <div>
          <h2 style="margin-bottom:4px;">
            Application Overview
          </h2>

          <p class="text-sm text-muted">
            Core applicant and loan information.
          </p>
        </div>
      </div>

      <div class="detail-grid">

        <div>
          <span>Applicant</span>
          <strong>
            ${escapeHtml(application.applicant_name || '—')}
          </strong>
        </div>

        <div>
          <span>Loan Type</span>
          <strong>
            ${escapeHtml(application.loan_type || '—')}
          </strong>
        </div>

        <div>
          <span>Loan Amount</span>
          <strong>
            ${formatCurrency(loan.loan_amount)}
          </strong>
        </div>

        <div>
          <span>Loan Term</span>
          <strong>
            ${loan.loan_term ?? '—'} years
          </strong>
        </div>

        <div>
          <span>Annual Income</span>
          <strong>
            ${formatCurrency(loan.income_annum)}
          </strong>
        </div>

        <div>
          <span>CIBIL Score</span>
          <strong>
            ${loan.cibil_score ?? '—'}
          </strong>
        </div>

        <div>
          <span>Dependents</span>
          <strong>
            ${loan.no_of_dependents ?? '—'}
          </strong>
        </div>

        <div>
          <span>Created</span>
          <strong>
            ${formatDate(application.created_at)}
          </strong>
        </div>

      </div>

    </div>


    <!-- ======================================================
         ACTIONS
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin-bottom:4px;">
            Processing Actions
          </h2>

          <p class="text-sm text-muted">
            Run the deterministic validation, risk model and AI reviewer summary.
          </p>
        </div>

        <div
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          "
        >

          <button
            type="button"
            class="btn btn-secondary btn-sm"
            id="validate-btn"
          >
            <i data-lucide="shield-check" class="icon-sm"></i>
            Run Validation
          </button>

          <button
            type="button"
            class="btn btn-secondary btn-sm"
            id="risk-btn"
          >
            <i data-lucide="chart-no-axes-combined" class="icon-sm"></i>
            Run Risk Assessment
          </button>

          <button
            type="button"
            class="btn btn-primary btn-sm"
            id="summary-btn"
          >
            <i data-lucide="sparkles" class="icon-sm"></i>
            Generate Summary
          </button>

        </div>

      </div>

    </div>


    <!-- ======================================================
         DOCUMENTS
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin-bottom:4px;">
            Documents
          </h2>

          <p class="text-sm text-muted">
            Documents attached to this loan application.
          </p>
        </div>

        <label
          for="application-document-input"
          class="btn btn-primary btn-sm"
          style="cursor:pointer;"
        >
          <i data-lucide="upload" class="icon-sm"></i>
          Upload Document
        </label>

        <input
          id="application-document-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          hidden
        />

      </div>

      <div id="documents-section">
        ${renderDocuments(application.documents)}
      </div>

    </div>


    <!-- ======================================================
         VALIDATION
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin-bottom:4px;">
            Validation
          </h2>

          <p class="text-sm text-muted">
            Deterministic document and application checks.
          </p>
        </div>

      </div>

      <div id="validation-section">
        ${renderValidation(application.validation)}
      </div>

    </div>


    <!-- ======================================================
         RISK
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin-bottom:4px;">
            Risk Assessment
          </h2>

          <p class="text-sm text-muted">
            ML model decision and approval probabilities.
          </p>
        </div>

      </div>

      <div id="risk-section">
        ${renderRisk(application.risk_assessment)}
      </div>

    </div>


    <!-- ======================================================
         AI SUMMARY
         ====================================================== -->

    <div class="application-detail-card">

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin-bottom:4px;">
            AI Reviewer Summary
          </h2>

          <p class="text-sm text-muted">
            Explainable summary generated from the authoritative application results.
          </p>
        </div>

      </div>

      <div id="summary-section">
        ${renderSummary(application.summary)}
      </div>

    </div>
  `;

  if (window.lucide) {
    lucide.createIcons({ nodes: [container] });
  }

  attachApplicationEvents(container, application.id);
}


function setButtonLoading(button, loadingText) {
  if (!button) return;

  button.dataset.originalText = button.innerHTML;
  button.disabled = true;

  button.innerHTML = `
    <span class="spinner spinner-sm"></span>
    ${loadingText}
  `;
}


function restoreButton(button) {
  if (!button) return;

  button.disabled = false;

  if (button.dataset.originalText) {
    button.innerHTML = button.dataset.originalText;
  }

  if (window.lucide) {
    lucide.createIcons({ nodes: [button] });
  }
}


function attachApplicationEvents(container, applicationId) {

  /* ----------------------------------------------------------
     Back button
     ---------------------------------------------------------- */

  container
    .querySelector('#back-applications-btn')
    ?.addEventListener('click', () => {
      navigate('/applications');
    });


  /* ----------------------------------------------------------
     Validation
     ---------------------------------------------------------- */

  container
    .querySelector('#validate-btn')
    ?.addEventListener('click', async () => {

      const button = container.querySelector('#validate-btn');

      try {
        setButtonLoading(button, 'Validating...');

        const result = await validateApplication(applicationId);

        renderApplication(container, result);

      } catch (error) {
        console.error(error);

        alert(
          `Validation failed: ${error.message}`
        );

      } finally {
        restoreButton(button);
      }
    });


  /* ----------------------------------------------------------
     Risk assessment
     ---------------------------------------------------------- */

  container
    .querySelector('#risk-btn')
    ?.addEventListener('click', async () => {

      const button = container.querySelector('#risk-btn');

      try {
        setButtonLoading(button, 'Assessing...');

        const result = await assessApplicationRisk(applicationId);

        renderApplication(container, result);

      } catch (error) {
        console.error(error);

        alert(
          `Risk assessment failed: ${error.message}`
        );

      } finally {
        restoreButton(button);
      }
    });


  /* ----------------------------------------------------------
     AI summary
     ---------------------------------------------------------- */

  container
    .querySelector('#summary-btn')
    ?.addEventListener('click', async () => {

      const button = container.querySelector('#summary-btn');

      try {
        setButtonLoading(button, 'Generating...');

        const result = await generateApplicationSummary(
          applicationId
        );

        renderApplication(container, result);

      } catch (error) {
        console.error(error);

        alert(
          `Summary generation failed: ${error.message}`
        );

      } finally {
        restoreButton(button);
      }
    });


  /* ----------------------------------------------------------
     Application document upload
     ---------------------------------------------------------- */

  container
    .querySelector('#application-document-input')
    ?.addEventListener('change', async (event) => {

      const input = event.target;
      const file = input.files?.[0];

      if (!file) return;

      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(
          'Please upload a PDF, PNG or JPEG document.'
        );

        input.value = '';
        return;
      }

      try {

        const label = container.querySelector(
          'label[for="application-document-input"]'
        );

        if (label) {
          label.dataset.originalText = label.innerHTML;

          label.style.pointerEvents = 'none';

          label.innerHTML = `
            <span class="spinner spinner-sm"></span>
            Processing...
          `;
        }

        const result = await uploadApplicationDocument(
          applicationId,
          file,
        );

        console.log(
          'Application document uploaded:',
          result,
        );

        /*
         * The upload endpoint returns the extracted document.
         * Fetch the application again so the newly persisted
         * document is displayed from the database.
         */

        const updatedApplication =
          await getApplication(applicationId);

        renderApplication(
          container,
          updatedApplication,
        );

      } catch (error) {

        console.error(error);

        alert(
          `Document upload failed: ${error.message}`
        );

      } finally {

        input.value = '';

        const label = container.querySelector(
          'label[for="application-document-input"]'
        );

        if (label) {
          label.style.pointerEvents = '';

          if (label.dataset.originalText) {
            label.innerHTML =
              label.dataset.originalText;
          }

          if (window.lucide) {
            lucide.createIcons({
              nodes: [label],
            });
          }
        }
      }
    });
}


/* ============================================================
   PUBLIC PAGE RENDERER
   ============================================================ */

export async function renderApplicationDetail(id) {

  setActiveNav('applications');

  setBreadcrumb([
    'Credence',
    'Applications',
    'Details',
  ]);

  const container =
    document.getElementById('page-content');

  if (!container) return;

  container.className =
    'page-content page-enter';

  renderLoading(
    container,
    'Loading application...',
  );

  try {

    const application =
      await getApplication(id);

    renderApplication(
      container,
      application,
    );

  } catch (error) {

    console.error(error);

    renderError(
      container,
      'Unable to load application',
      error.message,
    );
  }
}
