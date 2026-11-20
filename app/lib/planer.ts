// Komponenten aus design-system/components/ (Namensraum Planer). Nicht nachbauen, hier importieren.
import "./react-global";
import type * as PlanerTypen from "../../design-system/components/index";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Planer = require("../../design-system/components/bundle.js") as typeof PlanerTypen;

export const { Button, Card, KpiTile, StatusPill, LocationTag, SegmentedControl, TextField, Checkbox, DataTable, Timeline, SideNav, Notice, Select, Dialog, Fieldset, ItemList, Chip, RecipeGroups, TopNav, Tabs, DetailPanel, Brand, Icon, UserMenu } = Planer;
export type { SideNavItem, DataTableColumn, ItemListItem, NavLink } from "../../design-system/components/index";

/** Bildmarke in der App: Kopie von design-system/assets/bildmarke.svg, erzeugt durch scripts/icons.mjs. */
export const BILDMARKE = "/brand/bildmarke.svg";
