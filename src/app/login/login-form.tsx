"use client";

import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null, email: "" };

const COPY = {
  "sign-in": { title: "Welcome back", description: "Sign in to pick up where you left off." },
  "sign-up": { title: "Create your account", description: "Start organising your tasks in seconds." },
} as const;

type Mode = keyof typeof COPY;

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialState);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{COPY[mode].title}</h2>
        <p className="text-sm text-muted-foreground">{COPY[mode].description}</p>
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="w-full">
          <TabsTrigger value="sign-in">Sign in</TabsTrigger>
          <TabsTrigger value="sign-up">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="sign-in" className="pt-4">
          <AuthForm
            action={signInAction}
            state={signInState}
            pending={signingIn}
            submitLabel="Sign in"
            passwordAutoComplete="current-password"
          />
        </TabsContent>
        <TabsContent value="sign-up" className="pt-4">
          <AuthForm
            action={signUpAction}
            state={signUpState}
            pending={signingUp}
            submitLabel="Create account"
            passwordAutoComplete="new-password"
            passwordHint="At least 6 characters. No email confirmation needed locally."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuthForm({
  action,
  state,
  pending,
  submitLabel,
  passwordAutoComplete,
  passwordHint,
}: {
  action: (formData: FormData) => void;
  state: AuthState;
  pending: boolean;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
}) {
  const id = passwordAutoComplete; // unique per tab, keeps label/input ids distinct

  return (
    <form action={action}>
      <FieldGroup>
        {state.error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            defaultValue={state.email}
            className="h-10"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
          <Input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={passwordAutoComplete}
            minLength={6}
            className="h-10"
            required
          />
          {passwordHint && <FieldDescription>{passwordHint}</FieldDescription>}
        </Field>
        <Button type="submit" disabled={pending} className="h-10 w-full">
          {pending ? <Spinner /> : null}
          {submitLabel}
          {!pending && <ArrowRightIcon />}
        </Button>
      </FieldGroup>
    </form>
  );
}
