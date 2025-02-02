export type ValidationRule = {
  validator: (value: string) => boolean;
  errorMessage: string;
};

export const validationRules: Record<string, ValidationRule> = {
  email: {
    validator: (value: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value.trim()),
    errorMessage: "Please enter a valid email address",
  },
  cardNumber: {
    validator: (value: string) => {
      const cleanValue = value.replace(/\\s/g, "");
      if (!/^\\d{13,19}$/.test(cleanValue)) return false;
      return luhnCheck(cleanValue);
    },
    errorMessage: "Please enter a valid credit card number",
  },
  firstName: {
    validator: (value: string) => /^[a-zA-Z\\s\'-]{1,50}$/.test(value.trim()),
    errorMessage: "Please enter a valid first name",
  },
  lastName: {
    validator: (value: string) => /^[a-zA-Z\\s\'-]{1,50}$/.test(value.trim()),
    errorMessage: "Please enter a valid last name",
  },
  address: {
    validator: (value: string) => /^[a-zA-Z0-9\\s.,#\\-\\/]{1,100}$/.test(value.trim()),
    errorMessage: "Please enter a valid address",
  },
  city: {
    validator: (value: string) => /^[a-zA-Z\\s\\-]{1,50}$/.test(value.trim()),
    errorMessage: "Please enter a valid city",
  },
  zipCode: {
    validator: (value: string) => /^\\d{5}(-\\d{4})?$/.test(value.trim()),
    errorMessage: "Please enter a valid ZIP code",
  },
  phoneNumber: {
    validator: (value: string) => {
      const cleanValue = value.replace(/[\\s\\(\\)\\-\\+]/g, '');
      // Allow optional +1 prefix, followed by exactly 10 digits
      return /^1?\\d{10}$/.test(cleanValue);
    },
    errorMessage: "Please enter a valid phone number",
  },
};

function luhnCheck(value: string): boolean {
  let sum = 0;
  let isEven = false;
  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value.charAt(i));
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}