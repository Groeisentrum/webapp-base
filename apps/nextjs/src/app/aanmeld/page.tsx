"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Field, Input, Panel } from "@/shared/components/ui";
import { login, getSession } from "@/shared/services/authService";
import { useAuthStore } from "@/shared/stores/useAuthStore";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(username, password);

      // Hydrate immediately so the destination page has a user without a second load.
      const session = await getSession();
      if (session.authenticated && session.user) {
        setSession(session.user);
      }

      router.push(searchParams.get("keerTerugNa") ?? "/admin");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Kon nie aanmeld nie. Probeer asseblief weer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Panel title="Teken in" description="Gebruik jou GroeiSentrum-besonderhede." className="w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

          <Field label="Gebruikersnaam" htmlFor="username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </Field>

          <Field label="Wagwoord" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Besig om aan te teken..." : "Teken in"}
          </Button>
        </form>
      </Panel>
    </main>
  );
}
