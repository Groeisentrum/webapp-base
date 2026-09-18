import { AssetType } from "@/shared/interfaces/Domain";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.None]: "Geen",
  [AssetType.YouTube]: "YouTube",
  [AssetType.S3]: "S3",
  [AssetType.SelfHosted]: "Self gehuisves",
  [AssetType.ExternalLink]: "Eksterne skakel",
  [AssetType.Image]: "Beeld",
};
