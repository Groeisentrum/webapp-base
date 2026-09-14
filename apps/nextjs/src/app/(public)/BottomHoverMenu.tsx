"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryTreeNode, MenuItem } from "@/shared/interfaces/Domain";
import { buildCategorySlugs, buildMenuHref, buildMenuTree } from "@/shared/lib/menuTree";
import type { MenuNode } from "@/shared/lib/menuTree";

/**
 * The site's main navigation bar, with the Louvre docking behaviour.
 *
 * The bar sits in normal flow just below the hero and scrolls away with the content
 * like anything else. The moment its bottom edge passes the top of the viewport —
 * the point where it would simply be gone — it docks to the bottom of the screen and
 * stays there. Scrolling back up releases it into its original place.
 *
 * The space it occupies is reserved on the wrapper whether it is docked or not, so
 * docking never reflows the page underneath it.
 */
export function BottomHoverMenu({
  items,
  categories,
  language,
}: {
  items: MenuItem[];
  categories: CategoryTreeNode[];
  language: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dockedRef = useRef(false);

  const [isDocked, setIsDocked] = useState(false);
  const [barHeight, setBarHeight] = useState<number | undefined>(undefined);
  const [openItemId, setOpenItemId] = useState<number | null>(null);

  // Measured rather than assumed: the bar wraps to two rows on a narrow screen, and
  // a hardcoded height would reserve the wrong gap exactly where it is most visible.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    setBarHeight(bar.offsetHeight);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      // The anchor keeps its space whether or not the bar is docked, so this rect
      // describes where the bar belongs, not where it currently is.
      const nextDocked = anchor.getBoundingClientRect().bottom <= 0;
      if (nextDocked === dockedRef.current) return;

      dockedRef.current = nextDocked;
      setIsDocked(nextDocked);

      // A submenu left open across the transition would hang in mid-air.
      setOpenItemId(null);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [barHeight]);

  const closeMenu = useCallback(() => setOpenItemId(null), []);

  useEffect(() => {
    if (openItemId === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openItemId, closeMenu]);

  if (items.length === 0) {
    return null;
  }

  const categorySlugs = buildCategorySlugs(categories);
  const tree = buildMenuTree(items);

  return (
    <div ref={anchorRef} style={{ minHeight: barHeight }}>
      <div
        ref={barRef}
        data-docked={isDocked ? "true" : "false"}
        className={
          isDocked
            ? "fixed inset-x-0 bottom-0 z-40 border-t border-(--panel-border) bg-(--panel-bg) shadow-[0_-2px_12px_rgba(0,0,0,0.12)] motion-safe:transition-transform"
            : "border-y border-(--panel-border) bg-(--panel-bg)"
        }
        onMouseLeave={closeMenu}
      >
        <nav
          aria-label="Hoofkieslys"
          className="mx-auto flex max-w-5xl items-stretch gap-1 overflow-x-auto px-4"
        >
          {tree.map((node) => (
            <BottomMenuEntry
              key={node.id}
              node={node}
              categorySlugs={categorySlugs}
              language={language}
              isOpen={openItemId === node.id}
              isDocked={isDocked}
              onOpen={() => setOpenItemId(node.id)}
              onToggle={() => setOpenItemId((current) => (current === node.id ? null : node.id))}
              onClose={closeMenu}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function BottomMenuEntry({
  node,
  categorySlugs,
  language,
  isOpen,
  isDocked,
  onOpen,
  onToggle,
  onClose,
}: {
  node: MenuNode;
  categorySlugs: Map<number, string>;
  language: string;
  isOpen: boolean;
  isDocked: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const href = buildMenuHref(node, categorySlugs, language);
  const hasChildren = node.children.length > 0;

  // Hovering opens the submenu on a pointer device; tapping the disclosure opens it
  // on a touch screen. Both are needed — a hover-only menu is unreachable on a phone,
  // and phones are where most visitors arrive from.
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={hasChildren ? onOpen : undefined}
    >
      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium whitespace-nowrap text-(--text-primary) hover:text-(--brand-primary)"
        >
          {node.label}
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium whitespace-nowrap text-(--text-primary)">
          {node.label}
        </span>
      )}

      {hasChildren && (
        <>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${node.label} — wys submenu`}
            onClick={onToggle}
            className="inline-flex min-h-11 items-center px-1 text-(--text-secondary) hover:text-(--brand-primary)"
          >
            <span aria-hidden="true">{isDocked ? "▴" : "▾"}</span>
          </button>

          {isOpen && (
            <ul
              className={
                isDocked
                  ? "absolute bottom-full left-0 z-50 mb-1 min-w-56 rounded-lg border border-(--panel-border) bg-(--panel-bg) py-2 shadow-lg"
                  : "absolute top-full left-0 z-50 mt-1 min-w-56 rounded-lg border border-(--panel-border) bg-(--panel-bg) py-2 shadow-lg"
              }
            >
              {node.children.map((child) => {
                const childHref = buildMenuHref(child, categorySlugs, language);

                return (
                  <li key={child.id}>
                    {childHref ? (
                      <Link
                        href={childHref}
                        onClick={onClose}
                        className="block px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--brand-primary)/10"
                      >
                        {child.label}
                      </Link>
                    ) : (
                      <span className="block px-4 py-2.5 text-sm text-(--text-secondary)">
                        {child.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
