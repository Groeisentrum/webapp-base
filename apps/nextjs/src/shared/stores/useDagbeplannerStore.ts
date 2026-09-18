import { create } from "zustand";
import {
  DEFAULT_START_TIME,
  DEFAULT_TIME_BUDGET_MINUTES,
  buildGeneratedItinerary,
  createCatalogueDestination,
  createCustomDestination,
  getAdjacentDestinationId,
  recomputeWalkChain,
} from "@/shared/lib/dagbeplanner/engine";
import {
  buildShareUrl,
  consumeSharedPlanFromLocation,
  parsePlanPayload,
} from "@/shared/lib/dagbeplanner/share";
import type {
  CatalogueAttractionId,
  DestinationEntry,
  MobilitySpeed,
  PlanPayload,
} from "@/shared/lib/dagbeplanner/types";

const STORAGE_KEY = "vtm.dagbeplanner.plan.v1";

type PlannerStatus = "uninitialized" | "empty" | "active";

type WizardDraft = {
  startTime: string;
  timeBudgetMinutes: number;
  selectedIds: CatalogueAttractionId[];
};

type PendingDestructiveAction =
  | { kind: "clear" }
  | { kind: "regenerate"; payload: PlanPayload }
  | { kind: "import"; payload: PlanPayload };

type DagbeplannerState = {
  status: PlannerStatus;
  startTime: string;
  timeBudgetMinutes: number;
  speed: MobilitySpeed;
  destinations: DestinationEntry[];
  activeDestinationId: string | null;

  isSidebarOpen: boolean;
  isDrawerOpen: boolean;
  isWizardOpen: boolean;
  isShareModalOpen: boolean;
  wizardDraft: WizardDraft;
  pendingDestructiveAction: PendingDestructiveAction | null;

  hydrate: () => void;

  startManualPlan: (startTime: string, timeBudgetMinutes: number) => void;
  openWizard: (startTime: string, timeBudgetMinutes: number) => void;
  closeWizard: () => void;
  applyWizardPlan: (
    startTime: string,
    timeBudgetMinutes: number,
    selectedIds: CatalogueAttractionId[],
  ) => void;
  requestClearPlan: () => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;

  addCatalogueAttraction: (attractionId: CatalogueAttractionId) => void;
  addCustomActivity: (name: string, dwellMinutes: number) => void;
  removeDestination: (entryId: string) => void;
  updateDwellMinutes: (entryId: string, minutes: number) => void;
  reorderDestinations: (draggedEntryId: string, targetEntryId: string) => void;

  setSpeed: (speed: MobilitySpeed) => void;
  setStartTime: (value: string) => void;
  setTimeBudgetMinutes: (value: number) => void;
  setActiveDestinationId: (entryId: string | null) => void;
  cycleActiveDestination: (direction: 1 | -1) => void;

  toggleSidebar: () => void;
  closeSidebar: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openShareModal: () => void;
  closeShareModal: () => void;

  getShareUrl: () => string;
};

function persist(
  state: Pick<
    DagbeplannerState,
    "status" | "startTime" | "timeBudgetMinutes" | "speed" | "destinations"
  >,
) {
  if (typeof window === "undefined") return;

  try {
    if (state.status === "active") {
      const payload: PlanPayload = {
        startTime: state.startTime,
        timeBudgetMinutes: state.timeBudgetMinutes,
        speed: state.speed,
        destinations: state.destinations,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private browsing / quota-exceeded: losing persistence is acceptable, losing the session is not.
  }
}

function readPersistedPlan(): PlanPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    return parsePlanPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

function firstDestinationId(destinations: DestinationEntry[]): string | null {
  return destinations.length > 0 ? destinations[0].entryId : null;
}

/**
 * Global Dagbeplanner state. A second Zustand store alongside `useAuthStore` — this is
 * a genuinely separate concern (trip planning, not session), read from several
 * unrelated places on the page (footer bar, drawer, desktop sidebar), which is exactly
 * what Zustand is for. Client-only by construction: every mutating action runs from a
 * user event or the post-mount `hydrate()` call, never during server rendering, so the
 * module-scoped store never leaks state between requests.
 */
export const useDagbeplannerStore = create<DagbeplannerState>((set, get) => ({
  status: "uninitialized",
  startTime: DEFAULT_START_TIME,
  timeBudgetMinutes: DEFAULT_TIME_BUDGET_MINUTES,
  speed: "medium",
  destinations: [],
  activeDestinationId: null,

  isSidebarOpen: false,
  isDrawerOpen: false,
  isWizardOpen: false,
  isShareModalOpen: false,
  wizardDraft: {
    startTime: DEFAULT_START_TIME,
    timeBudgetMinutes: DEFAULT_TIME_BUDGET_MINUTES,
    selectedIds: [],
  },
  pendingDestructiveAction: null,

  hydrate: () => {
    if (get().status !== "uninitialized") return;

    const stored = readPersistedPlan();
    const hasStoredPlan = stored !== null;

    set({
      status: hasStoredPlan ? "active" : "empty",
      startTime: stored?.startTime ?? DEFAULT_START_TIME,
      timeBudgetMinutes:
        stored?.timeBudgetMinutes ?? DEFAULT_TIME_BUDGET_MINUTES,
      speed: stored?.speed ?? "medium",
      destinations: stored?.destinations ?? [],
      activeDestinationId: stored
        ? firstDestinationId(stored.destinations)
        : null,
    });

    const shared = consumeSharedPlanFromLocation();
    if (!shared) return;

    if (hasStoredPlan) {
      set({ pendingDestructiveAction: { kind: "import", payload: shared } });
    } else {
      set({
        status: "active",
        startTime: shared.startTime,
        timeBudgetMinutes: shared.timeBudgetMinutes,
        speed: shared.speed,
        destinations: shared.destinations,
        activeDestinationId: firstDestinationId(shared.destinations),
      });
      persist(get());
    }
  },

  startManualPlan: (startTime, timeBudgetMinutes) => {
    set({
      status: "active",
      startTime,
      timeBudgetMinutes,
      destinations: [],
      activeDestinationId: null,
    });
    persist(get());
  },

  openWizard: (startTime, timeBudgetMinutes) => {
    set({
      isWizardOpen: true,
      wizardDraft: { startTime, timeBudgetMinutes, selectedIds: [] },
    });
  },

  closeWizard: () => set({ isWizardOpen: false }),

  applyWizardPlan: (startTime, timeBudgetMinutes, selectedIds) => {
    const destinations = buildGeneratedItinerary(
      selectedIds,
      timeBudgetMinutes,
      get().speed,
    );
    const payload: PlanPayload = {
      startTime,
      timeBudgetMinutes,
      speed: get().speed,
      destinations,
    };

    if (get().status === "active") {
      set({
        isWizardOpen: false,
        pendingDestructiveAction: { kind: "regenerate", payload },
      });
      return;
    }

    set({
      status: "active",
      startTime,
      timeBudgetMinutes,
      destinations,
      activeDestinationId: firstDestinationId(destinations),
      isWizardOpen: false,
    });
    persist(get());
  },

  requestClearPlan: () => set({ pendingDestructiveAction: { kind: "clear" } }),

  confirmPendingAction: () => {
    const pending = get().pendingDestructiveAction;
    if (!pending) return;

    if (pending.kind === "clear") {
      set({
        status: "empty",
        destinations: [],
        activeDestinationId: null,
        pendingDestructiveAction: null,
      });
      persist(get());
      return;
    }

    // "regenerate" and "import" both replace the plan wholesale with a validated payload.
    const { payload } = pending;
    set({
      status: "active",
      startTime: payload.startTime,
      timeBudgetMinutes: payload.timeBudgetMinutes,
      speed: payload.speed,
      destinations: payload.destinations,
      activeDestinationId: firstDestinationId(payload.destinations),
      pendingDestructiveAction: null,
    });
    persist(get());
  },

  cancelPendingAction: () => set({ pendingDestructiveAction: null }),

  addCatalogueAttraction: (attractionId) => {
    const destinations = [
      ...get().destinations,
      createCatalogueDestination(attractionId),
    ];
    set((state) => ({
      destinations,
      activeDestinationId:
        state.activeDestinationId ?? firstDestinationId(destinations),
    }));
    persist(get());
  },

  addCustomActivity: (name, dwellMinutes) => {
    const destinations = [
      ...get().destinations,
      createCustomDestination(name, dwellMinutes),
    ];
    set((state) => ({
      destinations,
      activeDestinationId:
        state.activeDestinationId ?? firstDestinationId(destinations),
    }));
    persist(get());
  },

  removeDestination: (entryId) => {
    const destinations = get().destinations.filter(
      (destination) => destination.entryId !== entryId,
    );
    const activeDestinationId =
      get().activeDestinationId === entryId
        ? firstDestinationId(destinations)
        : get().activeDestinationId;

    set({ destinations, activeDestinationId });
    persist(get());
  },

  updateDwellMinutes: (entryId, minutes) => {
    const clamped = Math.min(240, Math.max(5, Math.round(minutes / 5) * 5));
    const destinations = get().destinations.map((destination) =>
      destination.entryId === entryId
        ? { ...destination, dwellMinutes: clamped }
        : destination,
    );

    set({ destinations });
    persist(get());
  },

  reorderDestinations: (draggedEntryId, targetEntryId) => {
    const current = get().destinations;
    const fromIndex = current.findIndex(
      (destination) => destination.entryId === draggedEntryId,
    );
    const toIndex = current.findIndex(
      (destination) => destination.entryId === targetEntryId,
    );
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    set({ destinations: next });
    persist(get());
  },

  setSpeed: (speed) => {
    set({ speed });
    persist(get());
  },

  setStartTime: (value) => {
    set({ startTime: value });
    persist(get());
  },

  setTimeBudgetMinutes: (value) => {
    set({ timeBudgetMinutes: Math.max(15, value) });
    persist(get());
  },

  setActiveDestinationId: (entryId) => set({ activeDestinationId: entryId }),

  cycleActiveDestination: (direction) => {
    const entries = recomputeWalkChain(get().destinations);
    const nextId = getAdjacentDestinationId(
      entries,
      get().activeDestinationId,
      direction,
    );

    set({ activeDestinationId: nextId });
  },

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  openShareModal: () => set({ isShareModalOpen: true }),
  closeShareModal: () => set({ isShareModalOpen: false }),

  getShareUrl: () => {
    const state = get();

    return buildShareUrl({
      startTime: state.startTime,
      timeBudgetMinutes: state.timeBudgetMinutes,
      speed: state.speed,
      destinations: state.destinations,
    });
  },
}));
