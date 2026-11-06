import type { Vec } from './simulation';
import { PROCEDURAL_ASSET_IDS } from './assets';

export type BreakablePropKind = 'supply-box' | 'delivery-box' | 'utility-container';
type BreakablePropAssetId = typeof PROCEDURAL_ASSET_IDS.props.supplyBox | typeof PROCEDURAL_ASSET_IDS.props.deliveryBox | typeof PROCEDURAL_ASSET_IDS.props.utilityContainer;
export interface CityPropDefinition {
  readonly id: BreakablePropKind;
  readonly displayName: string;
  readonly width: number;
  readonly height: number;
  readonly maxHealth: number;
  readonly destructible: true;
  readonly collision: 'none';
  readonly dropTable: 'urban-utility';
  readonly dropChanceScale: number;
  readonly assetId: BreakablePropAssetId;
  readonly sound: 'breakable-impact';
  readonly spawnZone: 'walkable';
}
export interface CityPropState extends Vec { readonly id: number; readonly kind: BreakablePropKind; health: number; readonly maxHealth: number; destroyed: boolean }

/** Decorative loose street clutter is nonblocking; player attacks can break only these explicit prop types. */
export const BREAKABLE_CITY_PROPS: Readonly<Record<BreakablePropKind, CityPropDefinition>> = {
  'supply-box': { id: 'supply-box', displayName: 'Field Supply Box', width: 34, height: 28, maxHealth: 48, destructible: true, collision: 'none', dropTable: 'urban-utility', dropChanceScale: 1, assetId: PROCEDURAL_ASSET_IDS.props.supplyBox, sound: 'breakable-impact', spawnZone: 'walkable' },
  'delivery-box': { id: 'delivery-box', displayName: 'Delivery Package', width: 27, height: 23, maxHealth: 30, destructible: true, collision: 'none', dropTable: 'urban-utility', dropChanceScale: 0.75, assetId: PROCEDURAL_ASSET_IDS.props.deliveryBox, sound: 'breakable-impact', spawnZone: 'walkable' },
  'utility-container': { id: 'utility-container', displayName: 'Utility Container', width: 31, height: 29, maxHealth: 58, destructible: true, collision: 'none', dropTable: 'urban-utility', dropChanceScale: 0.9, assetId: PROCEDURAL_ASSET_IDS.props.utilityContainer, sound: 'breakable-impact', spawnZone: 'walkable' },
};

export function createCityProp(kind: BreakablePropKind, id: number, position: Vec): CityPropState {
  const definition = BREAKABLE_CITY_PROPS[kind];
  return { id, kind, ...position, health: definition.maxHealth, maxHealth: definition.maxHealth, destroyed: false };
}
