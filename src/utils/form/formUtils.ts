import { debounce } from "../general"; // Corrected import path
import { validationRules } from "../validation/validationRules";
import type {
  CheckoutPayload,
  ShoeSelection,
} from "../../types/checkout";
import { getSelectedItems, getAddressData, calculateTotalAmount, createCheckoutSession } from "../checkout/checkoutService";

export function handleBillingAddressVisibility(
  sameAddressCheckbox: HTMLInputElement | null,
  billingAddressSection: HTMLElement | null,
): void {
  sameAddressCheckbox?.addEventListener("change", () => {
    billingAddressSection?.classList.toggle(// @ts-ignore
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
      speechBubble.toggleAttribute("hidden");// @ts-ignore
      speechBubble.setAttribute(
        "aria-hidden",// @ts-ignore
        speechBubble.hasAttribute("hidden").toString(),
      );
    });

    document.addEventListener("click", () => {
      if (!speechBubble.hasAttribute("hidden")) {
        speechBubble.setAttribute("hidden", "");
        speechBubble.setAttribute("aria-hidden", "true");// @ts-ignore
      }
    });
  }
}

/**
 * Debounced validation function.
 * It will delay the validation call for the specified time in miliseconds.
 */
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
}
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
  | {
    status: "success";
    url: string;
  }
  | { status: "error"; message: string }
> {
  try {
    event.preventDefault();

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
    const selectedItems: ShoeSelection[] = getSelectedItems();

    if (selectedItems.length === 0 || quantity === 0) {
      showError("No items selected for purchase");
      return { status: "error", message: "No items selected for purchase" };
    }

    const payload: CheckoutPayload = {
      items: selectedItems,
      shippingAddress: getAddressData(shippingForm),
      billingAddress: sameAddressCheckbox.checked
        ? null
        : getAddressData(billingForm),
      email: emailInput.value.trim(),
      totalAmount: calculateTotalAmount(quantity),
    };

    const { sessionUrl } = await createCheckoutSession(payload);
    return { status: "success", url: sessionUrl };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";// @ts-ignore
    showError(errorMessage);
    return { status: "error", message: errorMessage };
  }
}
















