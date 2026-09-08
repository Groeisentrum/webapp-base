"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Panel, Spinner } from "@/shared/components/ui";
import { getRegistrationAvailability, register } from "@/shared/services/registrationService";

const MINIMUM_PASSWORD_LENGTH = 12;

/**
 * Visitor self-registration.
 *
 * Both consent boxes start unticked and are required. POPIA consent has to be a
 * positive act, so nothing here is pre-selected, and the API records what was agreed
 * to — along with which version of each policy — before the account is created.
 */
export default function RegisterPage() {
  const router = useRouter();

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentToPrivacyPolicy, setConsentToPrivacyPolicy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getRegistrationAvailability().then((available) => {
      if (!cancelled) setIsAvailable(available);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const validate = (): string | null => {
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return `Die wagwoord moet ten minste ${MINIMUM_PASSWORD_LENGTH} karakters wees.`;
    }

    if (password !== confirmPassword) {
      return "Die wagwoorde stem nie ooreen nie.";
    }

    if (!consentToPrivacyPolicy || !acceptTerms) {
      return "Jy moet die privaatheidsbeleid en bepalings aanvaar om te registreer.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({ userName, email, password, consentToPrivacyPolicy, acceptTerms });
      setIsDone(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Registrasie kon nie voltooi word nie. Probeer asseblief weer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAvailable === null) {
    return <Spinner />;
  }

  if (!isAvailable) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <Panel title="Registrasie nie beskikbaar nie" className="w-full">
          <p className="text-sm text-(--text-secondary)">
            Hierdie werf aanvaar nie tans nuwe registrasies nie.
          </p>
        </Panel>
      </main>
    );
  }

  if (isDone) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <Panel title="Registrasie voltooi" className="w-full">
          <p className="text-sm text-(--text-secondary)">
            Jou rekening is geskep. Jy kan nou aanteken.
          </p>
          <Button className="mt-4" onClick={() => router.push("/aanmeld")}>
            Gaan na aanmelding
          </Button>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <Panel title="Registreer" description="Skep 'n rekening om toegang te kry." className="w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

          <Field label="Gebruikersnaam" htmlFor="userName">
            <Input
              id="userName"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              autoComplete="username"
              minLength={3}
              required
            />
          </Field>

          <Field label="E-posadres" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field
            label="Wagwoord"
            htmlFor="password"
            hint={`Ten minste ${MINIMUM_PASSWORD_LENGTH} karakters.`}
          >
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
            />
          </Field>

          <Field label="Bevestig wagwoord" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>

          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm text-(--text-primary)">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentToPrivacyPolicy}
                onChange={(event) => setConsentToPrivacyPolicy(event.target.checked)}
              />
              <span>
                Ek stem in dat my persoonlike inligting verwerk word soos in die{" "}
                <Link href="/privaatheid" className="underline" target="_blank">
                  privaatheidsbeleid
                </Link>{" "}
                beskryf.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-(--text-primary)">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
              />
              <span>
                Ek aanvaar die{" "}
                <Link href="/bepalings" className="underline" target="_blank">
                  bepalings en voorwaardes
                </Link>
                .
              </span>
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Besig om te registreer..." : "Registreer"}
          </Button>

          <p className="text-sm text-(--text-secondary)">
            Het jy reeds &apos;n rekening?{" "}
            <Link href="/aanmeld" className="underline">
              Teken in
            </Link>
          </p>
        </form>
      </Panel>
    </main>
  );
}
