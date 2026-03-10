import { useState, useCallback } from "react";

type ValidationRule = {
  required?: string;
  minLength?: { value: number; message: string };
  min?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: (value: any) => string | undefined;
};

type ValidationRules<T> = Partial<Record<keyof T, ValidationRule>>;

export function useFormValidation<T extends Record<string, any>>(rules: ValidationRules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((field: keyof T, value: any): string | undefined => {
    const rule = rules[field];
    if (!rule) return undefined;

    if (rule.required && (!value || (typeof value === "string" && !value.trim()))) {
      return rule.required;
    }
    if (rule.minLength && typeof value === "string" && value.length < rule.minLength.value) {
      return rule.minLength.message;
    }
    if (rule.min && typeof value === "number" && value < rule.min.value) {
      return rule.min.message;
    }
    if (rule.pattern && typeof value === "string" && value && !rule.pattern.value.test(value)) {
      return rule.pattern.message;
    }
    if (rule.custom) {
      return rule.custom(value);
    }
    return undefined;
  }, [rules]);

  const touch = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((form: T): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    let valid = true;

    for (const field of Object.keys(rules) as (keyof T)[]) {
      allTouched[field] = true;
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field] = error;
        valid = false;
      }
    }

    setErrors(newErrors);
    setTouched(allTouched);
    return valid;
  }, [rules, validateField]);

  const validateSingle = useCallback((field: keyof T, value: any) => {
    const error = validateField(field, value);
    setErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldProps = (field: keyof T) => ({
    hasError: touched[field] && !!errors[field],
    errorMessage: touched[field] ? errors[field] : undefined,
  });

  return { errors, touched, validate, validateSingle, touch, clearErrors, getFieldProps };
}
