/* @ds-bundle: {"format":4,"namespace":"Planer","components":[{"name":"Button"},{"name":"Card"},{"name":"KpiTile"},{"name":"StatusPill"},{"name":"LocationTag"},{"name":"SegmentedControl"},{"name":"TextField"},{"name":"Checkbox"},{"name":"DataTable"},{"name":"Timeline"},{"name":"SideNav"},{"name":"Notice"},{"name":"Select"},{"name":"Dialog"},{"name":"Fieldset"},{"name":"ItemList"},{"name":"Chip"},{"name":"RecipeGroups"}]} */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var React = root.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  function Button(p) {
    var variant = p.variant || 'secondary';
    var cls = cx('pl-btn', 'pl-btn--' + variant, p.className);
    if (p.href) return h('a', { className: cls, href: p.href, 'aria-label': p.ariaLabel }, p.children);
    return h('button', { type: p.type || 'button', className: cls, disabled: p.disabled, onClick: p.onClick, 'aria-label': p.ariaLabel }, p.children);
  }

  function Card(p) {
    return h('section', { className: cx('pl-card', p.tone === 'panel' && 'pl-card--panel', p.className) },
      (p.title || p.meta || p.actions) ? h('div', { className: 'pl-card__head' },
        p.title ? h('h2', { className: 'pl-card__title' }, p.title) : null,
        p.meta ? h('span', { className: 'pl-card__meta' }, p.meta) : null,
        p.actions || null) : null,
      p.children);
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
      h('input', { id: id, type: p.type || 'text', name: p.name, autoComplete: p.autoComplete, required: p.required, className: cx('pl-field__input', p.numeric && 'pl-field__input--mono'), defaultValue: p.defaultValue, value: p.value, onChange: p.onChange, placeholder: p.placeholder, inputMode: p.numeric ? 'decimal' : undefined,
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
    return h('div', { className: 'pl-table-wrap' },
      h('table', { className: 'pl-table' },
        h('thead', null, h('tr', null, p.columns.map(function (c) {
          return h('th', { key: c.key, className: c.numeric ? 'pl-num' : undefined }, c.label);
        }))),
        h('tbody', null, p.rows.map(function (r, i) {
          return h('tr', { key: r.id || i }, p.columns.map(function (c) {
            var v = c.render ? c.render(r) : r[c.key];
            return h('td', { key: c.key, className: c.numeric ? 'pl-num' : undefined }, v,
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

  function Notice(p) {
    return h('section', { className: 'pl-notice', role: p.role },
      p.title ? h('h3', { className: 'pl-notice__title' }, p.title) : null,
      p.items ? h('ul', null, p.items.map(function (x, i) { return h('li', { key: i }, x); })) : p.children);
  }

  root.Planer = { Button: Button, Card: Card, KpiTile: KpiTile, StatusPill: StatusPill, LocationTag: LocationTag, SegmentedControl: SegmentedControl, TextField: TextField, Checkbox: Checkbox, DataTable: DataTable, Timeline: Timeline, SideNav: SideNav, Notice: Notice, Select: Select, Dialog: Dialog, Fieldset: Fieldset, ItemList: ItemList, Chip: Chip, RecipeGroups: RecipeGroups };
  if (typeof module === 'object' && module.exports) module.exports = root.Planer;
})();
