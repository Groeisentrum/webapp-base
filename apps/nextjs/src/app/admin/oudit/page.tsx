"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyState, Field, Panel, Select, Spinner } from "@/shared/components/ui";
import { AuditAction, ENTITY_TYPES } from "@/shared/interfaces/Domain";
import { formatDateTime } from "@/shared/lib/dateFields";
import { getAuditLogs } from "@/shared/services/adminService";

const ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.None]: "—",
  [AuditAction.Created]: "Geskep",
  [AuditAction.Updated]: "Gewysig",
  [AuditAction.Deleted]: "Verwyder",
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>("");
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ["audit-logs", { entityType, page }],
    queryFn: () =>
      getAuditLogs({
        entityType: entityType || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const entries = auditQuery.data?.items ?? [];
  const totalPages = auditQuery.data?.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-(--text-primary)">Ouditspoor</h1>

      <Panel description="Wie het wat verander, en wanneer.">
        <div className="mb-4 max-w-xs">
          <Field label="Filter op tipe" htmlFor="entityType">
            <Select
              id="entityType"
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Alles</option>
              {Object.values(ENTITY_TYPES).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {auditQuery.isLoading && <Spinner />}

        {!auditQuery.isLoading && entries.length === 0 && (
          <EmptyState message="Geen ouditinskrywings nie." />
        )}

        {entries.length > 0 && (
          // Scrolls within the panel rather than widening the page on a tablet.
          <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-(--panel-border) text-(--text-secondary)">
              <tr>
                <th className="py-2 pr-4 font-medium">Wanneer</th>
                <th className="py-2 pr-4 font-medium">Tipe</th>
                <th className="py-2 pr-4 font-medium">Aksie</th>
                <th className="py-2 pr-4 font-medium">Gebruiker</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-(--panel-border) last:border-0">
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {formatDateTime(entry.occurredAt)}
                  </td>
                  <td className="py-2 pr-4 text-(--text-primary)">
                    {entry.entityType} #{entry.entityId}
                  </td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {ACTION_LABELS[entry.action]}
                  </td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {entry.actorEmail ?? entry.actorUserId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Vorige
            </Button>
            <span className="text-sm text-(--text-secondary)">
              Bladsy {page} van {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Volgende
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
