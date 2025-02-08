import { debounce } from "../general";
import { validationRules } from "../validation/validationRules";

// Cache validation results
const validationCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export function validateField(
  input: HTMLInputElement,
  showError: boolean = false
): boolean {
  const validationType = input.dataset.validationType;
  if (!validationType || !validationRules[validationType]) return true;

  const value = input.value.trim();
  const rule = validationRules[validationType];

  // Skip validation if field is empty and not required
  if (value.length === 0 && !input.required) {
    input.setCustomValidity("");
    return true;
  }

  const isValid = rule.validator(value);

  // Always set the validation message when validating
  input.setCustomValidity(isValid ? "" : rule.errorMessage);
  input.setAttribute("aria-invalid", (!isValid).toString());

  return isValid;
}

export function debouncedValidate(
  input: HTMLInputElement,
  delay: number = 300
): void {
  const debounced = debounce((inputElement: HTMLInputElement) => {
    validateField(inputElement);
  }, delay);

  debounced(input);
}

export const handleBillingAddressVisibility = debounce((
  sameAddressCheckbox: HTMLInputElement | null,
  billingAddressSection: HTMLElement | null
): void => {
  if (!sameAddressCheckbox || !billingAddressSection) return;

  const isHidden = sameAddressCheckbox.checked;
  billingAddressSection.classList.toggle("hidden", isHidden);
  billingAddressSection.setAttribute("aria-hidden", isHidden.toString());

  // Handle required attributes on billing fields
  const billingFields = billingAddressSection.querySelectorAll("input");
  billingFields.forEach(field => {
    if (field instanceof HTMLInputElement) {
      field.required = !isHidden;
    }
  });
}, 100);

export const handleSecurityInfoPopup = debounce((
  lockIcon: HTMLElement | null,
  speechBubble: HTMLElement | null
): void => {
  if (!lockIcon || !speechBubble) return;

  const clickHandler = (event: Event) => {
    event.stopPropagation();
    speechBubble.hidden = !speechBubble.hidden;
    speechBubble.setAttribute("aria-hidden", speechBubble.hidden.toString());
  };

  const documentClickHandler = (event: Event) => {
    if (!speechBubble.contains(event.target as Node) &&
      !lockIcon.contains(event.target as Node)) {
      speechBubble.hidden = true;
      speechBubble.setAttribute("aria-hidden", "true");
    }
  };

  // Clean up old listeners
  lockIcon.removeEventListener("click", clickHandler);
  document.removeEventListener("click", documentClickHandler);

  // Add new listeners
  lockIcon.addEventListener("click", clickHandler);
  document.addEventListener("click", documentClickHandler);
}, 100);

export function formatCardNumber(input: HTMLInputElement): void {
  const value = input.value.replace(/\s/g, "");
  input.value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
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
    const inputs = Array.from(form.querySelectorAll("input[data-validation-type]")) as HTMLInputElement[];

    // Validate all fields and show errors
    const isValid = inputs.every(input => validateField(input, true));

    if (!isValid) {
      // Find first invalid input and focus it
      const firstInvalid = inputs.find(input => !input.validity.valid);
      firstInvalid?.focus();
      return { status: "error", message: "Please fix the validation errors" };
    }

    // Rest of your form submission logic...
    return { status: "success", url: "/" }; // Replace with actual success URL

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    showError(errorMessage);
    return { status: "error", message: errorMessage };
  }
}
















