"use client";

import { AlertCircleIcon } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null, email: "" };

export function LoginForm() {
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialState);

  return (
    <Tabs defaultValue="sign-in" className="w-full max-w-sm">
      <TabsList className="w-full">
        <TabsTrigger value="sign-in">Sign in</TabsTrigger>
        <TabsTrigger value="sign-up">Create account</TabsTrigger>
      </TabsList>

      <TabsContent value="sign-in">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to see your tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              action={signInAction}
              state={signInState}
              pending={signingIn}
              submitLabel="Sign in"
              passwordAutoComplete="current-password"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sign-up">
        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>It takes a few seconds; no email confirmation locally.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              action={signUpAction}
              state={signUpState}
              pending={signingUp}
              submitLabel="Create account"
              passwordAutoComplete="new-password"
              passwordHint="At least 6 characters."
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
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
            required
          />
          {passwordHint && <FieldDescription>{passwordHint}</FieldDescription>}
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
