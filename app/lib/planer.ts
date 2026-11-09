// Komponenten aus design-system/components/ (Namensraum Planer). Nicht nachbauen, hier importieren.
import "./react-global";
import type * as PlanerTypen from "../../design-system/components/index";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Planer = require("../../design-system/components/bundle.js") as typeof PlanerTypen;

export const { Button, Card, KpiTile, StatusPill, LocationTag, SegmentedControl, TextField, Checkbox, DataTable, Timeline, SideNav, Notice, Select, Dialog, Fieldset } = Planer;
export type { SideNavItem, DataTableColumn } from "../../design-system/components/index";
