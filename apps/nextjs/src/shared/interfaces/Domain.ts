/** Mirrors the C# API's response contracts. Keep the enums numerically aligned. */

export enum AssetType {
  None = 0,
  YouTube = 1,
  S3 = 2,
  SelfHosted = 3,
  ExternalLink = 4,
  Image = 5,
}

export enum MenuType {
  None = 0,
  Top = 1,
  BottomHover = 2,
  Footer = 3,
}

export enum MenuLinkType {
  None = 0,
  Category = 1,
  StaticPage = 2,
  ExternalLink = 3,
}

export enum RecurrenceFrequency {
  None = 0,
  Weekly = 1,
  Monthly = 2,
}

export enum WeekOfMonth {
  None = 0,
  First = 1,
  Second = 2,
  Third = 3,
  Fourth = 4,
  Last = 5,
}

export enum AuditAction {
  None = 0,
  Created = 1,
  Updated = 2,
  Deleted = 3,
}

/** Flags this template ships with. A deployment may add its own without a code change. */
export const FEATURE_FLAGS = {
  augmentedReality: "augmentedReality",
  virtualTour: "virtualTour",
  nfc: "nfc",
  chatbot: "chatbot",
} as const;

/** Entity discriminators for the translation table. Must match the C# EntityTypeNames. */
export const ENTITY_TYPES = {
  tenantSettings: "TenantSettings",
  category: "Category",
  content: "Content",
  menuItem: "MenuItem",
  locationDetail: "LocationDetail",
} as const;

export const TRANSLATABLE_FIELDS = {
  name: "Name",
  title: "Title",
  description: "Description",
  body: "Body",
  label: "Label",
} as const;

export type Branding = {
  primaryColour: string | null;
  secondaryColour: string | null;
  accentColour: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  logoReference: string | null;
  faviconReference: string | null;
};

export type ContactInfo = {
  emailAddress: string | null;
  phoneNumber: string | null;
  physicalAddress: string | null;
  postalAddress: string | null;
};

export type TenantSettings = {
  id: number;
  siteName: string;
  defaultLanguageCode: string;
  activeLanguageCodes: string[];
  featureFlags: Record<string, boolean>;
  branding: Branding;
  contactInfo: ContactInfo;
  createdAt: string;
  updatedAt: string | null;
};

export type PublicSiteConfig = {
  siteName: string;
  defaultLanguageCode: string;
  activeLanguageCodes: string[];
  featureFlags: Record<string, boolean>;
  branding: Branding;
  contactInfo: ContactInfo;
};

export type Category = {
  id: number;
  parentCategoryId: number | null;
  name: string;
  slug: string;
  colour: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
};

export type CategoryTreeNode = {
  id: number;
  parentCategoryId: number | null;
  name: string;
  slug: string;
  colour: string | null;
  icon: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
};

export type Recurrence = {
  frequency: RecurrenceFrequency;
  dayOfWeek: number | null;
  weekOfMonth: WeekOfMonth | null;
};

export type Content = {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  body: string | null;
  assetType: AssetType;
  assetReference: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  recurrence: Recurrence;
  createdAt: string;
  updatedAt: string | null;
};

export type LocationDetail = {
  id: number;
  contentId: number;
  latitude: number;
  longitude: number;
  label: string | null;
  addressLine: string | null;
  notes: string | null;
};

export type PublicContent = {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  body: string | null;
  assetType: AssetType;
  assetReference: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  recurrence: Recurrence;
  locations: LocationDetail[];
};

export type Translation = {
  id: number;
  entityType: string;
  entityId: number;
  fieldName: string;
  languageCode: string;
  value: string;
  createdAt: string;
  updatedAt: string | null;
};

export type MenuItem = {
  id: number;
  menuType: MenuType;
  linkType: MenuLinkType;
  label: string;
  categoryId: number | null;
  staticPageSlug: string | null;
  externalUrl: string | null;
  parentMenuItemId: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
};

export type AuditLogEntry = {
  id: number;
  entityType: string;
  entityId: number;
  action: AuditAction;
  actorUserId: string | null;
  actorEmail: string | null;
  oldValues: string | null;
  newValues: string | null;
  occurredAt: string;
};

export type Paged<TItem> = {
  items: TItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
