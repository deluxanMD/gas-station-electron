import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema } from './schema';
import type {
  LoginValues,
  UseLoginFormOptions,
  UseLoginFormReturn,
} from './types';

export function useLoginForm({
  onSubmit,
}: UseLoginFormOptions = {}): UseLoginFormReturn {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: '', password: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit?.(values);
  });

  return { form, handleSubmit };
}
