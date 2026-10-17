import type { ReactNode } from 'react';

export interface ButtonProps { variant?: 'primary' | 'secondary' | 'dashed'; href?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; children: ReactNode; }
export interface CardProps { title?: ReactNode; meta?: ReactNode; actions?: ReactNode; tone?: 'default' | 'panel'; children?: ReactNode; }
export interface KpiTileProps { label: ReactNode; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'panel'; }
export interface StatusPillProps { status?: 'ok' | 'info' | 'warn' | 'critical' | 'neutral'; children: ReactNode; }
export interface LocationTagProps { location?: 'zentral' | 'vorort' | 'logistik'; children?: ReactNode; }
export interface SegmentedControlProps { label: string; options: { value: string; label: ReactNode }[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; }
export interface TextFieldProps { label: ReactNode; id?: string; value?: string; defaultValue?: string; placeholder?: string; hint?: ReactNode; numeric?: boolean; onChange?: (e: unknown) => void; }
export interface CheckboxProps { label: ReactNode; checked?: boolean; defaultChecked?: boolean; onChange?: (e: unknown) => void; }
export interface DataTableColumn { key: string; label: ReactNode; numeric?: boolean; subKey?: string; render?: (row: Record<string, unknown>) => ReactNode; }
export interface DataTableProps { columns: DataTableColumn[]; rows: Record<string, unknown>[]; }
export interface TimelineBar { label: string; from: number; to: number; location?: 'zentral' | 'vorort' | 'logistik'; }
export interface TimelineProps { start: number; end: number; step?: number; marker?: number; lanes: { name: string; bars: TimelineBar[] }[]; }
export interface SideNavItem { label: string; href?: string; current?: boolean; disabled?: boolean; }
export interface SideNavProps { product?: string; company?: string; items: SideNavItem[]; }
export interface NoticeProps { title?: ReactNode; items?: ReactNode[]; children?: ReactNode; }

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
