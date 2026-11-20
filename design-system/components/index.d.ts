import type { ReactNode } from 'react';

export type IconName = 'search' | 'print' | 'plus' | 'edit' | 'close' | 'sort-up' | 'sort-down';
export interface IconProps { name: IconName; }
export interface UserMenuProps { name?: string; email?: string; signOutLabel?: string; onSignOut: () => void; }
export interface ButtonProps { variant?: 'primary' | 'secondary' | 'dashed'; icon?: IconName; href?: string; ariaLabel?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; children: ReactNode; }
export interface CardProps { title?: ReactNode; meta?: ReactNode; actions?: ReactNode; tone?: 'default' | 'panel'; children?: ReactNode; }
export interface KpiTileProps { label: ReactNode; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'panel'; }
export interface StatusPillProps { status?: 'ok' | 'info' | 'warn' | 'critical' | 'neutral'; children: ReactNode; }
export interface LocationTagProps { location?: 'zentral' | 'vorort' | 'logistik'; children?: ReactNode; }
export interface SegmentedControlProps { label: string; options: { value: string; label: ReactNode }[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; }
export interface TextFieldProps { label: ReactNode; id?: string; type?: 'text' | 'email' | 'search' | 'tel' | 'date'; name?: string; autoComplete?: string; required?: boolean; invalid?: boolean; value?: string; defaultValue?: string; placeholder?: string; hint?: ReactNode; numeric?: boolean; code?: boolean; multiline?: boolean; rows?: number; onChange?: (e: unknown) => void; }
export interface SelectProps { label: ReactNode; id?: string; name?: string; options: { value: string; label: string }[]; value?: string; defaultValue?: string; hint?: ReactNode; onChange?: (value: string) => void; }
export interface DialogProps { open: boolean; title: ReactNode; meta?: ReactNode; id?: string; actions?: ReactNode; onClose?: () => void; onCancel?: (e: { preventDefault: () => void }) => void; children?: ReactNode; }
export interface FieldsetProps { legend: ReactNode; hint?: ReactNode; children?: ReactNode; }
export interface ItemListItem { id: string; label: ReactNode; sub?: ReactNode; }
export interface ItemListProps { label: string; groups: { title?: ReactNode; items: ItemListItem[] }[]; value?: string; onSelect?: (id: string) => void; }
export interface ChipProps { kind?: 'neutral' | 'temp' | 'aktiv' | 'unbeaufsichtigt' | 'haccp'; children: ReactNode; }
export interface RecipeIngredient { id: string; name: ReactNode; amount: ReactNode; pct?: ReactNode; note?: ReactNode; base?: boolean; assumed?: boolean; }
export interface RecipeStep { id: string; text: ReactNode; assumed?: boolean; chips?: ReactNode[]; }
export interface RecipeGroupsProps { groups: { id?: string; title?: ReactNode; ingredients: RecipeIngredient[]; steps: RecipeStep[] }[]; pctLabel?: string; }
export interface CheckboxProps { label: ReactNode; checked?: boolean; defaultChecked?: boolean; onChange?: (e: unknown) => void; }
export interface DataTableColumn { key: string; label: ReactNode; numeric?: boolean; printHidden?: boolean; sortable?: boolean; subKey?: string; render?: (row: Record<string, unknown>) => ReactNode; }
export interface DataTableProps { columns: DataTableColumn[]; rows: Record<string, unknown>[]; sort?: { key: string; dir: 'auf' | 'ab' }; onSort?: (key: string) => void; isSelected?: (row: Record<string, unknown>) => boolean; rowHref?: (row: Record<string, unknown>) => string | null | undefined; }
export interface TimelineBar { label: string; from: number; to: number; location?: 'zentral' | 'vorort' | 'logistik'; }
export interface TimelineProps { start: number; end: number; step?: number; marker?: number; lanes: { name: string; bars: TimelineBar[] }[]; }
export interface SideNavItem { label: string; href?: string; current?: boolean; disabled?: boolean; }
export interface SideNavProps { product?: string; company?: string; items: SideNavItem[]; }
export interface NavLink { label: string; href: string; current?: boolean; }
export interface BrandProps { size?: 'sm' | 'lg'; src?: string; href?: string; company?: string; product?: string | null; }
export interface TopNavProps { company?: string; brandSrc?: string; items: NavLink[]; actions?: ReactNode; }
export interface TabsProps { label: string; items: NavLink[]; tone?: 'default' | 'sunken'; }
export interface DetailPanelProps { title: ReactNode; itemKey?: string; meta?: ReactNode; label?: string; actions?: ReactNode; onClose?: () => void; children?: ReactNode; }
export interface NoticeProps { title?: ReactNode; detail?: string; role?: 'alert' | 'status'; items?: ReactNode[]; children?: ReactNode; }

export declare const Button: (p: ButtonProps) => JSX.Element;
export declare const Card: (p: CardProps) => JSX.Element;
export declare const KpiTile: (p: KpiTileProps) => JSX.Element;
export declare const StatusPill: (p: StatusPillProps) => JSX.Element;
export declare const LocationTag: (p: LocationTagProps) => JSX.Element;
export declare const SegmentedControl: (p: SegmentedControlProps) => JSX.Element;
export declare const TextField: (p: TextFieldProps) => JSX.Element;
export declare const Checkbox: (p: CheckboxProps) => JSX.Element;
export declare const DataTable: (p: DataTableProps) => JSX.Element;
export declare const Timeline: (p: TimelineProps) => JSX.Element;
export declare const SideNav: (p: SideNavProps) => JSX.Element;
export declare const Notice: (p: NoticeProps) => JSX.Element;
export declare const Select: (p: SelectProps) => JSX.Element;
export declare const Dialog: (p: DialogProps) => JSX.Element;
export declare const Fieldset: (p: FieldsetProps) => JSX.Element;
export declare const ItemList: (p: ItemListProps) => JSX.Element;
export declare const Chip: (p: ChipProps) => JSX.Element;
export declare const RecipeGroups: (p: RecipeGroupsProps) => JSX.Element;
export declare const TopNav: (p: TopNavProps) => JSX.Element;
export declare const Tabs: (p: TabsProps) => JSX.Element | null;
export declare const DetailPanel: (p: DetailPanelProps) => JSX.Element;
export declare const Brand: (p: BrandProps) => JSX.Element;
export declare const Icon: (p: IconProps) => JSX.Element;
export declare const UserMenu: (p: UserMenuProps) => JSX.Element;
