"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null, email: "" };

export function LoginForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialState);

  const isSignUp = mode === "sign-up";
  const state = isSignUp ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <form action={isSignUp ? signUpAction : signInAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="input mt-1"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isSignUp ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
          className="font-medium text-indigo-600 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
