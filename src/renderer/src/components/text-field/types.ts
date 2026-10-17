import type { ComponentProps } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import type { Input } from '@/components/ui/input';

export type TextFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
} & Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'defaultValue'>;
