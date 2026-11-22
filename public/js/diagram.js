/* Animated AWS-style architecture diagrams.
 *
 * Diagram.register('name', {
 *   w, h,
 *   groups: [{ id, kind, x, y, w, h, label, sub }],      kind: cloud|region|vpc|az|public|private|sg|account|plain|planned|box
 *   nodes:  [{ id, icon, x, y, label, sub, planned }],   x,y = centre of the icon. Or { id, chip:'text', x, y }
 *   edges:  [{ id, from, to, label, dashed, ghost, mid, via }],   from/to = 'id', 'id:side' or 'id:side:offset'
 *   notes:  [{ x, y, text, kind }],
 *   steps:  [{ title, text, path:['e1','-e2'], paths:[[..],[..]], focus:[ids], blocked, stop, at:[x,y] }]
 * })
 * A '-' before an edge name sends the packet backwards along it.
 */
window.Diagram = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const defs = {};
  let uid = 0;

  const STYLE = {
    cloud: { stroke: '#232f3e', width: 1.6 },
    region: { stroke: '#00a4a6', dash: '5 4' },
    account: { stroke: '#e7157b' },
    vpc: { stroke: '#8c4fff', width: 1.6 },
    az: { stroke: '#147eba', dash: '7 5', center: true },
    public: { stroke: '#7aa116', fill: '#f2f6e8', nostroke: true },
    private: { stroke: '#00a4a6', fill: '#e6f6f7', nostroke: true },
    sg: { stroke: '#dd344c', dash: '4 3' },
    plain: { stroke: '#7d8998', dash: '5 4' },
    planned: { stroke: '#d9860a', dash: '6 4', fill: '#fff8e6' },
    box: { stroke: '#232f3e', fill: '#fbfbfb' },
  };
  const C = { base: '#545b64', hl: '#e8590c', bad: '#d6293e', ink: '#232f3e' };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, cls, anchor) {
    const t = el('text', { x, y, class: cls, 'text-anchor': anchor || 'middle' }, parent);
    t.textContent = str;
    return t;
  }
  function pathD(pts) {
    let d = 'M' + pts[0].x + ',' + pts[0].y;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const d1 = Math.hypot(p.x - a.x, p.y - a.y), d2 = Math.hypot(b.x - p.x, b.y - p.y);
      if (!d1 || !d2) continue;
      const r = Math.min(9, d1 / 2, d2 / 2);
      d += ' L' + (p.x - ((p.x - a.x) / d1) * r) + ',' + (p.y - ((p.y - a.y) / d1) * r) +
        ' Q' + p.x + ',' + p.y + ' ' + (p.x + ((b.x - p.x) / d2) * r) + ',' + (p.y + ((b.y - p.y) / d2) * r);
    }
    const l = pts[pts.length - 1];
    return d + ' L' + l.x + ',' + l.y;
  }

  function Player(host, spec) {
    const id = 'dg' + ++uid;
    const R = {}; // id -> rect
    const E = {}; // id -> edge
    const steps = spec.steps || [];
    host.innerHTML = '';
    host.classList.add('dg');

    const scroller = document.createElement('div');
    scroller.className = 'dg-scroll';
    host.appendChild(scroller);
    const svg = el('svg', { viewBox: '0 0 ' + spec.w + ' ' + spec.h, class: 'dg-svg', role: 'img' }, scroller);
    svg.style.minWidth = Math.min(spec.w, 620) + 'px';

    const d = el('defs', {}, svg);
    for (const k of ['base', 'hl', 'bad']) {
      const m = el('marker', { id: id + '-' + k, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, d);
      el('path', { d: 'M0,0.5 L10,5 L0,9.5 z', fill: C[k] }, m);
    }
    const L = {};
    for (const k of ['groups', 'edges', 'hl', 'nodes', 'notes', 'badges', 'pkts']) L[k] = el('g', { class: 'dg-' + k }, svg);

    // ---- groups
    (spec.groups || []).forEach((g) => {
      const st = STYLE[g.kind] || STYLE.plain;
      const gg = el('g', { class: 'dg-group', 'data-id': g.id }, L.groups);
      el('rect', {
        x: g.x, y: g.y, width: g.w, height: g.h, rx: 3,
        fill: st.fill || 'none', stroke: st.nostroke ? 'none' : st.stroke,
        'stroke-width': st.width || 1.3, 'stroke-dasharray': st.dash,
      }, gg);
      const icon = GROUP_ICONS[g.kind];
      const ly = g.labelPos === 'b' ? g.y + g.h - 9 : g.y + 18;
      if (st.center) {
        text(gg, g.x + g.w / 2, ly, g.label, 'dg-glabel', 'middle').setAttribute('fill', st.stroke);
      } else {
        let lx = g.x + 10;
        if (icon) {
          el('image', { href: icon, x: g.x, y: g.labelPos === 'b' ? g.y + g.h - 26 : g.y, width: 26, height: 26 }, gg);
          lx = g.x + 34;
        }
        const t = text(gg, lx, ly, g.label, 'dg-glabel', 'start');
        t.setAttribute('fill', g.kind === 'box' || g.kind === 'cloud' ? C.ink : st.stroke);
        if (g.sub) {
          const s = el('tspan', { class: 'dg-gsub', dx: 8 }, t);
          s.textContent = g.sub;
        }
      }
      R[g.id] = { x: g.x, y: g.y, w: g.w, h: g.h, cx: g.x + g.w / 2, cy: g.y + g.h / 2, gap: 0, el: gg, group: true };
    });

    // ---- nodes
    (spec.nodes || []).forEach((n) => {
      const gn = el('g', { class: 'dg-node' + (n.planned ? ' planned' : ''), 'data-id': n.id }, L.nodes);
      if (n.chip) {
        const lines = n.chip.split('\n');
        const w = n.w || Math.max(...lines.map((l) => l.length)) * 6.7 + 22;
        const h = 14 + lines.length * 15;
        el('rect', { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 6, class: 'dg-chip' + (n.tone ? ' ' + n.tone : '') }, gn);
        lines.forEach((l, i) => text(gn, n.x, n.y - (lines.length - 1) * 7.5 + i * 15 + 4, l, 'dg-chiptext'));
        R[n.id] = { x: n.x - w / 2, y: n.y - h / 2, w, h, cx: n.x, cy: n.y, gap: 3, el: gn };
        return;
      }
      const s = n.size || 48;
      const x0 = n.x - s / 2, y0 = n.y - s / 2;
      el('rect', { x: x0 - 5, y: y0 - 5, width: s + 10, height: s + 10, rx: 8, class: 'dg-ring' }, gn);
      const src = ICONS[n.icon] || n.icon;
      if (src.indexOf('logos/') > -1) el('rect', { x: x0, y: y0, width: s, height: s, rx: 6, fill: '#fff', stroke: '#d5dbdb' }, gn);
      const inset = src.indexOf('logos/') > -1 ? 9 : 0;
      el('image', { href: src, x: x0 + inset, y: y0 + inset, width: s - inset * 2, height: s - inset * 2 }, gn);
      const lab = (n.label || '').split('\n').filter(Boolean);
      const sub = (n.sub || '').split('\n').filter(Boolean);
      const labH = lab.length * 14 + sub.length * 12.5;
      const above = n.labelPos === 't';
      const pad = n.planned ? 5 : 0;
      let ty = above ? y0 - 7 - pad - labH + 11 : y0 + s + 15 + pad;
      lab.forEach((l) => { text(gn, n.x, ty, l, 'dg-label'); ty += 14; });
      ty -= 1;
      sub.forEach((l) => { text(gn, n.x, ty, l, 'dg-sub'); ty += 12.5; });
      if (n.planned) {
        el('rect', { x: x0 - 5, y: y0 - 5, width: s + 10, height: s + 10, rx: 8, class: 'dg-planned-ring' }, gn);
      }
      R[n.id] = { x: x0, y: y0, w: s, h: s, cx: n.x, cy: n.y, gap: 5, el: gn, top: above ? labH + 4 + pad : 0, bot: above ? 0 : labH + 4 + pad };
    });

    // ---- edges
    function anchor(ref, otherRef) {
      const parts = ref.split(':');
      const r = R[parts[0]];
      if (!r) throw new Error('diagram: unknown id ' + parts[0]);
      let side = parts[1];
      const off = +parts[2] || 0;
      if (!side) {
        const o = R[otherRef.split(':')[0]];
        const dx = o.cx - r.cx, dy = o.cy - r.cy;
        side = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'b' : 't';
      }
      const g = r.gap;
      const p = side === 'l' ? { x: r.x - g, y: r.cy + off }
        : side === 'r' ? { x: r.x + r.w + g, y: r.cy + off }
        : side === 't' ? { x: r.cx + off, y: r.y - g - (r.top || 0) }
        : { x: r.cx + off, y: r.y + r.h + g + (r.bot || 0) };
      return { p, side };
    }
    const horiz = (s) => s === 'l' || s === 'r';
    (spec.edges || []).forEach((e) => {
      const a = anchor(e.from, e.to), b = anchor(e.to, e.from);
      let pts;
      if (e.via) pts = [a.p].concat(e.via.map((v) => ({ x: v[0], y: v[1] })), [b.p]);
      else if (horiz(a.side) && horiz(b.side)) {
        const mx = e.mid != null ? e.mid : (a.p.x + b.p.x) / 2;
        pts = a.p.y === b.p.y ? [a.p, b.p] : [a.p, { x: mx, y: a.p.y }, { x: mx, y: b.p.y }, b.p];
      } else if (!horiz(a.side) && !horiz(b.side)) {
        const my = e.mid != null ? e.mid : (a.p.y + b.p.y) / 2;
        pts = a.p.x === b.p.x ? [a.p, b.p] : [a.p, { x: a.p.x, y: my }, { x: b.p.x, y: my }, b.p];
      } else if (horiz(a.side)) pts = [a.p, { x: b.p.x, y: a.p.y }, b.p];
      else pts = [a.p, { x: a.p.x, y: b.p.y }, b.p];

      const dd = pathD(pts);
      const base = el('path', {
        d: dd, class: 'dg-edge' + (e.ghost ? ' ghost' : ''), 'stroke-dasharray': e.dashed ? '5 4' : null,
        'marker-end': e.ghost ? null : 'url(#' + id + '-base)', 'marker-start': e.both ? 'url(#' + id + '-base)' : null,
      }, L.edges);
      const hl = el('path', { d: dd, class: 'dg-edge-hl' }, L.hl);
      if (e.label) {
        // put the label on the longest segment
        let best = 0, bi = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
          if (len > best) { best = len; bi = i; }
        }
        const p = pts[bi], q = pts[bi + 1];
        const vertical = Math.abs(q.x - p.x) < 1;
        const f = e.labelAt != null ? e.labelAt : 0.5;
        const lx = p.x + (q.x - p.x) * f + (vertical ? 15 : 0), ly = p.y + (q.y - p.y) * f + (vertical ? 4 : -15);
        const t = text(L.edges, lx, ly, e.label, 'dg-elabel' + (e.ghost ? ' ghost' : ''), vertical ? 'start' : 'middle');
        e._label = t;
      }
      E[e.id] = { spec: e, base, hl, from: e.from.split(':')[0], to: e.to.split(':')[0], label: e._label };
    });

    // ---- notes
    (spec.notes || []).forEach((n) => {
      const lines = n.text.split('\n');
      const w = Math.max(...lines.map((l) => l.length)) * 5.9 + 16, h = 8 + lines.length * 13;
      const gn = el('g', { class: 'dg-note ' + (n.kind || '') }, L.notes);
      el('rect', { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 4 }, gn);
      lines.forEach((l, i) => text(gn, n.x, n.y - (lines.length - 1) * 6.5 + i * 13 + 3.5, l, ''));
    });

    // ---- step badges
    const used = {};
    const stepPaths = (s) => (s.paths ? s.paths : s.path ? [s.path] : []);
    const badges = steps.map((s, i) => {
      let x, y;
      const first = stepPaths(s)[0];
      if (s.at) { x = s.at[0]; y = s.at[1]; }
      else if (first) {
        const name = first[first.length - 1].replace(/^-/, ''); // the hop this step adds
        const p = E[name].hl, len = p.getTotalLength();
        const k = used[name] || 0;
        used[name] = k + 1;
        const shift = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 26;
        const pt = p.getPointAtLength(Math.max(12, Math.min(len - 12, len / 2 + shift)));
        x = pt.x; y = pt.y;
      } else if (s.focus && R[s.focus[0]]) {
        const r = R[s.focus[0]];
        x = r.group ? r.x + r.w - 2 : r.x - 4; y = r.group ? r.y + 2 : r.y - 4;
      } else { x = 20; y = 20; }
      const b = el('g', { class: 'dg-badge', transform: 'translate(' + x + ',' + y + ')' }, L.badges);
      el('circle', { r: 11 }, b);
      text(b, 0, 4, String(i + 1), '');
      b.addEventListener('click', () => go(i, true));
      return b;
    });

    // ---- controls + step list
    let idx = -1, playing = false, token = 0, raf = 0;
    const ui = document.createElement('div');
    ui.className = 'dg-ui';
    host.appendChild(ui);
    let btnPlay, list = [];
    if (steps.length) {
      ui.innerHTML =
        '<div class="dg-bar"><button class="dg-play" type="button"></button>' +
        '<button class="dg-btn" data-a="prev" type="button" aria-label="Previous step">&#8249;</button>' +
        '<span class="dg-count"></span>' +
        '<button class="dg-btn" data-a="next" type="button" aria-label="Next step">&#8250;</button>' +
        '<button class="dg-btn dg-reset" data-a="reset" type="button">Show all</button></div><ol class="dg-steps"></ol>';
      btnPlay = ui.querySelector('.dg-play');
      const ol = ui.querySelector('ol');
      steps.forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="num">' + (i + 1) + '</span><div><b>' + (s.title || '') + '</b> ' + (s.text || '') + '</div>';
        li.addEventListener('click', () => go(i, true));
        ol.appendChild(li);
        list.push(li);
      });
      btnPlay.addEventListener('click', () => (playing ? pause() : play()));
      ui.querySelector('[data-a=prev]').addEventListener('click', () => go(Math.max(0, idx - 1), true));
      ui.querySelector('[data-a=next]').addEventListener('click', () => go(Math.min(steps.length - 1, idx + 1), true));
      ui.querySelector('[data-a=reset]').addEventListener('click', () => { pause(); show(-1); });
    }

    function clearFx() {
      cancelAnimationFrame(raf);
      L.pkts.innerHTML = '';
      for (const k in E) {
        E[k].hl.setAttribute('class', 'dg-edge-hl');
        E[k].hl.removeAttribute('marker-end');
        E[k].hl.removeAttribute('marker-start');
        E[k].base.classList.remove('on');
        if (E[k].label) E[k].label.classList.remove('on');
      }
      for (const k in R) R[k].el.classList.remove('focus', 'dim');
      svg.classList.remove('stepping');
    }

    function show(i) {
      token++;
      clearFx();
      idx = i;
      badges.forEach((b, j) => b.setAttribute('class', 'dg-badge' + (j === i ? ' on' : i >= 0 && j > i ? ' todo' : '')));
      list.forEach((li, j) => li.classList.toggle('on', j === i));
      if (steps.length) ui.querySelector('.dg-count').textContent = i < 0 ? steps.length + ' steps' : i + 1 + ' / ' + steps.length;
      syncPlay();
      if (i < 0) return Promise.resolve();
      const s = steps[i];
      svg.classList.add('stepping');
      const active = new Set(s.focus || []);
      const paths = stepPaths(s).map((p) => p.map((name) => {
        const rev = name[0] === '-';
        const e = E[rev ? name.slice(1) : name];
        active.add(e.from); active.add(e.to);
        e.hl.setAttribute('class', 'dg-edge-hl on' + (s.blocked ? ' bad' : ''));
        e.hl.setAttribute(rev ? 'marker-start' : 'marker-end', 'url(#' + id + '-' + (s.blocked ? 'bad' : 'hl') + ')');
        e.base.classList.add('on');
        if (e.label) e.label.classList.add('on');
        return { e, rev, len: e.hl.getTotalLength() };
      }));
      if (active.size) for (const k in R) {
        if (R[k].group) continue;
        R[k].el.classList.toggle('dim', !active.has(k));
      }
      (s.focus || []).forEach((k) => R[k] && R[k].el.classList.add('focus'));
      return animate(paths, s, token);
    }

    function animate(paths, s, tk) {
      if (!paths.length) return Promise.resolve();
      return new Promise((resolve) => {
        const runs = paths.map((segs) => {
          const total = segs.reduce((a, b) => a + b.len, 0);
          const g = el('g', { class: 'dg-pkt' + (s.blocked ? ' bad' : '') }, L.pkts);
          el('circle', { r: 13, class: 'halo' }, g);
          el('circle', { r: 6.5 }, g);
          return { segs, total, g, limit: s.blocked ? (s.stop != null ? s.stop : 0.62) : 1 };
        });
        const longest = Math.max(...runs.map((r) => r.total * r.limit));
        const dur = Math.max(800, Math.min(3200, longest * 3.6));
        const t0 = performance.now();
        function frame(now) {
          if (tk !== token) return resolve();
          const t = Math.min(1, (now - t0) / dur);
          const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          runs.forEach((r) => {
            let dist = r.total * r.limit * k, pt;
            for (const sg of r.segs) {
              if (dist <= sg.len || sg === r.segs[r.segs.length - 1]) {
                pt = sg.e.hl.getPointAtLength(sg.rev ? sg.len - dist : dist);
                break;
              }
              dist -= sg.len;
            }
            r.g.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ')');
            r.pt = pt;
          });
          if (t < 1) { raf = requestAnimationFrame(frame); return; }
          runs.forEach((r) => {
            if (s.blocked) {
              r.g.remove();
              const x = el('g', { class: 'dg-x', transform: 'translate(' + r.pt.x + ',' + r.pt.y + ')' }, L.pkts);
              el('circle', { r: 12 }, x);
              el('path', { d: 'M-5,-5 L5,5 M5,-5 L-5,5' }, x);
            } else r.g.classList.add('done');
          });
          resolve();
        }
        raf = requestAnimationFrame(frame);
      });
    }

    function go(i, manual) {
      if (manual) playing = false;
      return show(i);
    }
    function syncPlay() {
      if (!btnPlay) return;
      const atEnd = idx >= steps.length - 1;
      btnPlay.innerHTML = playing ? '<span class="ico">&#10073;&#10073;</span> Pause' : '<span class="ico">&#9654;</span> ' + (idx < 0 ? 'Play walkthrough' : atEnd ? 'Replay' : 'Continue');
      btnPlay.classList.toggle('playing', playing);
    }
    async function play() {
      playing = true;
      let i = idx >= steps.length - 1 ? 0 : idx + 1;
      while (playing && i < steps.length) {
        const p = show(i);
        const mine = token;
        await p;
        if (mine !== token || !playing) return;
        const read = Math.max(1700, (steps[i].text || '').replace(/<[^>]+>/g, '').length * 34);
        await new Promise((r) => setTimeout(r, read));
        if (mine !== token || !playing) return;
        i++;
      }
      playing = false;
      syncPlay();
    }
    function pause() { playing = false; syncPlay(); }

    show(-1);

    // Start the walkthrough the first time the diagram scrolls into view.
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (steps.length && !calm && !host.closest('[data-noautoplay]') && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { io.disconnect(); if (idx < 0 && !playing) play(); }
      }, { threshold: 0.55 });
      io.observe(scroller);
    }
    host._stop = () => { playing = false; token++; cancelAnimationFrame(raf); };
  }

  return {
    register(name, spec) { defs[name] = spec; },
    names() { return Object.keys(defs); },
    mountAll(root) {
      root.querySelectorAll('.diagram[data-diagram]').forEach((host) => {
        const spec = defs[host.dataset.diagram];
        if (!spec) { host.textContent = 'Unknown diagram: ' + host.dataset.diagram; return; }
        try { Player(host, spec); } catch (err) { host.textContent = String(err); console.error(err); }
      });
    },
    stopAll(root) {
      root.querySelectorAll('.diagram').forEach((h) => h._stop && h._stop());
    },
  };
})();
