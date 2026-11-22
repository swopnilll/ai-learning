/* Interactive widgets used inside lessons: <div class="widget" data-widget="cidr|route|sg"></div> */
window.Widgets = (function () {
  const W = {};

  // ------------------------------------------------------------------ CIDR explorer
  const SUBNETS = {
    0: { name: 'public-a', tier: 'public', az: 'ap-southeast-2a', hosts: {} },
    1: { name: 'public-b', tier: 'public', az: 'ap-southeast-2b', hosts: {} },
    10: { name: 'private-a', tier: 'private', az: 'ap-southeast-2a', hosts: { 119: 'RDS database' } },
    11: { name: 'private-b', tier: 'private', az: 'ap-southeast-2b', hosts: {} },
  };
  const RESERVED = { 0: 'network address', 1: 'VPC router', 2: 'DNS resolver (reserved in every subnet)', 3: 'reserved by AWS for future use', 255: 'broadcast address (not supported, still reserved)' };

  W.cidr = function (host) {
    host.innerHTML =
      '<div class="w-head"><h4>CIDR explorer</h4><p>The VPC <code>10.20.0.0/16</code> cut into 256 blocks of <code>/24</code>. Each square is one possible subnet. Click any square.</p></div>' +
      '<div class="cidr"><div class="cidr-grid"></div><div class="cidr-detail"></div></div>' +
      '<div class="legend"><span><i class="sw public"></i>public subnet</span><span><i class="sw private"></i>private subnet</span><span><i class="sw free"></i>free, not assigned</span></div>';
    const grid = host.querySelector('.cidr-grid'), detail = host.querySelector('.cidr-detail');
    const cells = [];
    for (let n = 0; n < 256; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      const s = SUBNETS[n];
      b.className = 'cell ' + (s ? s.tier : 'free');
      b.title = '10.20.' + n + '.0/24';
      if (s) b.textContent = n;
      b.addEventListener('click', () => pick(n));
      grid.appendChild(b);
      cells.push(b);
    }
    function pick(n) {
      cells.forEach((c, i) => c.classList.toggle('sel', i === n));
      const s = SUBNETS[n];
      let strip = '';
      for (let h = 0; h < 256; h++) {
        const res = RESERVED[h], known = s && s.hosts[h];
        strip += '<i class="h ' + (res ? 'res' : known ? 'known' : '') + '" title="10.20.' + n + '.' + h + (res ? ': ' + res : known ? ': ' + known : '') + '"></i>';
      }
      const known = s ? Object.keys(s.hosts).map((h) => '<li><code>10.20.' + n + '.' + h + '</code> ' + s.hosts[h] + '</li>').join('') : '';
      detail.innerHTML =
        '<div class="cidr-title ' + (s ? s.tier : 'free') + '">' + (s ? 'flatwhite-prod-' + s.name : 'Free block') + '</div>' +
        '<div class="cidr-big">10.20.' + n + '.0/24</div>' +
        '<pre class="mini">cidrsubnet("10.20.0.0/16", 8, ' + n + ')</pre>' +
        '<dl><dt>Range</dt><dd>10.20.' + n + '.0 to 10.20.' + n + '.255</dd>' +
        '<dt>Addresses</dt><dd>256 total, 251 usable</dd>' +
        (s ? '<dt>Zone</dt><dd>' + s.az + '</dd>' : '<dt>Status</dt><dd>Nothing uses this block. It is room to grow.</dd>') + '</dl>' +
        '<div class="strip">' + strip + '</div>' +
        '<p class="hint"><i class="h res"></i> 5 addresses AWS keeps for itself (.0 .1 .2 .3 .255)' + (known ? ' &nbsp; <i class="h known"></i> addresses in use today' : '') + '</p>' +
        (known ? '<ul class="known">' + known + '</ul>' : '');
    }
    pick(10);
  };

  // ------------------------------------------------------------------ Route table lookup
  W.route = function (host) {
    const tables = {
      public: { name: 'flatwhite-prod-public-rt', used: 'public-a, public-b', rows: [['10.20.0.0/16', 'local'], ['0.0.0.0/0', 'flatwhite-prod-igw']] },
      private: { name: 'Main route table (AWS default)', used: 'private-a, private-b', rows: [['10.20.0.0/16', 'local']] },
    };
    const presets = [['10.20.10.119', 'the database'], ['10.20.1.44', 'something in public-b'], ['8.8.8.8', 'Google DNS'], ['52.95.36.0', 'an AWS public endpoint']];
    host.innerHTML =
      '<div class="w-head"><h4>Route table lookup</h4><p>Pick where the packet starts and where it wants to go. The subnet\'s route table decides the next hop.</p></div>' +
      '<div class="w-row"><label>Packet leaves from<select class="r-from"><option value="public">a public subnet</option><option value="private">a private subnet</option></select></label>' +
      '<label>Destination IP<input class="r-ip" value="8.8.8.8" spellcheck="false"></label></div>' +
      '<div class="chips"><button type="button" data-t="internet,alb,443">Internet to ALB :443</button><button type="button" data-t="alb,api_task,8080">ALB to API task :8080</button><button type="button" data-t="internet,api_task,8080">Internet to API task :8080</button><button type="button" data-t="api_task,rds,5432">API task to DB :5432</button><button type="button" data-t="internet,rds,5432">Internet to DB :5432</button><button type="button" data-t="api_task,internet,443">API task to internet :443</button></div>' +
      '<div class="r-out"></div>';
    const from = host.querySelector('.r-from'), ip = host.querySelector('.r-ip'), out = host.querySelector('.r-out');
    function run() {
      const t = tables[from.value];
      const m = ip.value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (!m || m.slice(1).some((o) => +o > 255)) { out.innerHTML = '<p class="verdict bad">That is not a valid IPv4 address.</p>'; return; }
      const local = +m[1] === 10 && +m[2] === 20;
      const hit = local ? 0 : t.rows.length > 1 ? 1 : -1;
      const rows = t.rows.map((r, i) => '<tr class="' + (i === hit ? 'hit' : '') + '"><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td><td>' + (i === hit ? 'match' : local && i === 1 ? 'also matches, but /16 is more specific' : 'no match') + '</td></tr>').join('');
      const verdict = hit === 0
        ? '<p class="verdict ok"><b>Delivered inside the VPC.</b> ' + ip.value + ' is inside 10.20.0.0/16, so the <code>local</code> route wins. Every subnet can reach every other subnet this way. Security groups decide whether the packet is accepted.</p>'
        : hit === 1
        ? '<p class="verdict ok"><b>Sent to the internet gateway.</b> Only the catch-all <code>0.0.0.0/0</code> matches. The packet still needs a public IP on the sender to get a reply.</p>'
        : '<p class="verdict bad"><b>Dropped. No route.</b> This table only knows 10.20.0.0/16. There is no <code>0.0.0.0/0</code> row and no NAT gateway, so the packet has nowhere to go.</p>';
      out.innerHTML = '<div class="table-wrap"><table class="rt"><caption>' + t.name + ' <small>used by ' + t.used + '</small></caption><thead><tr><th>Destination</th><th>Target</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' + verdict;
    }
    from.addEventListener('change', run);
    ip.addEventListener('input', run);
    host.querySelectorAll('[data-ip]').forEach((b) => b.addEventListener('click', () => { ip.value = b.dataset.ip; run(); }));
    run();
  };

  // ------------------------------------------------------------------ Security group simulator
  const SG = {
    default: { label: 'default SG (AWS default)', inn: [{ port: '*', sg: 'default' }], out: [{ port: '*', cidr: true }] },
    alb: { label: 'flatwhite-prod-alb', inn: [{ port: 80, cidr: true }, { port: 443, cidr: true }], out: [{ port: 8080, sg: 'api' }] },
    api: { label: 'flatwhite-prod-api', inn: [{ port: 8080, sg: 'alb' }], out: [{ port: 443, cidr: true }, { port: 5432, sg: 'db' }] },
    db: { label: 'flatwhite-prod-db', inn: [{ port: 5432, sg: 'api' }, { port: 5432, sg: 'tunnel' }], out: [] },
    tunnel: { label: 'flatwhite-prod-db-tunnel', inn: [], out: [{ port: 443, cidr: true }, { port: 5432, sg: 'db' }] },
  };
  const WHO = {
    internet: { label: 'The internet', sgs: null },
    alb: { label: 'ALB', sgs: ['alb'], pub: true },
    api_task: { label: 'API task (Fargate)', sgs: ['api'], pub: true },
    rds: { label: 'RDS database', sgs: ['db'], pub: false },
    tunnel_task: { label: 'DB tunnel task (only while started)', sgs: ['tunnel'], pub: true },
  };
  function ruleText(r, dir) {
    return 'TCP ' + (r.port === '*' ? 'all ports' : r.port) + (dir === 'in' ? ' from ' : ' to ') + (r.cidr ? '0.0.0.0/0' : 'members of ' + SG[r.sg].label);
  }
  function findRule(sgs, dir, port, peer) {
    for (const name of sgs) {
      for (const r of SG[name][dir === 'in' ? 'inn' : 'out']) {
        if (r.port !== '*' && r.port !== port) continue;
        if (r.cidr || (peer.sgs && peer.sgs.indexOf(r.sg) > -1)) return { name, r };
      }
    }
    return null;
  }
  W.sg = function (host) {
    const opts = (skip) => Object.keys(WHO).filter((k) => k !== skip).map((k) => '<option value="' + k + '">' + WHO[k].label + '</option>').join('');
    host.innerHTML =
      '<div class="w-head"><h4>Security group simulator</h4><p>Uses the real rules in this repo. Pick a sender, a receiver and a port, and see which check lets the connection through or stops it.</p></div>' +
      '<div class="w-row"><label>From<select class="s-from">' + opts() + '</select></label>' +
      '<label>To<select class="s-to">' + opts() + '</select></label>' +
      '<label>Port<select class="s-port"><option>80</option><option>443</option><option>8080</option><option>5432</option><option>22</option></select></label></div>' +
      '<div class="chips"><button type="button" data-t="internet,alb,80">Internet to ALB :80</button><button type="button" data-t="hello_public,rds,5432">hello_public to DB :5432</button><button type="button" data-t="hello_private,rds,5432">hello_private to DB :5432</button><button type="button" data-t="internet,rds,5432">Internet to DB :5432</button><button type="button" data-t="hello_public,hello_private,80">hello_public to hello_private :80</button><button type="button" data-t="internet,hello_public,22">Internet to hello_public :22 (SSH)</button></div>' +
      '<ol class="checks"></ol><div class="s-verdict"></div>';
    const f = host.querySelector('.s-from'), t = host.querySelector('.s-to'), p = host.querySelector('.s-port');
    f.value = 'api_task'; t.value = 'rds'; p.value = '5432';
    function run() {
      const a = WHO[f.value], b = WHO[t.value], port = +p.value, checks = [];
      if (f.value === t.value) { host.querySelector('.checks').innerHTML = ''; host.querySelector('.s-verdict').innerHTML = '<p class="verdict bad">Pick two different things.</p>'; return; }
      // 1. is there a network path at all?
      let ok = true, why;
      if (!a.sgs) { ok = b.pub; why = ok ? b.label + ' has a public IP and sits in a subnet whose route table points at the internet gateway.' : b.label + ' has no public IP and its subnet has no route to the internet gateway. The packet never arrives.'; }
      else if (!b.sgs) { ok = a.pub; why = ok ? a.label + ' is in a public subnet with a public IP: 0.0.0.0/0 goes to the internet gateway.' : a.label + ' is in a private subnet. Its route table only has the local route, and there is no NAT gateway.'; }
      else why = 'Both are inside the VPC. The <code>local</code> route connects every subnet to every other subnet.';
      checks.push({ name: 'Route', ok, why });
      // 2. sender egress
      if (a.sgs) {
        const hit = findRule(a.sgs, 'out', port, b);
        checks.push({ name: 'Sender\'s outbound rules', ok: !!hit, why: hit ? 'Allowed by <b>' + SG[hit.name].label + '</b>: ' + ruleText(hit.r, 'out') + '.' : 'None of ' + a.label + '\'s security groups (' + a.sgs.map((s) => SG[s].label).join(', ') + ') has an outbound rule for this. A security group made by Terraform starts with no outbound rules.' });
      } else checks.push({ name: 'Sender\'s outbound rules', ok: true, why: 'The internet is not behind one of our security groups.' });
      // 3. receiver ingress
      if (b.sgs) {
        const hit = findRule(b.sgs, 'in', port, a);
        checks.push({ name: 'Receiver\'s inbound rules', ok: !!hit, why: hit ? 'Allowed by <b>' + SG[hit.name].label + '</b>: ' + ruleText(hit.r, 'in') + '.' : 'None of ' + b.label + '\'s security groups (' + b.sgs.map((s) => SG[s].label).join(', ') + ') allows TCP ' + port + ' from ' + a.label + '.' });
      } else checks.push({ name: 'Receiver\'s inbound rules', ok: true, why: 'Not ours to control.' });
      const all = checks.every((c) => c.ok);
      host.querySelector('.checks').innerHTML = checks.map((c) => '<li class="' + (c.ok ? 'ok' : 'bad') + '"><span class="mark">' + (c.ok ? '&#10003;' : '&#10005;') + '</span><div><b>' + c.name + '</b><p>' + c.why + '</p></div></li>').join('');
      let extra = '';
      if (all && f.value === 'alb') extra = ' The rules allow it, but the ALB has no target group yet, so it never actually sends this traffic.';
      if (all) extra += ' The reply is allowed automatically: security groups are stateful.';
      host.querySelector('.s-verdict').innerHTML = '<p class="verdict ' + (all ? 'ok' : 'bad') + '"><b>' + (all ? 'Connection allowed.' : 'Connection blocked.') + '</b>' + (all ? extra : ' Every check must pass. One failure is enough to stop it.') + '</p>';
    }
    [f, t, p].forEach((s) => s.addEventListener('change', run));
    host.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { const v = b.dataset.t.split(','); f.value = v[0]; t.value = v[1]; p.value = v[2]; run(); }));
    run();
  };

  return {
    mountAll(root) {
      root.querySelectorAll('.widget[data-widget]').forEach((h) => { const fn = W[h.dataset.widget]; if (fn) fn(h); });
    },
  };
})();
