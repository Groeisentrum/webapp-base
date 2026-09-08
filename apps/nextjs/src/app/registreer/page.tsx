"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Panel, Spinner } from "@/shared/components/ui";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  isPasswordAcceptable,
} from "@/shared/lib/passwordPolicy";
import {
  completeRegistration,
  getRegistrationAvailability,
  resendRegistrationCode,
  startRegistration,
  type RegistrationStarted,
} from "@/shared/services/registrationService";

type Step = "details" | "verify" | "done";

/**
 * Visitor self-registration, in two steps: details then email verification.
 *
 * The account is created only after the code is verified, so an abandoned registration
 * leaves nothing behind. Both consent boxes start unticked and are required — POPIA
 * consent has to be a positive act — and the API records what was agreed to, with the
 * policy versions in force, before anything else happens.
 */
export default function RegisterPage() {
  const router = useRouter();

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("details");
  const [pending, setPending] = useState<RegistrationStarted | null>(null);

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentToPrivacyPolicy, setConsentToPrivacyPolicy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [code, setCode] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getRegistrationAvailability().then((available) => {
      if (!cancelled) setIsAvailable(available);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isPasswordAcceptable(password)) {
      setErrorMessage(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Die wagwoorde stem nie ooreen nie.");
      return;
    }

    if (!consentToPrivacyPolicy || !acceptTerms) {
      setErrorMessage("Jy moet die privaatheidsbeleid en bepalings aanvaar om te registreer.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const started = await startRegistration({
        userName,
        email,
        password,
        consentToPrivacyPolicy,
        acceptTerms,
      });

      setPending(started);
      setStep("verify");
      setNoticeMessage(
        `Ons het 'n kode gestuur na ${started.recipientMasked ?? "jou e-posadres"}.`,
      );
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await completeRegistration({ pendingId: pending.pendingId, code, password });
      setStep("done");
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pending) return;

    setErrorMessage(null);
    setNoticeMessage(null);
    setIsSubmitting(true);

    try {
      const resent = await resendRegistrationCode(pending.pendingId);
      setPending(resent);
      setCode("");
      setNoticeMessage("'n Nuwe kode is gestuur.");
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAvailable === null) {
    return <Spinner />;
  }

  if (!isAvailable) {
    return (
      <Shell>
        <Panel title="Registrasie nie beskikbaar nie" className="w-full">
          <p className="text-sm text-(--text-secondary)">
            Hierdie werf aanvaar nie tans nuwe registrasies nie.
          </p>
        </Panel>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        <Panel title="Registrasie voltooi" className="w-full">
          <p className="text-sm text-(--text-secondary)">
            Jou e-posadres is bevestig en jou rekening is geskep. Jy kan nou aanteken.
          </p>
          <Button className="mt-4" onClick={() => router.push("/aanmeld")}>
            Gaan na aanmelding
          </Button>
        </Panel>
      </Shell>
    );
  }

  if (step === "verify") {
    return (
      <Shell>
        <Panel
          title="Bevestig jou e-posadres"
          description="Voer die kode in wat ons gestuur het."
          className="w-full"
        >
          <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
            {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}
            {noticeMessage && !errorMessage && <Alert tone="success">{noticeMessage}</Alert>}

            <Field label="Verifikasiekode" htmlFor="code">
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </Field>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Besig om te bevestig..." : "Bevestig"}
            </Button>

            <Button variant="secondary" onClick={handleResend} disabled={isSubmitting}>
              Stuur die kode weer
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setStep("details");
                setErrorMessage(null);
                setNoticeMessage(null);
              }}
              disabled={isSubmitting}
            >
              Terug
            </Button>
          </form>
        </Panel>
      </Shell>
    );
  }

  return (
    <Shell>
      <Panel title="Registreer" description="Skep 'n rekening om toegang te kry." className="w-full">
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
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

          <Field
            label="E-posadres"
            htmlFor="email"
            hint="Ons stuur 'n kode hierheen om die adres te bevestig."
          >
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Wagwoord" htmlFor="password" hint={PASSWORD_REQUIREMENTS_MESSAGE}>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
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
            {isSubmitting ? "Besig..." : "Gaan voort"}
          </Button>

          <p className="text-sm text-(--text-secondary)">
            Het jy reeds &apos;n rekening?{" "}
            <Link href="/aanmeld" className="underline">
              Teken in
            </Link>
          </p>
        </form>
      </Panel>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">{children}</main>
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Registrasie kon nie voltooi word nie. Probeer asseblief weer.";
}
