import { debounce } from "../general";
import { validationRules } from "../validation/validationRules";

export function handleBillingAddressVisibility(
  sameAddressCheckbox: HTMLInputElement | null,
  billingAddressSection: HTMLElement | null,
): void {
  sameAddressCheckbox?.addEventListener("change", () => {
    billingAddressSection?.classList.toggle(
      "hidden",
      sameAddressCheckbox.checked,
    );
  });
}

export function handleSecurityInfoPopup(
  lockIcon: HTMLElement | null,
  speechBubble: HTMLElement | null,
): void {
  if (lockIcon && speechBubble) {
    lockIcon.addEventListener("click", (event) => {
      event.stopPropagation();
      speechBubble.toggleAttribute("hidden");
      speechBubble.setAttribute(
        "aria-hidden",
        speechBubble.hasAttribute("hidden").toString(),
      );
    });

    document.addEventListener("click", () => {
      if (!speechBubble.hasAttribute("hidden")) {
        speechBubble.setAttribute("hidden", "");
        speechBubble.setAttribute("aria-hidden", "true");
      }
    });
  }
}

export function validateField(input: HTMLInputElement, showError: boolean = false): boolean {
  const validationType = input.dataset.validationType;
  if (!validationType || !validationRules[validationType]) return true;

  const value = input.value.trim();
  const rule = validationRules[validationType];

  // Don't validate empty fields unless showError is true (form submission)
  if (value.length === 0 && !showError) return true;

    const isValid = rule.validator(value);

    if (showError) {
        input.setAttribute("aria-invalid", (!isValid).toString());
        input.setCustomValidity(isValid ? "" : rule.errorMessage);
        input.reportValidity();
    }

    return isValid;
}

export function validateForm(form: HTMLFormElement): boolean {
  const inputs = Array.from(form.querySelectorAll('input[data-validation-type]')) as HTMLInputElement[];
  let isFormValid = true;

  inputs.forEach(input => {
    const fieldValid = validateField(input, true); // Always show errors on form submission
    isFormValid = isFormValid && fieldValid;
  });

  return isFormValid;
}

function updateFormValidity(): void {
  const form = document.getElementById('payment-form') as HTMLFormElement;
  const submitButton = form?.querySelector('.submit-button') as HTMLButtonElement;
  if (!form || !submitButton) return;

  // Only update submit button if Braintree fields are not present
  if (!document.querySelector('.hosted-fields-wrapper')) {
    submitButton.disabled = !form.checkValidity();
  }
}

export function showError(message: string): void {
  const errorDiv = document.getElementById("checkout-error");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, 5000);
  }
}

export async function handleFormSubmission(event: SubmitEvent): Promise<
  | { status: "success"; url: string }
  | { status: "error"; message: string }
> {
  try {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!validateForm(form)) {
      return { status: "error", message: "Please fix the validation errors" };
    }

    const shippingForm = document.querySelector(
      "#shipping-address-form form",
    ) as HTMLFormElement;
    const billingForm = document.querySelector(
      "#billing-address-form form",
    ) as HTMLFormElement;
    const sameAddressCheckbox = document.querySelector(
      "#same-address",
    ) as HTMLInputElement;
    const emailInput = document.querySelector("#email") as HTMLInputElement;

    return { status: "error", message: "Implementation not completed" }; // Temporary return until implementation is complete
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    showError(errorMessage);
    return { status: "error", message: errorMessage };
  }
}
















