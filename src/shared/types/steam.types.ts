/**
 * Steam Community inventory API types.
 *
 * The public inventory endpoint is unauthenticated and returns asset ids plus
 * shared descriptions keyed by classid/instanceid. CS2 inventory assets do
 * not carry an asking price; RAID treats them as offerable inventory and uses
 * the trader's local Buy Ceiling.
 */

export interface SteamInventoryTag {
  category: string;
  internal_name: string;
  localized_category_name: string;
  localized_tag_name: string;
  color?: string;
}

export interface SteamInventoryAction {
  link: string;
  name: string;
}

export interface SteamInventoryAssetDescriptionEntry {
  type: string;
  value: string;
  name?: string;
  color?: string;
}

export interface SteamInventoryAsset {
  appid: number;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}

export interface SteamInventoryDescription {
  appid: number;
  classid: string;
  instanceid: string;
  currency?: number;
  background_color?: string;
  icon_url?: string;
  name?: string;
  market_name?: string;
  market_hash_name?: string;
  name_color?: string;
  type?: string;
  tradable?: number;
  marketable?: number;
  commodity?: number;
  tags?: SteamInventoryTag[];
  actions?: SteamInventoryAction[];
  market_actions?: SteamInventoryAction[];
  descriptions?: SteamInventoryAssetDescriptionEntry[];
}

export interface SteamInventoryAssetProperty {
  propertyid: number;
  int_value?: string;
  float_value?: number | string;
  string_value?: string;
  name?: string;
}

export interface SteamInventoryAssetProperties {
  appid: number;
  contextid: string;
  assetid: string;
  asset_properties?: SteamInventoryAssetProperty[];
}

export interface SteamInventoryResponse {
  assets?: SteamInventoryAsset[];
  descriptions?: SteamInventoryDescription[];
  asset_properties?: SteamInventoryAssetProperties[];
  total_inventory_count?: number;
  more_items?: number;
  last_assetid?: string;
  success?: number;
  Error?: string;
}
