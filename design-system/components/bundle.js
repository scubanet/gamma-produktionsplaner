/* @ds-bundle: {"format":4,"namespace":"Planer","components":[{"name":"Button"},{"name":"Card"},{"name":"KpiTile"},{"name":"StatusPill"},{"name":"LocationTag"},{"name":"SegmentedControl"},{"name":"TextField"},{"name":"Checkbox"},{"name":"DataTable"},{"name":"Timeline"},{"name":"SideNav"},{"name":"Notice"},{"name":"Select"},{"name":"Dialog"},{"name":"Fieldset"},{"name":"ItemList"},{"name":"Chip"},{"name":"RecipeGroups"},{"name":"TopNav"},{"name":"Tabs"},{"name":"DetailPanel"},{"name":"Brand"},{"name":"Icon"},{"name":"UserMenu"},{"name":"Skeleton"},{"name":"EmptyState"}]} */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var React = root.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  // Linien-Icons: 18 px, Strich 1.8 (im 24er-Raster 2.4), currentColor, runde Enden. Immer neben Text oder mit aria-label am Button.
  var ICONS = {
    search: ['M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14z', 'M16.5 16.5L21 21'],
    print: ['M7 9V3h10v6', 'M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M7 14h10v7H7z'],
    plus: ['M12 5v14', 'M5 12h14'],
    edit: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13.5 6.5l4 4'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    'sort-up': ['M12 19V5', 'M6 11l6-6l6 6'],
    'sort-down': ['M12 5v14', 'M6 13l6 6l6-6']
  };
  function Icon(p) {
    return h('svg', { className: 'pl-icon', width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' },
      (ICONS[p.name] || []).map(function (d, i) { return h('path', { key: i, d: d }); }));
  }

  function Button(p) {
    var variant = p.variant || 'secondary';
    var cls = cx('pl-btn', 'pl-btn--' + variant, p.className);
    var inhalt = p.icon ? [h(Icon, { key: 'i', name: p.icon }), h('span', { key: 't' }, p.children)] : p.children;
    if (p.href) return h('a', { className: cls, href: p.href, 'aria-label': p.ariaLabel }, inhalt);
    return h('button', { type: p.type || 'button', className: cls, disabled: p.disabled, onClick: p.onClick, 'aria-label': p.ariaLabel }, inhalt);
  }

  function Card(p) {
    return h('section', { className: cx('pl-card', p.tone === 'panel' && 'pl-card--panel', p.className) },
      (p.title || p.meta || p.actions) ? h('div', { className: 'pl-card__head' },
        p.title ? h('h2', { className: 'pl-card__title' }, p.title) : null,
        p.meta ? h('span', { className: 'pl-card__meta' }, p.meta) : null,
        p.actions || null) : null,
      p.children);
  }

  // Ladezustand: graue Flächen in der Form des späteren Inhalts. Die Flächen sind für Screenreader ausgeblendet; label sagt einmal, was lädt.
  function Skeleton(p) {
    var v = p.variant || 'text';
    if (v === 'zahl') return h('span', { className: 'pl-skel pl-skel--zahl' }, h('span', { className: 'pl-sr' }, p.label || 'lädt'));
    var n = p.rows || (v === 'text' ? 3 : v === 'zeile' ? 8 : 1), teile = [];
    for (var i = 0; i < n; i++) teile.push(h('span', { key: i, className: 'pl-skel pl-skel--' + v, 'aria-hidden': 'true' }));
    return h('div', { className: 'pl-skel-gruppe' }, p.label ? h('span', { className: 'pl-sr', role: 'status' }, p.label) : null, teile);
  }

  // Leerer Zustand einer Liste: was fehlt, ein Satz dazu, und der nächste Schritt als Button.
  function EmptyState(p) {
    return h('div', { className: 'pl-empty', role: 'status' },
      h('div', { className: 'pl-empty__titel' }, p.title),
      p.text ? h('p', { className: 'pl-empty__text' }, p.text) : null,
      p.actionLabel ? h(Button, { href: p.href, onClick: p.onAction, icon: p.icon }, p.actionLabel) : null);
  }

  // Meldung am unteren Bildschirmrand, dort sichtbar, wo gerade gearbeitet wird. Der Bereich ist immer im Dokument,
  // damit Screenreader eine neue Meldung vorlesen; ohne Inhalt ist er leer und unsichtbar.
  function Meldezeile(p) {
    var fehler = p.tone === 'fehler';
    return h('div', { className: 'pl-melde', role: 'status', 'aria-live': fehler ? 'assertive' : 'polite', 'aria-atomic': 'true' },
      p.children ? h('div', { className: cx('pl-melde__box', fehler && 'pl-melde__box--fehler') },
        h('span', { className: 'pl-melde__text' }, p.children),
        p.actionLabel ? h('button', { type: 'button', className: 'pl-melde__knopf', onClick: p.onAction }, p.actionLabel) : null,
        p.onClose ? h('button', { type: 'button', className: 'pl-melde__knopf pl-melde__knopf--zu', 'aria-label': 'Meldung schliessen', onClick: p.onClose }, '\u00d7') : null) : null);
  }

  function KpiTile(p) {
    return h('div', { className: cx('pl-kpi', p.tone === 'panel' && 'pl-kpi--panel') },
      h('div', { className: 'pl-kpi__label' }, p.label),
      h('div', { className: 'pl-kpi__value' }, p.value),
      p.detail ? h('div', { className: 'pl-kpi__detail' }, p.detail) : null);
  }

  function StatusPill(p) {
    return h('span', { className: cx('pl-pill', 'pl-pill--' + (p.status || 'neutral')) }, p.children);
  }

  var LOC = { zentral: 'Zentralküche', vorort: 'Vor Ort', logistik: 'Logistik' };
  function LocationTag(p) {
    var loc = p.location || 'zentral';
    return h('span', { className: cx('pl-loc', 'pl-loc--' + loc) },
      h('span', { className: 'pl-loc__swatch', 'aria-hidden': 'true' }), p.children || LOC[loc]);
  }

  function SegmentedControl(p) {
    var st = React.useState(p.defaultValue != null ? p.defaultValue : (p.options[0] && p.options[0].value));
    var value = p.value != null ? p.value : st[0];
    var refs = React.useRef([]);
    var cur = 0;
    for (var i = 0; i < p.options.length; i++) if (p.options[i].value === value) cur = i;
    function pick(i) {
      var o = p.options[i];
      st[1](o.value); if (p.onChange) p.onChange(o.value);
      if (refs.current[i]) refs.current[i].focus();
    }
    // Tastatur wie eine Radiogruppe: ein Tab-Stopp, Pfeiltasten wechseln die Auswahl.
    function onKeyDown(e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      pick((cur + d + p.options.length) % p.options.length);
    }
    return h('div', { className: 'pl-seg', role: 'radiogroup', 'aria-label': p.label, onKeyDown: onKeyDown },
      p.options.map(function (o, i) {
        return h('button', {
          key: o.value, type: 'button', role: 'radio', className: 'pl-seg__opt',
          ref: function (el) { refs.current[i] = el; },
          tabIndex: i === cur ? 0 : -1,
          'aria-checked': String(o.value === value),
          onClick: function () { pick(i); }
        }, o.label);
      }));
  }

  var fid = 0;
  function TextField(p) {
    var id = React.useMemo(function () { return p.id || ('pl-f-' + (++fid)); }, [p.id]);
    return h('div', { className: 'pl-field' },
      h('label', { className: 'pl-field__label', htmlFor: id }, p.label),
      p.multiline
        ? h('textarea', { id: id, name: p.name, required: p.required, rows: p.rows || 3, className: 'pl-field__input pl-field__input--multiline', defaultValue: p.defaultValue, value: p.value, onChange: p.onChange, placeholder: p.placeholder,
            'aria-describedby': p.hint ? id + '-hint' : undefined, 'aria-invalid': p.invalid ? 'true' : undefined })
        : h('input', { id: id, type: p.type || 'text', name: p.name, autoComplete: p.autoComplete, required: p.required, className: cx('pl-field__input', (p.numeric || p.code) && 'pl-field__input--mono', p.code && 'pl-field__input--code'), defaultValue: p.defaultValue, value: p.value, onChange: p.onChange, placeholder: p.placeholder, inputMode: p.code ? 'numeric' : p.numeric ? 'decimal' : undefined,
            'aria-describedby': p.hint ? id + '-hint' : undefined, 'aria-invalid': p.invalid ? 'true' : undefined }),
      p.hint ? h('div', { id: id + '-hint', className: cx('pl-field__hint', p.invalid && 'pl-field__hint--invalid'), role: p.invalid ? 'alert' : undefined }, p.hint) : null);
  }

  function Select(p) {
    var id = React.useMemo(function () { return p.id || ('pl-f-' + (++fid)); }, [p.id]);
    return h('div', { className: 'pl-field' },
      h('label', { className: 'pl-field__label', htmlFor: id }, p.label),
      h('select', { id: id, name: p.name, className: 'pl-field__input pl-select', value: p.value, defaultValue: p.defaultValue,
        'aria-describedby': p.hint ? id + '-hint' : undefined,
        onChange: function (e) { if (p.onChange) p.onChange(e.target.value); } },
        p.options.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); })),
      p.hint ? h('div', { id: id + '-hint', className: 'pl-field__hint' }, p.hint) : null);
  }

  // Modaler Dialog über das native <dialog>: Fokus bleibt im Dialog, Escape schliesst.
  var did = 0;
  function Dialog(p) {
    var ref = React.useRef(null);
    var id = React.useMemo(function () { return p.id || ('pl-d-' + (++did)); }, [p.id]);
    React.useEffect(function () {
      var d = ref.current;
      if (!d) return;
      if (p.open && !d.open) d.showModal();
      if (!p.open && d.open) d.close();
    }, [p.open]);
    return h('dialog', { ref: ref, className: 'pl-dialog', 'aria-labelledby': id + '-titel',
      onClose: function () { if (p.onClose) p.onClose(); },
      onCancel: function (e) { if (p.onCancel) p.onCancel(e); } },
      p.open ? [
        h('div', { key: 'k', className: 'pl-dialog__head' },
          h('h2', { id: id + '-titel', className: 'pl-dialog__title' }, p.title),
          p.meta ? h('span', { className: 'pl-card__meta' }, p.meta) : null),
        h('div', { key: 'b', className: 'pl-dialog__body' }, p.children),
        p.actions ? h('div', { key: 'a', className: 'pl-dialog__actions' }, p.actions) : null
      ] : null);
  }

  function DetailPanel(p) {
    // Wechselt die Zeile (itemKey, sonst der Titel als Text), blendet der Inhalt kurz über. Zwei gleiche Animationen im Wechsel,
    // damit sie neu startet, ohne den Inhalt neu aufzubauen (Eingaben im Formular bleiben).
    var k = p.itemKey != null ? p.itemKey : (typeof p.title === 'string' ? p.title : '');
    var z = React.useRef({ k: k, n: 0 });
    if (z.current.k !== k) z.current = { k: k, n: z.current.n + 1 };
    return h('section', { className: cx('pl-panel', z.current.n % 2 === 1 && 'pl-panel--b'), 'aria-label': p.label || 'Detail' },
      h('div', { className: 'pl-panel__head' },
        h('div', null,
          p.meta ? h('div', { className: 'pl-crumb' }, p.meta) : null,
          h('h2', { className: 'pl-panel__title' }, p.title)),
        p.onClose ? h('button', { type: 'button', className: 'pl-panel__close', 'aria-label': 'Detail schliessen', onClick: p.onClose }, h(Icon, { name: 'close' })) : null),
      h('div', { className: 'pl-panel__body' }, p.children),
      p.actions ? h('div', { className: 'pl-panel__actions' }, p.actions) : null);
  }

  function Fieldset(p) {
    return h('fieldset', { className: 'pl-fieldset' },
      h('legend', { className: 'pl-field__label' }, p.legend),
      h('div', { className: 'pl-fieldset__body' }, p.children),
      p.hint ? h('div', { className: 'pl-field__hint' }, p.hint) : null);
  }

  // Auswahlliste links neben einer Detailansicht (Rezepte, Katalog). Gewählter Eintrag mit aria-current.
  function ItemList(p) {
    var basis = React.useId();
    return h('nav', { className: 'pl-items', 'aria-label': p.label },
      p.groups.map(function (g, gi) {
        var tid = basis + '-g' + gi;
        return h('div', { key: gi, role: 'group', 'aria-labelledby': g.title ? tid : undefined, className: 'pl-items__group' },
          g.title ? h('div', { id: tid, className: 'pl-eyebrow pl-items__title' }, g.title) : null,
          g.items.map(function (it) {
            return h('button', { key: it.id, type: 'button', className: 'pl-items__item',
              'aria-current': it.id === p.value ? 'true' : undefined,
              onClick: function () { if (p.onSelect) p.onSelect(it.id); } },
              h('span', { className: 'pl-items__label' }, it.label),
              it.sub ? h('span', { className: 'pl-small' }, it.sub) : null);
          }));
      }));
  }

  function Chip(p) {
    return h('span', { className: cx('pl-chip', p.kind && p.kind !== 'neutral' && 'pl-chip--' + p.kind) }, p.children);
  }

  // Rezept: je Gruppe links die Zutaten (Menge, Skalierungs-%), rechts die nummerierten Schritte.
  function RecipeGroups(p) {
    var n = 1;
    return h('div', { className: 'pl-recipe' },
      h('div', { className: 'pl-recipe__head', 'aria-hidden': 'true' },
        h('div', { className: 'pl-recipe__ing' },
          h('span', null, 'Zutat'), h('span', { className: 'pl-recipe__num' }, 'Menge'),
          h('span', { className: 'pl-recipe__num' }, p.pctLabel || 'Skal.')),
        h('span', null, 'Zubereitung')),
      p.groups.map(function (g, gi) {
        var start = n; n += g.steps.length;
        return h('section', { key: g.id || gi, className: 'pl-recipe__group', 'aria-label': g.title || ('Schritte ' + start + '–' + (n - 1)) },
          h('div', { className: 'pl-recipe__ings' },
            g.title ? h('div', { className: 'pl-eyebrow' }, g.title) : null,
            g.ingredients.map(function (i) {
              return h('div', { key: i.id, className: 'pl-recipe__ing' },
                h('span', { className: i.base ? 'pl-recipe__base' : undefined }, i.name,
                  i.base ? h('span', { className: 'pl-sr' }, ' (Basis 100 %)') : null,
                  i.note ? h('span', { className: 'pl-small pl-recipe__note' }, i.note) : null),
                h('span', { className: cx('pl-mono pl-recipe__num', i.assumed && 'pl-assumed') },
                  h('span', { className: 'pl-sr' }, 'Menge '), i.amount, i.assumed ? h('span', { className: 'pl-sr' }, ' (Annahme)') : null),
                h('span', { className: 'pl-mono pl-recipe__num pl-recipe__pct' }, i.pct ? [h('span', { key: 's', className: 'pl-sr' }, 'Skalierung '), i.pct] : ''));
            })),
          h('ol', { className: 'pl-recipe__steps', start: start },
            g.steps.map(function (s) {
              return h('li', { key: s.id },
                h('span', { className: s.assumed ? 'pl-assumed' : undefined }, s.text),
                s.assumed ? h('span', { className: 'pl-sr' }, ' (Annahme)') : null,
                s.chips && s.chips.length ? h('span', { className: 'pl-recipe__chips' }, s.chips) : null);
            })));
      }));
  }

  function Checkbox(p) {
    return h('label', { className: 'pl-check' },
      h('input', { type: 'checkbox', defaultChecked: p.defaultChecked, checked: p.checked, onChange: p.onChange }), p.label);
  }

  function DataTable(p) {
    if (p.empty && !p.loading && !p.rows.length) return p.empty;
    return h('div', { className: 'pl-table-wrap' },
      h('table', { className: 'pl-table' },
        h('thead', null, h('tr', null, p.columns.map(function (c) {
          var kann = c.sortable && p.onSort;
          var ist = p.sort && p.sort.key === c.key;
          return h('th', { key: c.key, scope: 'col', className: cx(c.numeric && 'pl-num', c.printHidden && 'pl-print-hide') || undefined,
            'aria-sort': kann ? (ist ? (p.sort.dir === 'ab' ? 'descending' : 'ascending') : 'none') : undefined },
            kann ? h('button', { type: 'button', className: 'pl-table__sort', onClick: function () { p.onSort(c.key); } },
              c.label, ist ? h(Icon, { name: p.sort.dir === 'ab' ? 'sort-down' : 'sort-up' }) : null) : c.label);
        }))),
        h('tbody', null, p.loading ? [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
          return h('tr', { key: i, 'aria-hidden': 'true' }, p.columns.map(function (c) {
            return h('td', { key: c.key, className: cx(c.numeric && 'pl-num', c.printHidden && 'pl-print-hide') || undefined }, h('span', { className: 'pl-skel pl-skel--zelle' }));
          }));
        }) : p.rows.map(function (r, i) {
          // rowHref: die ganze Zeile führt zum Ziel. Der Link in der Zeile bleibt für Tastatur und Screenreader; Klicks auf Bedienelemente zählen nicht.
          var ziel = p.rowHref ? p.rowHref(r) : null;
          return h('tr', { key: r.id || i, className: cx(p.isSelected && p.isSelected(r) && 'pl-table__row--selected', ziel && 'pl-table__row--link') || undefined,
            onClick: ziel ? function (e) {
              if (e.target.closest('a, button, input, select, textarea, label')) return;
              // Text markieren (zum Kopieren) ist kein Klick auf die Zeile; mit Zusatztaste öffnet der Link wie gewohnt in einem neuen Tab.
              if (root.getSelection && String(root.getSelection())) return;
              if (e.metaKey || e.ctrlKey || e.shiftKey) { root.open(ziel, '_blank', 'noopener'); return; }
              root.location.assign(ziel);
            } : undefined }, p.columns.map(function (c) {
            var v = c.render ? c.render(r) : r[c.key];
            return h('td', { key: c.key, className: cx(c.numeric && 'pl-num', c.printHidden && 'pl-print-hide') || undefined }, v,
              c.subKey && r[c.subKey] ? h('span', { className: 'pl-sub' }, r[c.subKey]) : null);
          }));
        }))));
  }

  function Timeline(p) {
    var start = p.start, end = p.end, span = end - start, step = p.step || 2;
    var pos = function (t) { return ((t - start) / span * 100) + '%'; };
    var ticks = [];
    for (var t = start; t <= end; t += step) ticks.push(t);
    var fmt = function (t) { var hh = Math.floor(t) % 24, mm = Math.round((t % 1) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; };
    return h('div', { className: 'pl-table-wrap' }, h('div', { className: 'pl-tl' },
      h('div', { className: 'pl-tl__axis' }, h('div', { className: 'pl-tl__label' }),
        h('div', { className: 'pl-tl__track', style: { height: 18 } }, ticks.map(function (t) {
          return h('span', { key: t, className: 'pl-tl__tick', style: { left: pos(t) } }, fmt(t));
        }))),
      h('div', { style: { position: 'relative' } },
        p.lanes.map(function (l) {
          return h('div', { key: l.name, className: 'pl-tl__row' },
            h('div', { className: 'pl-tl__label' }, l.name),
            h('div', { className: 'pl-tl__track' }, l.bars.map(function (b, i) {
              return h('div', { key: i, className: 'pl-tl__bar pl-tl__bar--' + (b.location || 'zentral'), title: b.label + ' · ' + fmt(b.from) + '–' + fmt(b.to),
                style: { left: pos(b.from), width: 'calc(' + ((b.to - b.from) / span * 100) + '% - 3px)' } }, b.label);
            })));
        }),
        p.marker != null ? h('div', { className: 'pl-tl__marker', 'aria-hidden': 'true', style: { left: 'calc(160px + (100% - 160px) * ' + ((p.marker - start) / span) + ')' } }) : null)));
  }

  function SideNav(p) {
    return h('nav', { className: 'pl-nav', 'aria-label': 'Hauptnavigation' },
      h('div', { className: 'pl-nav__brand' }, h('span', { className: 'pl-nav__mark', 'aria-hidden': 'true' }),
        h('div', null, p.product || 'Produktionsplaner', h('small', null, p.company || 'GAMMA Catering'))),
      p.items.map(function (it) {
        if (it.disabled) return h('span', { key: it.label, className: 'pl-nav__item pl-nav__item--disabled' }, it.label);
        return h('a', { key: it.label, className: 'pl-nav__item', href: it.href || '#', 'aria-current': it.current ? 'page' : undefined }, it.label);
      }));
  }

  // Marke: Bildmarke (Datei design-system/assets/bildmarke.svg, in der App unter /brand/) plus Wortmarke und Produktname.
  function Brand(p) {
    var gross = p.size === 'lg';
    var inhalt = [
      p.src ? h('img', { key: 'm', className: cx('pl-brand__mark', p.mono && 'pl-brand__mark--mono'), src: p.src, alt: '', width: gross ? 56 : 28, height: gross ? 56 : 28 })
        : h('span', { key: 'm', className: 'pl-brand__mark pl-brand__mark--platzhalter', 'aria-hidden': 'true' }),
      h('span', { key: 't', className: 'pl-brand__text' },
        h('span', { className: 'pl-brand__name' }, p.company || 'GAMMA Catering'),
        p.product === null ? null : h('span', { className: 'pl-brand__product' }, p.product || 'Produktionsplaner'))
    ];
    var cls = cx('pl-brand', gross && 'pl-brand--lg');
    return p.href ? h('a', { className: cls, href: p.href }, inhalt) : h('div', { className: cls }, inhalt);
  }

  function TopNav(p) {
    var st = React.useState(false), offen = st[0], setOffen = st[1];
    return h('header', { className: 'pl-top' },
      h(Brand, { href: '/', src: p.brandSrc, mono: p.brandMono, company: p.company }),
      h('button', { type: 'button', className: 'pl-top__toggle', 'aria-expanded': offen, 'aria-controls': 'pl-top-menu', onClick: function () { setOffen(!offen); } }, 'Menü'),
      h('nav', { id: 'pl-top-menu', className: cx('pl-top__nav', offen && 'pl-top__nav--offen'), 'aria-label': 'Hauptnavigation' },
        p.items.map(function (it) {
          return h('a', { key: it.label, className: 'pl-top__item', href: it.href, 'aria-current': it.current ? 'page' : undefined }, it.label);
        })),
      p.actions ? h('div', { className: 'pl-top__actions' }, p.actions) : null);
  }

  // Benutzer-Menü in der Kopfzeile: Kürzel im Kreis, geöffnet Name, E-Mail und «Abmelden». Unter 760 px steht der Inhalt offen im Menü der TopNav.
  function UserMenu(p) {
    var st = React.useState(false), offen = st[0], setOffen = st[1];
    var ref = React.useRef(null);
    React.useEffect(function () {
      if (!offen) return;
      function weg(e) {
        if (e.type === 'keydown' ? e.key !== 'Escape' : (!ref.current || ref.current.contains(e.target))) return;
        // Bei Escape zurück auf den Knopf, sonst fällt der Fokus mit dem ausgeblendeten Menü weg.
        var knopf = e.type === 'keydown' && ref.current ? ref.current.querySelector('.pl-user__knopf') : null;
        setOffen(false);
        if (knopf) knopf.focus();
      }
      document.addEventListener('pointerdown', weg);
      document.addEventListener('keydown', weg);
      return function () { document.removeEventListener('pointerdown', weg); document.removeEventListener('keydown', weg); };
    }, [offen]);
    var kuerzel = ((p.name || p.email || '?').trim().charAt(0) || '?').toUpperCase();
    return h('div', { className: 'pl-user', ref: ref },
      h('button', { type: 'button', className: 'pl-user__knopf', 'aria-expanded': offen, 'aria-controls': 'pl-user-menu', 'aria-label': 'Benutzer-Menü', onClick: function () { setOffen(!offen); } },
        h('span', { 'aria-hidden': 'true' }, kuerzel)),
      h('div', { id: 'pl-user-menu', className: cx('pl-user__menu', offen && 'pl-user__menu--offen') },
        h('div', { className: 'pl-user__wer' },
          p.name ? h('span', { className: 'pl-user__name' }, p.name) : null,
          p.email ? h('span', { className: 'pl-small' }, p.email) : null),
        h(Button, { onClick: p.onSignOut }, p.signOutLabel || 'Abmelden')));
  }

  function Tabs(p) {
    if (!p.items || !p.items.length) return null;
    return h('nav', { className: cx('pl-tabs', p.tone === 'sunken' && 'pl-tabs--sunken'), 'aria-label': p.label },
      p.items.map(function (it) {
        return h('a', { key: it.label, className: 'pl-tabs__item', href: it.href, 'aria-current': it.current ? 'page' : undefined }, it.label);
      }));
  }

  function Notice(p) {
    return h('section', { className: 'pl-notice', role: p.role },
      p.title ? h('h3', { className: 'pl-notice__title' }, p.title) : null,
      p.items ? h('ul', null, p.items.map(function (x, i) { return h('li', { key: i }, x); })) : p.children,
      p.detail ? h('details', { className: 'pl-notice__detail' }, h('summary', null, 'Technische Angaben'), h('code', null, p.detail)) : null);
  }

  root.Planer = { Button: Button, Card: Card, KpiTile: KpiTile, StatusPill: StatusPill, LocationTag: LocationTag, SegmentedControl: SegmentedControl, TextField: TextField, Checkbox: Checkbox, DataTable: DataTable, Timeline: Timeline, SideNav: SideNav, Notice: Notice, Select: Select, Dialog: Dialog, Fieldset: Fieldset, ItemList: ItemList, Chip: Chip, RecipeGroups: RecipeGroups, TopNav: TopNav, Tabs: Tabs, DetailPanel: DetailPanel, Brand: Brand, Icon: Icon, UserMenu: UserMenu, Skeleton: Skeleton, EmptyState: EmptyState, Meldezeile: Meldezeile };
  if (typeof module === 'object' && module.exports) module.exports = root.Planer;
})();
