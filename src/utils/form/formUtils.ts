import { debounce } from "../general";

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

// Global error display function - centralized
export function showGlobalError(message: string): void {
  const event = new CustomEvent('show-global-error', { detail: { message } });
  document.dispatchEvent(event);
}

export async function handleFormSubmission(event: SubmitEvent): Promise<
  | { status: "success"; url: string }
  | { status: "error"; message: string }
> {
  try {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    
    // Use HTML5 form validation
    const isValid = form.checkValidity();

    if (!isValid) {
      // Find first invalid input and show native validation message
      const firstInvalid = form.querySelector(':invalid') as HTMLInputElement;
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.reportValidity();
      }
      return { status: "error", message: "Please fix the validation errors" };
    }

    // Rest of your form submission logic...
    return { status: "success", url: "/" }; // Replace with actual success URL

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    showGlobalError(errorMessage);
    return { status: "error", message: errorMessage };
  }
}