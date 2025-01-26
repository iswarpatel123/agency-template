import { debounce, validationRules } from "./formValidation";
import {
  getSelectedItems,
  getAddressData,
  calculateTotalAmount,
  createCheckoutSession,
} from "./checkout-helpers";
import type { CheckoutError } from "../types/checkout";

export function handleBillingAddressVisibility(
  sameAddressCheckbox: HTMLInputElement,
  billingAddressSection: HTMLElement,
) {
  sameAddressCheckbox?.addEventListener("change", () => {
    billingAddressSection?.classList.toggle(
      "hidden",
      sameAddressCheckbox.checked,
    );
  });
}

export function handleSecurityInfoPopup(
  lockIcon: HTMLElement,
  speechBubble: HTMLElement,
) {
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

export const debouncedValidate = debounce((input: HTMLInputElement) => {
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
}, 300);

export function validateField(input: HTMLInputElement) {
  const value = input.value;
  const validationType = input.dataset.validationType;

  if (!validationType) return;

  const rule = validationRules[validationType];

  const isFieldValid = rule.validator(value);
  input.classList.toggle("valid", isFieldValid);
  input.classList.toggle("invalid", !isFieldValid);

  // Set custom validity message for HTML5 validation
  input.setCustomValidity(isFieldValid ? "" : rule.errorMessage);
  // Don't show the error message immediately
  // input.reportValidity();
}

export function formatCardNumber(input: HTMLInputElement) {
  const value = input.value.replace(/\s/g, "");
  input.value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function showError(message: string) {
  const errorDiv = document.getElementById("checkout-error");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, 5000);
  }
}

export async function handleFormSubmission(event: SubmitEvent) {
  event.preventDefault();

  let checkoutInProgress = false;

  if (checkoutInProgress) {
    return;
  }

  try {
    checkoutInProgress = true;
    const form = event.target as HTMLFormElement;

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

    if (!shippingForm || !emailInput) {
      throw new Error("Required form elements not found");
    }

    const quantity = parseInt(
      localStorage.getItem("selectedQuantity") || "0",
      10,
    );
    const selectedItems = getSelectedItems();

    if (selectedItems.length === 0 || quantity === 0) {
      showError("No items selected for purchase");
      return;
    }

    const payload = {
      items: selectedItems,
      shippingAddress: getAddressData(shippingForm),
      billingAddress: sameAddressCheckbox.checked
        ? null
        : getAddressData(billingForm),
      email: emailInput.value.trim(),
      totalAmount: calculateTotalAmount(quantity),
    };

    const { sessionUrl } = await createCheckoutSession(payload);
    window.location.href = sessionUrl;
  } catch (error) {
    showError(
      error instanceof Error ? error.message : "An unexpected error occurred",
    );
    console.error("Checkout error:", error);
  } finally {
    checkoutInProgress = false;
  }
}
