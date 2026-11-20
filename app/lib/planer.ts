// Komponenten aus design-system/components/ (Namensraum Planer). Nicht nachbauen, hier importieren.
import "./react-global";
import { createElement } from "react";
import { fehlerDetail } from "./fehler";
import type * as PlanerTypen from "../../design-system/components/index";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Planer = require("../../design-system/components/bundle.js") as typeof PlanerTypen;

export const { Button, Card, KpiTile, StatusPill, LocationTag, SegmentedControl, TextField, Checkbox, DataTable, Timeline, SideNav, Select, Dialog, Fieldset, ItemList, Chip, RecipeGroups, TopNav, Tabs, DetailPanel, Brand, Icon, UserMenu } = Planer;
/** Notice des Design Systems; zu einem Fehlertext aus lib/fehler.ts hängt sie die technische Meldung aufklappbar an. */
export const Notice = (p: PlanerTypen.NoticeProps) =>
  createElement(Planer.Notice, { ...p, detail: p.detail ?? fehlerDetail(Array.isArray(p.children) ? p.children.join("") : p.children) });

export type { SideNavItem, DataTableColumn, ItemListItem, NavLink } from "../../design-system/components/index";

/** Bildmarke in der App: Kopie von design-system/assets/bildmarke.svg, erzeugt durch scripts/icons.mjs. */
export const BILDMARKE = "/brand/bildmarke.svg";
