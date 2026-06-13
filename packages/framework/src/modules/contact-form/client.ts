export interface EnhanceOptions {
  fetch?: typeof fetch;
}

/**
 * Progressive-enhancement script for the contact-form module.
 *
 * Intercepts form submission, POSTs JSON to the form's action URL, and
 * renders either the embedded success message (on 200) or an inline error
 * (on non-200) without navigating the page.
 *
 * If JS doesn't run (this script is missing, blocked, or errors), the form
 * still works — the browser does a standard HTML POST to `action`.
 */
export function enhanceContactForm(
  form: HTMLFormElement,
  options: EnhanceOptions = {},
): void {
  if (form.dataset.fcEnhanced === "true") return;
  form.dataset.fcEnhanced = "true";

  const doFetch = options.fetch ?? form.ownerDocument.defaultView?.fetch ?? globalThis.fetch;
  if (typeof doFetch !== "function") return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit(form, doFetch);
  });
}

async function submit(form: HTMLFormElement, doFetch: typeof fetch): Promise<void> {
  clearError(form);
  const doc = form.ownerDocument;
  const root = form.closest<HTMLElement>("[data-fc-contact-form-root]") ?? form.parentElement ?? form;
  const submitBtn = form.querySelector<HTMLButtonElement>("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  const data = formToObject(form);

  try {
    const response = await doFetch(form.action, {
      method: form.method?.toUpperCase() || "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const successTpl = root.querySelector<HTMLElement>(
        "[data-fc-success-message]",
      );
      const successHtml = successTpl?.innerHTML.trim() ?? "<p>Thanks — we'll be in touch.</p>";
      const successEl = doc.createElement("div");
      successEl.className = "fc-contact-form__success";
      successEl.setAttribute("role", "status");
      successEl.innerHTML = successHtml;
      form.replaceWith(successEl);
      return;
    }

    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      /* non-JSON body, keep the default message */
    }
    showError(form, message);
  } catch {
    showError(form, "Network error — please try again.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function formToObject(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  const fd = new FormData(form);
  fd.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

function clearError(form: HTMLFormElement): void {
  form.querySelectorAll(".fc-contact-form__error").forEach((el) => el.remove());
}

function showError(form: HTMLFormElement, message: string): void {
  clearError(form);
  const el = form.ownerDocument.createElement("p");
  el.className = "fc-contact-form__error";
  el.setAttribute("role", "alert");
  el.textContent = message;
  form.append(el);
}

/**
 * Enhance every contact-form on the page that hasn't already been enhanced.
 * Call from the site's client entry script (or import as a side-effect via
 * a wrapper module that calls this on DOMContentLoaded).
 */
export function wireContactForms(
  root: ParentNode = document,
  options: EnhanceOptions = {},
): void {
  root
    .querySelectorAll<HTMLFormElement>("form[data-fc-contact-form]")
    .forEach((form) => enhanceContactForm(form, options));
}
