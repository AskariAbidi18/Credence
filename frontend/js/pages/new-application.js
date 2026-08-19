import { createApplication } from "../api.js";
import { setActiveNav, setBreadcrumb } from "../sidebar.js";
import { navigate } from "../router.js";
import { showToast } from "../toast.js";

export async function renderNewApplication() {
  setActiveNav("applications");
  setBreadcrumb(["Credence", "Applications", "New Application"]);

  const container = document.getElementById("page-content");

  if (!container) return;

  container.className = "page-content page-enter";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">LOAN PROCESSING</div>

        <h1 class="page-title">New Application</h1>

        <p class="page-subtitle">
          Create a loan application before uploading supporting documents.
        </p>
      </div>

      <button
        type="button"
        class="btn btn-ghost btn-sm"
        id="cancel-application-btn"
      >
        ← Applications
      </button>
    </div>

    <form id="new-application-form">

      <div class="application-detail-card">

        <h2>Applicant Information</h2>

        <p class="text-sm text-muted" style="margin-bottom:18px;">
          Basic information about the applicant and requested loan.
        </p>

        <div class="detail-grid">

          <div class="form-field">
            <label for="applicant-name">Applicant Name</label>
            <input
              id="applicant-name"
              name="applicant_name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div class="form-field">
            <label for="loan-type">Loan Type</label>
            <select id="loan-type" name="loan_type" required>
              <option value="">Select loan type</option>
              <option value="personal">Personal</option>
              <option value="home">Home</option>
              <option value="education">Education</option>
              <option value="vehicle">Vehicle</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-field">
            <label for="income-annum">Annual Income (₹)</label>
            <input
              id="income-annum"
              name="income_annum"
              type="number"
              min="0"
              step="1"
              placeholder="750000"
              required
            />
          </div>

          <div class="form-field">
            <label for="loan-amount">Loan Amount (₹)</label>
            <input
              id="loan-amount"
              name="loan_amount"
              type="number"
              min="0"
              step="1"
              placeholder="2500000"
              required
            />
          </div>

          <div class="form-field">
            <label for="loan-term">Loan Term (Years)</label>
            <input
              id="loan-term"
              name="loan_term"
              type="number"
              min="1"
              step="1"
              placeholder="15"
              required
            />
          </div>

          <div class="form-field">
            <label for="cibil-score">CIBIL Score</label>
            <input
              id="cibil-score"
              name="cibil_score"
              type="number"
              min="0"
              max="900"
              step="1"
              placeholder="780"
              required
            />
          </div>

        </div>

      </div>


      <div class="application-detail-card">

        <h2>Applicant Profile</h2>

        <p class="text-sm text-muted" style="margin-bottom:18px;">
          Additional information used by the risk assessment model.
        </p>

        <div class="detail-grid">

          <div class="form-field">
            <label for="dependents">Number of Dependents</label>
            <input
              id="dependents"
              name="no_of_dependents"
              type="number"
              min="0"
              step="1"
              placeholder="2"
            />
          </div>

          <div class="form-field">
            <label for="education">Education</label>
            <input
              id="education"
              name="education"
              type="text"
              placeholder="Graduate"
            />
          </div>

          <div class="form-field">
            <label for="self-employed">Self Employed</label>
            <select id="self-employed" name="self_employed">
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

        </div>

      </div>


      <div class="application-detail-card">

        <h2>Assets</h2>

        <p class="text-sm text-muted" style="margin-bottom:18px;">
          Declare the applicant's asset values.
        </p>

        <div class="detail-grid">

          <div class="form-field">
            <label for="residential-assets">
              Residential Assets (₹)
            </label>
            <input
              id="residential-assets"
              name="residential_assets_value"
              type="number"
              min="0"
              step="1"
              placeholder="6000000"
            />
          </div>

          <div class="form-field">
            <label for="commercial-assets">
              Commercial Assets (₹)
            </label>
            <input
              id="commercial-assets"
              name="commercial_assets_value"
              type="number"
              min="0"
              step="1"
              placeholder="0"
            />
          </div>

          <div class="form-field">
            <label for="luxury-assets">
              Luxury Assets (₹)
            </label>
            <input
              id="luxury-assets"
              name="luxury_assets_value"
              type="number"
              min="0"
              step="1"
              placeholder="500000"
            />
          </div>

          <div class="form-field">
            <label for="bank-assets">
              Bank Assets (₹)
            </label>
            <input
              id="bank-assets"
              name="bank_asset_value"
              type="number"
              min="0"
              step="1"
              placeholder="1500000"
            />
          </div>

        </div>

      </div>


      <div
        style="
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:18px;
        "
      >

        <button
          type="button"
          class="btn btn-ghost"
          id="cancel-application-bottom"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="btn btn-primary"
          id="create-application-btn"
        >
          Create Application
        </button>

      </div>

    </form>
  `;

  attachEvents(container);
}


function attachEvents(container) {

  const goBack = () => {
    navigate("/applications");
  };

  container
    .querySelector("#cancel-application-btn")
    ?.addEventListener("click", goBack);

  container
    .querySelector("#cancel-application-bottom")
    ?.addEventListener("click", goBack);

  const form = container.querySelector("#new-application-form");
  const button = container.querySelector("#create-application-btn");

  form?.addEventListener("submit", async (event) => {

    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    button.disabled = true;
    button.textContent = "Creating...";

    const value = (id) => {
      const input = container.querySelector(`#${id}`);
      return input?.value?.trim() ?? "";
    };

    const numberValue = (id) => {
      const raw = value(id);
      return raw === "" ? null : Number(raw);
    };

    const payload = {
      applicant_name: value("applicant-name"),

      loan_type: value("loan-type"),

      loan_data: {
        no_of_dependents: numberValue("dependents"),
        education: value("education") || null,
        self_employed: value("self-employed") || null,

        income_annum: numberValue("income-annum"),
        loan_amount: numberValue("loan-amount"),
        loan_term: numberValue("loan-term"),
        cibil_score: numberValue("cibil-score"),

        residential_assets_value:
          numberValue("residential-assets"),

        commercial_assets_value:
          numberValue("commercial-assets"),

        luxury_assets_value:
          numberValue("luxury-assets"),

        bank_asset_value:
          numberValue("bank-assets"),
      },
    };

    try {

      const application = await createApplication(payload);

      showToast(
        "Application created successfully.",
        "success",
        "Application created",
      );

      if (application?.id) {
        navigate(`/application/${application.id}`);
      } else {
        navigate("/applications");
      }

    } catch (error) {

      console.error(error);

      showToast(
        error.message,
        "error",
        "Application creation failed",
      );

      button.disabled = false;
      button.textContent = "Create Application";
    }
  });
}
