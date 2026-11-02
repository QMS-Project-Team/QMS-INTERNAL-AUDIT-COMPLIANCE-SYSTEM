
import { useCallback, useEffect, useState } from "react";
import "../styles/AnnualAuditPlanPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const emptyForm = {
  audit_year: String(new Date().getFullYear()),
  cycle_1_start: "",
  cycle_1_end: "",
  cycle_2_start: "",
  cycle_2_end: "",
};

function planToForm(plan) {
  return {
    audit_year: String(plan.audit_year),
    cycle_1_start: plan.cycle_1_start,
    cycle_1_end: plan.cycle_1_end,
    cycle_2_start: plan.cycle_2_start,
    cycle_2_end: plan.cycle_2_end,
  };
}

export default function AnnualAuditPlanPage() {
  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedPlan = plans.find(
    (plan) => String(plan.audit_year) === form.audit_year
  );

  const getToken = () => localStorage.getItem("accessToken");

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in again to manage audit plans.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/audit-plans/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load audit plans (${response.status}).`
        );
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.results;

      if (!Array.isArray(items)) {
        throw new Error("Unexpected response while loading audit plans.");
      }

      setPlans(items);

      if (items.length > 0) {
        // Open the most recently listed plan by audit year.
        const latest = [...items].sort(
          (a, b) => Number(b.audit_year) - Number(a.audit_year)
        )[0];

        setForm(planToForm(latest));
      }
    } catch (err) {
      setError(err.message || "Unable to load audit plans.");
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function handleYearChange(event) {
    const year = event.target.value;

    setError("");
    setSuccess("");

    const existingPlan = plans.find(
      (plan) => String(plan.audit_year) === year
    );

    if (existingPlan) {
      // Show the previously saved dates.
      setForm(planToForm(existingPlan));
    } else {
      // Start with blank dates for a new year.
      setForm({
        ...emptyForm,
        audit_year: year,
      });
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function validateForm() {
    const year = Number(form.audit_year);

    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9999
    ) {
      return "Enter a valid audit year.";
    }

    const dates = [
      form.cycle_1_start,
      form.cycle_1_end,
      form.cycle_2_start,
      form.cycle_2_end,
    ];

    if (dates.some((date) => !date)) {
      return "Please fill in all four cycle dates.";
    }

    if (dates.some((date) => date.slice(0, 4) !== String(year))) {
      return "All dates must belong to the selected audit year.";
    }

    if (form.cycle_1_start > form.cycle_1_end) {
      return "Cycle 1 start date must not be after its end date.";
    }

    if (form.cycle_2_start > form.cycle_2_end) {
      return "Cycle 2 start date must not be after its end date.";
    }

    if (form.cycle_2_start <= form.cycle_1_end) {
      return "Cycle 2 must start after Cycle 1 ends.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setSaving(true);

    try {
      const isUpdating = Boolean(selectedPlan);

      const url = isUpdating
        ? `${API_BASE_URL}/api/audit-plans/${selectedPlan.id}/`
        : `${API_BASE_URL}/api/audit-plans/`;

      const response = await fetch(url, {
        method: isUpdating ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          audit_year: Number(form.audit_year),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = Object.entries(data)
          .map(([field, messages]) => {
            const message = Array.isArray(messages)
              ? messages.join(" ")
              : typeof messages === "string"
                ? messages
                : JSON.stringify(messages);

            return `${field}: ${message}`;
          })
          .join(" ");

        throw new Error(
          details || `Request failed (${response.status}).`
        );
      }

      // Refresh from the database so the saved plan ID and dates are current.
      const savedYear = String(data.audit_year);

      await fetchPlans();

      // Keep the user on the year they just saved.
      setForm(planToForm(data));

      setSuccess(
        `Annual audit plan for ${savedYear} ${
          isUpdating ? "updated" : "created"
        } successfully.`
      );
    } catch (err) {
      setError(err.message || "Unable to save the audit plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="annual-plan-page">
      <header className="annual-plan-heading">
        <div>
          <p className="annual-plan-eyebrow">QMS WORKSPACE</p>
          <h1>Annual Audit Plan</h1>
          <p>Create a new plan or update an existing audit schedule.</p>
        </div>

        <button
          type="button"
          className="annual-plan-cancel"
          onClick={fetchPlans}
          disabled={loadingPlans || saving}
        >
          {loadingPlans ? "Loading..." : "Refresh plans"}
        </button>
      </header>

      {loadingPlans ? (
        <div className="annual-plan-card">
          Loading existing audit plans...
        </div>
      ) : (
        <form className="annual-plan-card" onSubmit={handleSubmit}>
          <div className="annual-plan-card-heading">
            <div>
              <h2>
                {selectedPlan ? "Update annual plan" : "Create annual plan"}
              </h2>
              <p>
                {selectedPlan
                  ? `Editing the saved plan for ${selectedPlan.audit_year}.`
                  : "No plan exists for this year yet. Complete the dates to create one."}
              </p>
            </div>
          </div>

          <div className="annual-plan-form">
            <div className="annual-plan-field annual-plan-year">
              <label htmlFor="audit_year">Audit year</label>
              <input
                id="audit_year"
                name="audit_year"
                type="number"
                min="1900"
                max="9999"
                step="1"
                list="existing-audit-years"
                value={form.audit_year}
                onChange={handleYearChange}
                required
              />

              <datalist id="existing-audit-years">
                {plans.map((plan) => (
                  <option
                    key={plan.id}
                    value={plan.audit_year}
                  />
                ))}
              </datalist>

              <small>
                Existing years load their saved dates. Enter a new year
                to create a plan.
              </small>
            </div>

            <section className="audit-cycle-section">
              <div className="audit-cycle-heading">
                <span className="audit-cycle-number">01</span>
                <div>
                  <h3>Cycle 1</h3>
                  <p>First audit period</p>
                </div>
              </div>

              <div className="audit-cycle-fields">
                <div className="annual-plan-field">
                  <label htmlFor="cycle_1_start">Start date</label>
                  <input
                    id="cycle_1_start"
                    name="cycle_1_start"
                    type="date"
                    value={form.cycle_1_start}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="annual-plan-field">
                  <label htmlFor="cycle_1_end">End date</label>
                  <input
                    id="cycle_1_end"
                    name="cycle_1_end"
                    type="date"
                    value={form.cycle_1_end}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="audit-cycle-section">
              <div className="audit-cycle-heading">
                <span className="audit-cycle-number cycle-two">02</span>
                <div>
                  <h3>Cycle 2</h3>
                  <p>Second audit period</p>
                </div>
              </div>

              <div className="audit-cycle-fields">
                <div className="annual-plan-field">
                  <label htmlFor="cycle_2_start">Start date</label>
                  <input
                    id="cycle_2_start"
                    name="cycle_2_start"
                    type="date"
                    value={form.cycle_2_start}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="annual-plan-field">
                  <label htmlFor="cycle_2_end">End date</label>
                  <input
                    id="cycle_2_end"
                    name="cycle_2_end"
                    type="date"
                    value={form.cycle_2_end}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </section>
          </div>

          {error && (
            <div className="annual-plan-alert error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="annual-plan-alert success" role="status">
              {success}
            </div>
          )}

          <footer className="annual-plan-actions">
            <button
              type="button"
              className="annual-plan-cancel"
              onClick={() => {
                if (selectedPlan) {
                  setForm(planToForm(selectedPlan));
                } else {
                  setForm({
                    ...emptyForm,
                    audit_year: form.audit_year,
                  });
                }

                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              Reset dates
            </button>

            <button
              type="submit"
              className="annual-plan-submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : selectedPlan
                  ? "Update Plan"
                  : "Create Plan"}
            </button>
          </footer>
        </form>
      )}
    </main>
  );
}
    