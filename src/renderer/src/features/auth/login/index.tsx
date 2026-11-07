import type { JSX } from 'react';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useLoginForm } from './hooks';
import type { LoginFormProps, LoginValues } from './types';

export function LoginForm({ onSubmit }: LoginFormProps): JSX.Element {
  const { form, handleSubmit } = useLoginForm({ onSubmit });

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid w-full max-w-sm gap-4"
      >
        <TextField<LoginValues>
          name="userId"
          label="User ID"
          placeholder="Enter your user ID"
          autoComplete="username"
        />
        <TextField<LoginValues>
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </Form>
  );
}
