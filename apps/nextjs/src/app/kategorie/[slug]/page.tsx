import { notFound } from "next/navigation";
import type { CategoryTreeNode } from "@/shared/interfaces/Domain";
import { getPublicCategories, getPublicContent, getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { ContentCard } from "@/app/(public)/ContentCard";
import { SetupNotice } from "@/app/(public)/SetupNotice";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ taal?: string }>;
}) {
  const [{ slug }, { taal }] = await Promise.all([params, searchParams]);

  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }

  const language = taal ?? siteConfig.defaultLanguageCode;
  const categories = await getPublicCategories(language);
  const category = findBySlug(categories, slug);

  if (!category) {
    notFound();
  }

  const content = await getPublicContent({
    categoryId: category.id,
    language,
    page: 1,
    pageSize: 24,
  });

  return (
    <PublicShell siteConfig={siteConfig} language={language}>
      <h1 className="mb-5 text-2xl font-semibold text-balance text-(--text-primary) sm:mb-6 sm:text-3xl">
        {category.name}
      </h1>

      {category.children.length > 0 && (
        <ul className="mb-8 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <li key={child.id}>
              <a
                href={`/kategorie/${child.slug}?taal=${encodeURIComponent(language)}`}
                className="inline-flex min-h-11 items-center rounded-md border border-(--panel-border) px-4 text-sm text-(--text-secondary) hover:border-(--brand-primary)"
              >
                {child.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {content.items.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">Nog geen inhoud in hierdie afdeling nie.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item) => (
            <li key={item.id}>
              <ContentCard content={item} language={language} />
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}

function findBySlug(nodes: CategoryTreeNode[], slug: string): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.slug === slug) {
      return node;
    }

    const match = findBySlug(node.children, slug);
    if (match) {
      return match;
    }
  }

  return null;
}
