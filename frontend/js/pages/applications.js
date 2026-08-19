import { getApplications } from '../api.js';
import { setActiveNav, setBreadcrumb } from '../sidebar.js';
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

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

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

function statusClass(status) {
  switch (status) {
    case 'approved':
      return 'status-success';
    case 'rejected':
      return 'status-danger';
    case 'review_required':
      return 'status-warning';
    default:
      return 'status-neutral';
  }
}

function renderRow(application) {
  const loanData = application.loan_data || {};

  return `
    <div
      class="application-row"
      data-application-id="${application.id}"
    >
      <div class="application-main">
        <div class="application-avatar">
          ${(application.applicant_name || '?')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <div class="application-name">
            ${application.applicant_name || 'Unnamed Applicant'}
          </div>

          <div class="application-id">
            ${application.id}
          </div>
        </div>
      </div>

      <div>
        <span class="application-label">Loan</span>
        <strong>${loanData.loan_type || application.loan_type || '—'}</strong>
      </div>

      <div>
        <span class="application-label">Amount</span>
        <strong>${formatCurrency(loanData.loan_amount)}</strong>
      </div>

      <div>
        <span class="application-label">CIBIL</span>
        <strong>${loanData.cibil_score ?? '—'}</strong>
      </div>

      <div>
        <span class="status-badge ${statusClass(application.status)}">
          ${statusLabel(application.status)}
        </span>
      </div>

      <div>
        ${formatDate(application.created_at)}
      </div>

      <div>
        <i data-lucide="chevron-right" class="icon-sm"></i>
      </div>
    </div>
  `;
}

export async function renderApplications() {
  setActiveNav('applications');
  setBreadcrumb(['Credence', 'Applications']);

  const container = document.getElementById('page-content');

  if (!container) return;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">LOAN PROCESSING</div>

        <h1 class="page-title">Applications</h1>

        <p class="page-subtitle">
          Review and manage loan applications processed by Credence.
        </p>
      </div>
    </div>

    <div class="page-section">
      <div id="applications-content">
        <div class="page-loading">
          <div class="spinner"></div>
          <span>Loading applications...</span>
        </div>
      </div>
    </div>
  `;

  try {
    const applications = await getApplications();

    const content = document.getElementById(
      'applications-content'
    );

    if (!content) return;

    if (!applications.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="briefcase-business"></i>
          </div>

          <h3>No applications yet</h3>

          <p>
            Create a loan application to begin processing.
          </p>
        </div>
      `;

      if (window.lucide) {
        lucide.createIcons();
      }

      return;
    }

    content.innerHTML = `
      <div class="applications-toolbar">
        <span class="applications-count">
          ${applications.length}
          ${applications.length === 1
            ? 'application'
            : 'applications'}
        </span>
      </div>

      <div class="applications-table">
        <div class="applications-table-header">
          <span>Applicant</span>
          <span>Loan Type</span>
          <span>Amount</span>
          <span>CIBIL</span>
          <span>Status</span>
          <span>Created</span>
          <span></span>
        </div>

        <div class="applications-table-body">
          ${applications.map(renderRow).join('')}
        </div>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }

    content
      .querySelectorAll('.application-row')
      .forEach((row) => {
        row.addEventListener('click', () => {
          const id = row.dataset.applicationId;

          if (id) {
            navigate(`/application/${id}`);
          }
        });
      });

  } catch (error) {
    console.error(error);

    const content = document.getElementById(
      'applications-content'
    );

    if (!content) return;

    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="circle-alert"></i>
        </div>

        <h3>Unable to load applications</h3>

        <p>${error.message}</p>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }
  }
}
