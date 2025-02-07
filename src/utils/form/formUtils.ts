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

export function debouncedValidate(
  input: HTMLInputElement,
  delay: number = 300,
): void {
  const debounced = debounce((inputElement: HTMLInputElement) => {
    validateField(inputElement);
  }, delay);

  debounced(input);
}

export function validateField(input: HTMLInputElement): void {
  const validationType = input.dataset.validationType;
  if (!validationType || !validationRules[validationType]) return;

  const value = input.value.trim();
  const rule = validationRules[validationType];
  const isValid = value.length === 0 || rule.validator(value);

  input.setAttribute("aria-invalid", (!isValid).toString());
  const errorId = `${input.id}-error`;
  const errorElement = document.getElementById(errorId);

  if (errorElement) {
    errorElement.textContent = isValid ? "" : rule.errorMessage;
    errorElement.hidden = isValid;
  }

  // Update form validity state
  updateFormValidity();
}

function updateFormValidity(): void {
  const form = document.getElementById('payment-form') as HTMLFormElement;
  const submitButton = form?.querySelector('.submit-button') as HTMLButtonElement;
  if (!form || !submitButton) return;

  const allInputsValid = Array.from(form.querySelectorAll('input[data-validation-type]'))
    .every((input: Element) => {
      const htmlInput = input as HTMLInputElement;
      return !htmlInput.getAttribute('aria-invalid') || htmlInput.getAttribute('aria-invalid') === 'false';
    });

  // Only update submit button if Braintree fields are not present
  // (Braintree component handles its own submit button state)
  if (!document.querySelector('.hosted-fields-wrapper')) {
    submitButton.disabled = !allInputsValid;
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
















