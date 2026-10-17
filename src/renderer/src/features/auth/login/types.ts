import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { loginSchema } from './schema';

export type LoginValues = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  onSubmit?: (values: LoginValues) => void | Promise<void>;
}

export interface UseLoginFormOptions {
  onSubmit?: (values: LoginValues) => void | Promise<void>;
}

export interface UseLoginFormReturn {
  form: UseFormReturn<LoginValues>;
  handleSubmit: ReturnType<UseFormReturn<LoginValues>['handleSubmit']>;
}
