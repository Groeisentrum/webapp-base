"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel, Spinner } from "@/shared/components/ui";
import { getTenantSettings } from "@/shared/services/adminService";
import { getContent } from "@/shared/services/contentService";
import { isAdmin } from "@/shared/lib/authRoles";
import { useAuthStore } from "@/shared/stores/useAuthStore";

export default function AdminOverviewPage() {
  const user = useAuthStore((state) => state.user);

  const settingsQuery = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: getTenantSettings,
    // Content editors cannot read settings; asking would only produce a 403.
    enabled: isAdmin(user),
    retry: false,
  });

  const contentQuery = useQuery({
    queryKey: ["content", { page: 1, pageSize: 1 }],
    queryFn: () => getContent({ page: 1, pageSize: 1 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-(--text-primary)">Oorsig</h1>

      {isAdmin(user) && (
        <Panel title="Werf">
          {settingsQuery.isLoading && <Spinner />}
          {settingsQuery.isError && (
            <p className="text-sm text-(--text-secondary)">
              Die werf se instellings is nog nie opgestel nie.{" "}
              <Link href="/admin/instellings" className="underline">
                Stel dit nou op
              </Link>
              .
            </p>
          )}
          {settingsQuery.data && (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-(--text-secondary)">Werfnaam</dt>
                <dd className="text-(--text-primary)">{settingsQuery.data.siteName}</dd>
              </div>
              <div>
                <dt className="text-(--text-secondary)">Tale</dt>
                <dd className="text-(--text-primary)">
                  {settingsQuery.data.activeLanguageCodes.join(", ")}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      )}

      <Panel title="Inhoud">
        {contentQuery.isLoading && <Spinner />}
        {contentQuery.data && (
          <p className="text-sm text-(--text-primary)">
            {contentQuery.data.totalCount} inhoudstukke.{" "}
            <Link href="/admin/inhoud" className="underline">
              Bestuur inhoud
            </Link>
            .
          </p>
        )}
      </Panel>
    </div>
  );
}
