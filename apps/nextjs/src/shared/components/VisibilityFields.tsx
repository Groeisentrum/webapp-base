"use client";

import { Field, Select } from "@/shared/components/ui";
import { ROLE_NAMES, Visibility } from "@/shared/interfaces/Domain";

const VISIBILITY_LABELS: Record<Visibility, string> = {
  [Visibility.Public]: "Openbaar — enigeen",
  [Visibility.Authenticated]: "Slegs aangetekende gebruikers",
  [Visibility.Restricted]: "Slegs gekose rolle",
};

const SELECTABLE_ROLES = [ROLE_NAMES.client, ROLE_NAMES.content, ROLE_NAMES.admin];

const ROLE_LABELS: Record<string, string> = {
  [ROLE_NAMES.client]: "Kliënt",
  [ROLE_NAMES.content]: "Inhoudbestuurder",
  [ROLE_NAMES.admin]: "Administrateur",
};

/**
 * Sets who may see an item.
 *
 * The hint spells out that a restriction cascades, because the consequence is not
 * obvious from the control alone: restricting a category also hides everything inside it.
 */
export function VisibilityFields({
  idPrefix,
  visibility,
  visibleToRoles,
  onChange,
  cascades = false,
}: {
  idPrefix: string;
  visibility: Visibility;
  visibleToRoles: string[];
  onChange: (next: { visibility: Visibility; visibleToRoles: string[] }) => void;
  cascades?: boolean;
}) {
  const toggleRole = (role: string, checked: boolean) => {
    const next = checked
      ? [...visibleToRoles, role]
      : visibleToRoles.filter((candidate) => candidate !== role);

    onChange({ visibility, visibleToRoles: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Sigbaarheid"
        htmlFor={`${idPrefix}-visibility`}
        hint={
          cascades
            ? "Om hierdie afdeling te beperk, versteek ook alles daarin."
            : "Kan slegs verder beperk as wat die kategorie reeds toelaat."
        }
      >
        <Select
          id={`${idPrefix}-visibility`}
          value={visibility}
          onChange={(event) =>
            onChange({
              visibility: Number(event.target.value) as Visibility,
              visibleToRoles,
            })
          }
        >
          {[Visibility.Public, Visibility.Authenticated, Visibility.Restricted].map((value) => (
            <option key={value} value={value}>
              {VISIBILITY_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>

      {visibility === Visibility.Restricted && (
        <fieldset className="rounded-md border border-(--panel-border) p-3">
          <legend className="px-1 text-sm font-medium text-(--text-primary)">Toegelate rolle</legend>

          <div className="flex flex-col gap-2">
            {SELECTABLE_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-(--text-primary)">
                <input
                  type="checkbox"
                  checked={visibleToRoles.includes(role)}
                  onChange={(event) => toggleRole(role, event.target.checked)}
                />
                {ROLE_LABELS[role] ?? role}
              </label>
            ))}
          </div>

          {visibleToRoles.length === 0 && (
            <p className="mt-2 text-xs text-(--state-warning)">
              Geen rol is gekies nie — niemand sal dit kan sien nie.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
