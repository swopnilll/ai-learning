/* App shell: sidebar, routing, progress, quizzes. */
(function () {
  const KEY = 'ai-learning-tutorial-v1';
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');
  const lessons = Course.lessons, sections = Course.sections;
  const byId = {};
  lessons.forEach((l, i) => { byId[l.id] = l; l.index = i; });

  // ---- progress (kept in this browser only)
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch (e) {} }
  function pct() { return Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100); }
  function paintProgress() {
    document.getElementById('progressBar').style.width = pct() + '%';
    document.getElementById('progressText').textContent = pct() + '%';
  }

  const STATUS = { live: 'Built', planned: 'Planned', temp: 'Temporary', removed: 'Removed' };
  const tag = (s) => (s ? '<span class="tag ' + s + '">' + STATUS[s] + '</span>' : '');

  function paintSidebar(current) {
    sidebar.innerHTML = '<a class="side-home' + (current ? '' : ' on') + '" href="#/">Course overview</a>' +
      sections.map((s, si) => {
        const ls = lessons.filter((l) => l.section === s.id);
        const n = ls.filter((l) => done.has(l.id)).length;
        return '<section><h3><span class="sec-n">' + (si + 1) + '</span>' + s.title + '<small>' + n + '/' + ls.length + '</small></h3><ul>' +
          ls.map((l, i) => (l.group && l.group !== (ls[i - 1] || {}).group ? '<li class="grp">' + l.group + '</li>' : '') + '<li><a href="#/' + l.id + '" class="' + (current === l.id ? 'on ' : '') + (done.has(l.id) ? 'done' : '') + '">' +
            '<i class="dot"></i><span>' + l.title + '</span>' + (l.status === 'planned' ? '<em>planned</em>' : l.status === 'removed' ? '<em>removed</em>' : '') + '</a></li>').join('') +
          '</ul></section>';
      }).join('') +
      '<button class="reset" id="resetBtn" type="button">Reset my progress</button>';
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (!confirm('Clear the completed marks on every lesson?')) return;
      done = new Set(); save(); route();
    });
    paintProgress();
  }

  // ---- pages
  function home() {
    const next = lessons.find((l) => !done.has(l.id)) || lessons[0];
    const started = done.size > 0;
    main.innerHTML =
      '<div class="page home">' +
      '<div class="hero"><div><p class="eyebrow">ai-learning</p>' +
      '<h1>AWS Generative AI Developer, one diagram at a time</h1>' +
      '<p class="lede">Animated, icon-driven lessons for the AWS Certified Generative AI Developer course.</p>' +
      '<div class="hero-cta"><a class="btn primary" href="#/' + next.id + '">' + (started ? 'Continue: ' + next.title : 'Start the course') + '</a>' +
      '<span class="meta">' + lessons.length + ' lessons &middot; about ' + lessons.reduce((a, l) => a + l.mins, 0) + ' minutes &middot; ' + pct() + '% done</span></div></div>' +
      '<div class="hero-icons">' + ['bedrock', 'sagemaker', 'lambda', 'opensearch', 'dynamodb', 's3', 'kendra', 'stepfunctions', 'comprehend'].map((i) => H.icon(i, 44)).join('') + '</div></div>' +
      '<h2>The path</h2><div class="sec-cards">' +
      sections.map((s, si) => {
        const ls = lessons.filter((l) => l.section === s.id);
        const n = ls.filter((l) => done.has(l.id)).length;
        return '<a class="sec-card" href="#/' + ls[0].id + '">' + H.icon(s.icon, 44) + '<div><span class="eyebrow">Section ' + (si + 1) + '</span><h3>' + s.title + '</h3><p>' + s.blurb + '</p>' +
          '<div class="mini-bar"><i style="width:' + (n / ls.length) * 100 + '%"></i></div><small>' + n + ' of ' + ls.length + ' lessons done</small></div></a>';
      }).join('') + '</div></div>';
  }

  function lesson(l) {
    const sec = sections.find((s) => s.id === l.section);
    const prev = lessons[l.index - 1], next = lessons[l.index + 1];
    main.innerHTML =
      '<article class="page lesson">' +
      '<header class="lesson-head"><p class="eyebrow">' + sec.title + ' &middot; lesson ' + (l.index + 1) + ' of ' + lessons.length + '</p>' +
      '<h1>' + l.title + '</h1>' +
      '<p class="lesson-meta">' + tag(l.status) + '<span>' + l.mins + ' min read</span>' + (l.files ? '<span class="files">' + l.files.map((f) => '<code>' + f + '</code>').join(' ') + '</span>' : '') + '</p>' +
      (l.lede ? '<p class="lede">' + l.lede + '</p>' : '') + '</header>' +
      '<div class="prose">' + l.body() + '</div>' +
      (l.quiz ? '<section class="quiz"><h2>Check yourself</h2><div id="quiz"></div></section>' : '') +
      '<footer class="lesson-foot">' +
      (prev ? '<a class="btn ghost" href="#/' + prev.id + '">&larr; ' + prev.title + '</a>' : '<span></span>') +
      '<button class="btn primary" id="doneBtn" type="button"></button></footer></article>';

    if (l.quiz) paintQuiz(l);
    const btn = document.getElementById('doneBtn');
    const label = () => { btn.innerHTML = (done.has(l.id) ? '&#10003; Done. ' : 'Mark complete. ') + (next ? 'Next: ' + next.title + ' &rarr;' : 'Back to overview'); };
    label();
    btn.addEventListener('click', () => {
      done.add(l.id); save();
      location.hash = next ? '#/' + next.id : '#/';
    });
  }

  function paintQuiz(l) {
    const box = document.getElementById('quiz');
    box.innerHTML = l.quiz.map((q, qi) =>
      '<div class="q" data-q="' + qi + '"><p class="q-text"><span>' + (qi + 1) + '</span>' + q.q + '</p><div class="opts">' +
      q.options.map((o, oi) => '<button type="button" data-o="' + oi + '">' + o + '</button>').join('') +
      '</div><p class="why" hidden></p></div>').join('');
    box.querySelectorAll('.q').forEach((qel) => {
      const q = l.quiz[+qel.dataset.q];
      qel.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const right = +b.dataset.o === q.answer;
        qel.querySelectorAll('button').forEach((x) => x.classList.remove('right', 'wrong'));
        b.classList.add(right ? 'right' : 'wrong');
        const why = qel.querySelector('.why');
        why.hidden = false;
        why.className = 'why ' + (right ? 'right' : 'wrong');
        why.innerHTML = right ? '<b>Correct.</b> ' + q.why : '<b>Not quite.</b> Try another answer.';
      }));
    });
  }

  function gallery() {
    main.innerHTML = '<div class="page" data-noautoplay><h1>All diagrams</h1>' +
      Diagram.names().map((n) => '<h3>' + n + '</h3>' + H.diagram(n)).join('') + '</div>';
  }

  function route() {
    Diagram.stopAll(main);
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const l = byId[id];
    if (id === '_diagrams') gallery();
    else if (l) lesson(l);
    else home();
    paintSidebar(l ? l.id : null);
    Diagram.mountAll(main);
    Widgets.mountAll(main);
    document.body.classList.remove('menu-open');
    window.scrollTo(0, 0);
    document.title = (l ? l.title + ' · ' : '') + 'AWS GenAI Developer';
    const on = sidebar.querySelector('a.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  // ---- chrome
  document.getElementById('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  document.getElementById('scrim').addEventListener('click', () => document.body.classList.remove('menu-open'));
  document.getElementById('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ai-learning-theme', root.dataset.theme); } catch (e) {}
  });
  const lightbox = document.getElementById('lightbox');
  main.addEventListener('click', (e) => {
    if (e.target.matches && e.target.matches('img[data-zoom]')) {
      lightbox.querySelector('img').src = e.target.src;
      lightbox.hidden = false;
    }
  });
  lightbox.addEventListener('click', () => { lightbox.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.hidden = true; });

  window.addEventListener('hashchange', route);
  route();
})();
