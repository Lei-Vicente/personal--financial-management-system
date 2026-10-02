export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validate = {
  /**
   * Validates that the input is a valid positive number.
   * @param amount The value to validate.
   * @param customMessage Optional custom error message.
   * @returns The parsed number.
   */
  amount: (amount: any, customMessage?: string): number => {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new ValidationError(customMessage || 'Please enter a valid amount greater than 0.');
    }
    return num;
  },

  /**
   * Validates that the input is a non-empty string.
   * @param text The value to validate.
   * @param errorMessage The error message to throw if invalid.
   * @returns The trimmed string.
   */
  string: (text: any, errorMessage: string): string => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError(errorMessage);
    }
    return text.trim();
  },

  /**
   * Validates that the input is a valid YYYY-MM-DD date string.
   * @param date The value to validate.
   * @param customMessage Optional custom error message.
   * @returns The date string.
   */
  date: (date: any, customMessage?: string): string => {
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError(customMessage || 'Please provide a valid date in YYYY-MM-DD format.');
    }
    return date;
  },

  /**
   * Validates that the input matches one of the provided enum values.
   * @param value The value to validate.
   * @param validValues Array of valid string literals.
   * @param errorMessage The error message to throw if invalid.
   * @returns The validated enum value.
   */
  enum: <T extends string>(value: any, validValues: T[], errorMessage: string): T => {
    if (!value || !validValues.includes(value as T)) {
      throw new ValidationError(errorMessage);
    }
    return value as T;
  }
};
