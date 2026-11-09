// bundle.js des Design Systems erwartet React als globale Variable (wie in preview.html).
import * as React from "react";

(globalThis as unknown as { React: typeof React }).React = React;
