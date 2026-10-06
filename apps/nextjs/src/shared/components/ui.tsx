"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

/* Shared primitives. Colours come from semantic tokens only — never hardcoded. */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-(--brand-primary) text-(--text-inverse) hover:opacity-90",
  secondary:
    "bg-(--panel-bg) text-(--text-primary) border border-(--panel-border) hover:bg-(--page-bg)",
  danger: "bg-(--state-danger) text-(--text-inverse) hover:opacity-90",
  ghost: "bg-transparent text-(--text-secondary) hover:text-(--text-primary)",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button({ className, variant = "primary", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
});

/**
 * A link that carries a button's weight. Used where the action leaves the site — a map,
 * a booking page — so it reads as a thing you do rather than a word you click.
 *
 * Shares buttonVariants with Button so the two never drift apart visually.
 */
export function LinkButton({
  className,
  variant = "primary",
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2",
        "text-sm font-semibold no-underline transition",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-2 text-sm",
          "text-(--text-primary) placeholder:text-(--text-secondary)",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-2 text-sm",
        "text-(--text-primary) placeholder:text-(--text-secondary)",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-2 text-sm",
          "text-(--text-primary)",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-(--text-primary)">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-(--text-secondary)">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-(--state-danger)">
          {error}
        </p>
      )}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border border-(--panel-border) bg-(--panel-bg) p-5", className)}
    >
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>}
            {description && <p className="mt-1 text-sm text-(--text-secondary)">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

type AlertTone = "danger" | "success" | "warning";

const alertTones: Record<AlertTone, string> = {
  danger: "bg-(--state-danger-bg) text-(--state-danger)",
  success: "bg-(--state-success-bg) text-(--state-success)",
  warning: "bg-(--state-warning-bg) text-(--state-warning)",
};

export function Alert({ tone, children }: { tone: AlertTone; children: React.ReactNode }) {
  return (
    <div role="alert" className={cn("rounded-md px-4 py-3 text-sm", alertTones[tone])}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Laai tans..." }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-(--text-secondary)">
      {label}
    </p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-(--panel-border) px-4 py-8 text-center text-sm text-(--text-secondary)">
      {message}
    </p>
  );
}
