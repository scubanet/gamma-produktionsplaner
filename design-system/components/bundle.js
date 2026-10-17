/* @ds-bundle: {"format":4,"namespace":"Planer","components":[{"name":"Button"},{"name":"Card"},{"name":"KpiTile"},{"name":"StatusPill"},{"name":"LocationTag"},{"name":"SegmentedControl"},{"name":"TextField"},{"name":"Checkbox"},{"name":"DataTable"},{"name":"Timeline"},{"name":"SideNav"},{"name":"Notice"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  function Button(p) {
    var variant = p.variant || 'secondary';
    var cls = cx('pl-btn', 'pl-btn--' + variant, p.className);
    if (p.href) return h('a', { className: cls, href: p.href }, p.children);
    return h('button', { type: p.type || 'button', className: cls, disabled: p.disabled, onClick: p.onClick }, p.children);
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
    return h('div', { className: 'pl-seg', role: 'radiogroup', 'aria-label': p.label },
      p.options.map(function (o) {
        return h('button', {
          key: o.value, type: 'button', role: 'radio', className: 'pl-seg__opt',
          'aria-checked': String(o.value === value),
          onClick: function () { st[1](o.value); if (p.onChange) p.onChange(o.value); }
        }, o.label);
      }));
  }

  var fid = 0;
  function TextField(p) {
    var id = React.useMemo(function () { return p.id || ('pl-f-' + (++fid)); }, [p.id]);
    return h('div', { className: 'pl-field' },
      h('label', { className: 'pl-field__label', htmlFor: id }, p.label),
      h('input', { id: id, className: cx('pl-field__input', p.numeric && 'pl-field__input--mono'), defaultValue: p.defaultValue, value: p.value, onChange: p.onChange, placeholder: p.placeholder, inputMode: p.numeric ? 'numeric' : undefined }),
      p.hint ? h('div', { className: 'pl-field__hint' }, p.hint) : null);
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
    return h('section', { className: 'pl-notice' },
      p.title ? h('h3', { className: 'pl-notice__title' }, p.title) : null,
      p.items ? h('ul', null, p.items.map(function (x, i) { return h('li', { key: i }, x); })) : p.children);
  }

  window.Planer = { Button: Button, Card: Card, KpiTile: KpiTile, StatusPill: StatusPill, LocationTag: LocationTag, SegmentedControl: SegmentedControl, TextField: TextField, Checkbox: Checkbox, DataTable: DataTable, Timeline: Timeline, SideNav: SideNav, Notice: Notice };
})();
