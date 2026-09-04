/* ============================================================
   Foundational C# — book.js
   ทำงานได้ 100% แบบออฟไลน์ ไม่มีการเรียกเน็ตใดๆ
   หน้าที่ : ธีม / สารบัญข้าง / ไฮไลต์โค้ด C# / ปุ่ม Copy / ปุ่ม Run
             ระบบ Quiz / รายการติ๊ก / บันทึกความคืบหน้า
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 0. ที่เก็บข้อมูล (localStorage) ---------- */
  var KEY = 'csbook.v1';
  var DB = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {}
  }
  function chBox() {
    var id = document.body.getAttribute('data-ch');
    if (id === null) return null;
    DB.ch = DB.ch || {};
    DB.ch[id] = DB.ch[id] || { items: {}, pct: 0 };
    return DB.ch[id];
  }

  /* ---------- 1. ธีมสว่าง/มืด ---------- */
  function paintThemeBtn(t) {
    document.querySelectorAll('[data-act="theme"]').forEach(function (b) {
      b.textContent = t === 'dark' ? '☀' : '☾';
      b.title = t === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด';
    });
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    paintThemeBtn(t);
  }
  function initTheme() {
    // ฟังก์ชันนี้แค่ "ตั้งค่าธีมปัจจุบัน" เรียกซ้ำได้ไม่มีปัญหา
    var saved = DB.theme;
    if (!saved) {
      saved = window.matchMedia &&
              window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark' : 'light';
    }
    applyTheme(saved);
  }
  // ผูกตัวดักคลิกไว้ "นอก" initTheme และผูกแค่ครั้งเดียวตอนสคริปต์โหลด
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act="theme"]');
    if (!b) return;
    var now = document.documentElement.getAttribute('data-theme') === 'dark'
              ? 'light' : 'dark';
    DB.theme = now; save();
    applyTheme(now);
  });

  /* ---------- 2. แถบแสดงความคืบหน้าการอ่าน ---------- */
  function initReadBar() {
    var bar = document.querySelector('.readbar');
    if (!bar) return;
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ---------- 3. สารบัญด้านข้าง (สร้างอัตโนมัติจาก h2/h3) ---------- */
  function initSideNav() {
    var nav = document.querySelector('.sidenav .auto-toc');
    var page = document.querySelector('.page');
    if (!nav || !page) return;

    var heads = page.querySelectorAll('h2, h3');
    var links = [], n = 0;

    heads.forEach(function (h) {
      if (h.hasAttribute('data-no-toc')) return;
      if (!h.id) h.id = 'h' + (++n);
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      if (h.tagName === 'H3') a.className = 'lvl3';
      nav.appendChild(a);
      links.push({ a: a, el: h });
    });

    if (!('IntersectionObserver' in window) || !links.length) return;
    var seen = new Set();
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target);
      });
      var first = links.find(function (l) { return seen.has(l.el); });
      links.forEach(function (l) { l.a.classList.toggle('active', l === first); });
    }, { rootMargin: '-80px 0px -70% 0px' });
    links.forEach(function (l) { io.observe(l.el); });
  }

  /* ---------- 4. ไฮไลต์ไวยากรณ์ C# ---------- */
  var KEYWORDS = ['abstract','as','base','bool','break','byte','case','catch','char',
    'checked','class','const','continue','decimal','default','delegate','do','double',
    'else','enum','event','explicit','extern','false','finally','fixed','float','for',
    'foreach','goto','if','implicit','in','int','interface','internal','is','lock',
    'long','namespace','new','null','object','operator','out','override','params',
    'private','protected','public','readonly','record','ref','return','sbyte','sealed',
    'short','sizeof','stackalloc','static','string','struct','switch','this','throw',
    'true','try','typeof','uint','ulong','unchecked','unsafe','ushort','using','var',
    'virtual','void','volatile','when','while','yield','nameof','value'];

  var RX = new RegExp(
      '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)'                 // 1 คอมเมนต์
    + '|(@?\\$?"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')'  // 2 สตริง
    + '|\\b(' + KEYWORDS.join('|') + ')\\b'                    // 3 คีย์เวิร์ด
    + '|\\b(\\d[\\d_]*(?:\\.\\d+)?[fFdDmMuUlL]*)\\b'          // 4 ตัวเลข
    + '|\\b([A-Za-z_][A-Za-z0-9_]*)(?=\\s*\\()'               // 5 ชื่อ method
    + '|\\b([A-Z][A-Za-z0-9_]*)\\b'                           // 6 ชื่อ class/type
    , 'g');

  var CLS = [null, 'tok-com', 'tok-str', 'tok-kw', 'tok-num', 'tok-meth', 'tok-type'];

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function highlight(src) {
    var out = '', last = 0, m;
    RX.lastIndex = 0;
    while ((m = RX.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var g = 0;
      for (var i = 1; i <= 6; i++) { if (m[i] !== undefined) { g = i; break; } }
      out += '<span class="' + CLS[g] + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }
  function initHighlight() {
    document.querySelectorAll('code.lang-cs').forEach(function (c) {
      c.innerHTML = highlight(c.textContent);
    });
  }

  /* ---------- 5. ปุ่ม Copy ---------- */
  function initCopy() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act="copy"]');
      if (!b) return;
      var box = b.closest('.code');
      var txt = box ? box.querySelector('pre').innerText : '';
      var done = function () {
        var old = b.textContent;
        b.textContent = '✓ คัดลอกแล้ว';
        setTimeout(function () { b.textContent = old; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------- 6. ปุ่ม Run — รันโค้ด C# จริงในเครื่อง ผ่าน .NET WebAssembly ----------
     ไม่ใช่การ "เล่นซ้ำ" ข้อความอีกต่อไป — โค้ดถูกส่งไปคอมไพล์และรันจริงด้วย Roslyn
     ที่ทำงานอยู่ใน iframe ซ่อนซึ่งโหลด assets/runtime/ (ตัว .NET runtime ที่คอมไพล์
     เป็น WebAssembly) ทั้งหมดนี้ทำงานจากไฟล์ในเครื่อง ไม่มีการเรียกอินเทอร์เน็ตเลย
     ข้อจำกัด: Console.ReadLine()/ReadKey() ไม่มี input จริงให้ (ไม่มี stdin ในบราวเซอร์)
     บล็อกที่ไม่ใช่โค้ด C# (เช่น คำสั่ง Terminal อย่าง dotnet run) ยังใช้การเล่นซ้ำ
     ข้อความที่เขียนไว้เหมือนเดิม เพราะไม่มีอะไรให้คอมไพล์จริง
  ------------------------------------------------------ */
  var Runner = (function () {
    var iframe = null, ready = false, bootFailed = false;
    var waiters = [], pending = {}, nextId = 1;

    var FILE_PROTOCOL_MSG =
      '[เปิดไม่สำเร็จ: ดูเหมือนคุณเปิดไฟล์นี้ด้วยการดับเบิลคลิกโดยตรง (file://)\n' +
      'ฟีเจอร์รันโค้ดจริงต้องใช้ local server เล็กๆ เพราะเบราว์เซอร์บล็อกไม่ให้หน้า file://\n' +
      'โหลดไฟล์ประกอบกันเอง (ข้อจำกัดด้านความปลอดภัยของเบราว์เซอร์ ไม่ใช่บั๊ก)\n\n' +
      'วิธีแก้: ไปที่โฟลเดอร์เดียวกับ index.html แล้วดับเบิลคลิก "start-book.bat" แทน\n' +
      '(เปิดครั้งเดียว จะเปิดเบราว์เซอร์ให้อัตโนมัติ ปิดหน้าต่างดำได้เมื่ออ่านเสร็จ)]';
    var TIMEOUT_MSG =
      '[โหลด C# runtime ไม่สำเร็จภายในเวลาที่กำหนด — ลองรีเฟรชหน้านี้อีกครั้ง\n' +
      'ถ้าเปิดไฟล์นี้ด้วยการดับเบิลคลิกโดยตรง (file://) ให้เปิดผ่าน "start-book.bat"\n' +
      'ในโฟลเดอร์เดียวกับ index.html แทน]';

    function ensureFrame() {
      if (iframe) return;
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.src = '../assets/runtime/index.html';
      document.body.appendChild(iframe);
      window.addEventListener('message', onMessage);
      setTimeout(function () {
        if (!ready && !bootFailed) {
          bootFailed = true;
          waiters.forEach(function (w) { w(); });
          waiters = [];
        }
      }, 20000);
    }

    function onMessage(ev) {
      if (!iframe || ev.source !== iframe.contentWindow) return;
      var msg = ev.data;
      if (!msg) return;
      if (msg.type === 'ready') {
        ready = true;
        waiters.forEach(function (w) { w(); });
        waiters = [];
      } else if (msg.type === 'boot-error') {
        bootFailed = true;
        waiters.forEach(function (w) { w(); });
        waiters = [];
      } else if (msg.type === 'result') {
        var p = pending[msg.id];
        if (p) { delete pending[msg.id]; p(msg.output); }
      }
    }

    function waitReady() {
      ensureFrame();
      if (ready || bootFailed) return Promise.resolve();
      return new Promise(function (res) { waiters.push(res); });
    }

    function run(code) {
      if (location.protocol === 'file:') {
        return Promise.resolve(FILE_PROTOCOL_MSG);
      }
      return waitReady().then(function () {
        if (bootFailed) return TIMEOUT_MSG;
        return new Promise(function (resolve) {
          var id = nextId++;
          pending[id] = resolve;
          iframe.contentWindow.postMessage({ type: 'run', id: id, code: code }, '*');
        });
      });
    }

    return { run: run, isBooting: function () { return !ready && !bootFailed; } };
  })();

  window.CSharpRunner = Runner; // ให้หน้า "เล่นโค้ด" (playground.html) เรียกใช้ตัวเดียวกันได้

  /* ---------- 6.1 ลิงก์ "เล่นโค้ด" บน topbar ทุกหน้า ---------- */
  function initPlaygroundLink() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var inChapters = /\/chapters\//.test(location.pathname) || /^chapters\//.test(location.pathname);
    var here = document.body.getAttribute('data-ch');
    if (here === 'playground') return; // ไม่ต้องมีลิงก์ชี้กลับมาหน้าตัวเอง
    var href = inChapters ? 'playground.html' : 'chapters/playground.html';
    var a = document.createElement('a');
    a.className = 'btn-play';
    a.href = href;
    a.innerHTML = '🎮 <span>เล่นโค้ด</span>';
    var themeBtn = bar.querySelector('[data-act="theme"]');
    if (themeBtn) bar.insertBefore(a, themeBtn); else bar.appendChild(a);
  }

  function initRun() {
    document.querySelectorAll('.out').forEach(function (o) {
      var pre = o.querySelector('pre');
      if (!pre) return;
      o._full = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      if (o.classList.contains('auto')) { pre.textContent = o._full; return; }
      pre.textContent = '';
      o.classList.add('pending');
    });

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act="run"]');
      if (!b) return;
      var box = b.closest('.code');
      if (!box) return;
      var codeEl = box.querySelector('pre code');

      var o = box.nextElementSibling;
      while (o && !o.classList.contains('out')) o = o.nextElementSibling;

      if (codeEl && codeEl.classList.contains('lang-cs')) {
        if (!o || !o.classList.contains('out')) {
          o = document.createElement('div');
          o.className = 'out';
          o.innerHTML = '<div class="out-bar">Output</div><pre></pre>';
          box.insertAdjacentElement('afterend', o);
        }
        playReal(o, b, codeEl.textContent);
      } else if (o) {
        playReplay(o, b);
      }
    });

    function type(pre, txt, done) {
      var i = 0;
      var caret = document.createElement('span');
      caret.className = 'caret';
      pre.appendChild(caret);
      var step = function () {
        i = Math.min(i + 2, txt.length);
        caret.remove();
        pre.textContent = txt.slice(0, i);
        pre.appendChild(caret);
        if (i < txt.length) { setTimeout(step, 14); }
        else { setTimeout(function () { caret.remove(); }, 700); done(); }
      };
      setTimeout(step, 80);
    }

    function playReal(o, btn, source) {
      if (o._busy) return;
      var pre = o.querySelector('pre');
      o.classList.remove('pending');
      o._busy = true;
      var prevLabel = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = Runner.isBooting() ? '⏳ กำลังโหลด C# runtime…' : '⏳ กำลังรัน…';
      }
      pre.textContent = '';

      Runner.run(source).then(function (output) {
        var txt = (output || '').replace(/^\n/, '').replace(/\s+$/, '');
        type(pre, txt || '(ไม่มีผลลัพธ์)', function () {
          o._busy = false;
          if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
        });
      });
    }

    function playReplay(o, btn) {
      if (o._busy) return;
      var pre = o.querySelector('pre');
      var txt = o._full || '';
      o.classList.remove('pending');
      o._busy = true;
      if (btn) btn.disabled = true;
      pre.textContent = '';
      type(pre, txt, function () {
        o._busy = false;
        if (btn) btn.disabled = false;
      });
    }
  }

  /* ---------- 6.2 หน้า "เล่นโค้ด" (playground.html) ---------- */
  var PG_EXAMPLES = {
    hello: 'Console.WriteLine("Hello, C#!");\nConsole.WriteLine("ลองแก้โค้ดตรงนี้แล้วกด ▶ Run ดูสิ");',
    vars: 'string name = "โลก";\nint year = 2026;\n\nConsole.WriteLine($"สวัสดี {name}! ตอนนี้ปี {year}");\n\nint a = 7, b = 3;\nConsole.WriteLine($"{a} + {b} = {a + b}");\nConsole.WriteLine($"{a} หาร {b} เหลือเศษ {a % b}");',
    loop: 'for (int i = 1; i <= 20; i++)\n{\n    if (i % 15 == 0) Console.WriteLine("FizzBuzz");\n    else if (i % 3 == 0) Console.WriteLine("Fizz");\n    else if (i % 5 == 0) Console.WriteLine("Buzz");\n    else Console.WriteLine(i);\n}',
    method: 'Console.WriteLine(Square(5));\nConsole.WriteLine(Square(12));\n\nstatic int Square(int n)\n{\n    return n * n;\n}',
    exception: 'try\n{\n    int[] nums = { 1, 2, 3 };\n    Console.WriteLine(nums[5]);\n}\ncatch (IndexOutOfRangeException ex)\n{\n    Console.WriteLine("จับ exception ได้: " + ex.Message);\n}'
  };

  function initPlayground() {
    var box = document.getElementById('pg-editor');
    if (!box) return; // ไม่ใช่หน้า playground

    var ta = document.getElementById('pg-code');
    var runBtn = document.getElementById('pg-run');
    var out = document.getElementById('pg-out');
    var pre = out.querySelector('pre');
    var STORE_KEY = 'csbook_playground_code_v1';

    try {
      var saved = localStorage.getItem(STORE_KEY);
      ta.value = saved || PG_EXAMPLES.hello;
    } catch (e) { ta.value = PG_EXAMPLES.hello; }

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 4;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });
    ta.addEventListener('input', function () {
      try { localStorage.setItem(STORE_KEY, ta.value); } catch (e) { /* ไม่เป็นไร */ }
    });

    document.querySelectorAll('.pg-examples button').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-ex');
        if (PG_EXAMPLES[key]) {
          ta.value = PG_EXAMPLES[key];
          try { localStorage.setItem(STORE_KEY, ta.value); } catch (e) { /* ไม่เป็นไร */ }
          ta.focus();
        }
      });
    });

    function run() {
      if (runBtn.disabled) return;
      runBtn.disabled = true;
      var prevLabel = runBtn.textContent;
      runBtn.textContent = window.CSharpRunner.isBooting() ? '⏳ กำลังโหลด C# runtime…' : '⏳ กำลังรัน…';
      out.classList.remove('err');
      pre.textContent = '';
      window.CSharpRunner.run(ta.value).then(function (output) {
        var txt = (output || '').replace(/^\n/, '').replace(/\s+$/, '');
        pre.textContent = txt || '(ไม่มีผลลัพธ์ — โค้ดรันสำเร็จแต่ไม่ได้พิมพ์อะไรออกมา)';
        if (/Unhandled exception|error CS/.test(txt)) out.classList.add('err');
        runBtn.disabled = false;
        runBtn.textContent = prevLabel;
      });
    }

    runBtn.addEventListener('click', run);
  }

  /* ---------- 7. รายการติ๊ก (จำค่าไว้) ---------- */
  function initChecklist() {
    var box = chBox();
    document.querySelectorAll('.checklist input[type=checkbox]').forEach(function (c) {
      if (!c.id) return;
      if (box && box.items[c.id]) c.checked = true;
      c.addEventListener('change', function () {
        if (!box) return;
        if (c.checked) box.items[c.id] = 1; else delete box.items[c.id];
        save(); updatePct();
      });
    });
  }

  /* ---------- 8. ระบบ Quiz ---------- */
  function initQuiz() {
    var box = chBox();

    document.querySelectorAll('.quiz').forEach(function (q) {
      var id = q.getAttribute('data-q');
      if (box && id && box.items['q:' + id]) {
        reveal(q, box.items['q:' + id] === 'ok' ? null : 'past');
      }
      q.addEventListener('click', function (e) {
        var opt = e.target.closest('.opt');
        if (!opt || q.classList.contains('done')) return;
        var ok = opt.hasAttribute('data-correct');
        reveal(q, ok ? null : opt);
        if (box && id) { box.items['q:' + id] = ok ? 'ok' : 'no'; save(); }
        updatePct(); updateScore();
      });
    });

    function reveal(q, wrongOpt) {
      q.classList.add('done');
      q.querySelectorAll('.opt').forEach(function (o) {
        if (o.hasAttribute('data-correct')) o.classList.add('right');
      });
      if (wrongOpt && wrongOpt !== 'past') wrongOpt.classList.add('wrong');
    }
    updateScore();
  }

  function updateScore() {
    var el = document.querySelector('.quiz-score');
    if (!el) return;
    var all = document.querySelectorAll('.quiz');
    var done = document.querySelectorAll('.quiz.done');
    var box = chBox();
    var right = 0;
    if (box) {
      document.querySelectorAll('.quiz').forEach(function (q) {
        if (box.items['q:' + q.getAttribute('data-q')] === 'ok') right++;
      });
    }
    el.innerHTML = 'ตอบแล้ว <b>' + done.length + '/' + all.length + '</b> ข้อ' +
                   ' &nbsp;·&nbsp; ถูก <b>' + right + '</b> ข้อ';
  }

  /* ---------- 9. คำนวณ % ความคืบหน้าของบท ---------- */
  function updatePct() {
    var box = chBox();
    if (!box) return;
    var total = document.querySelectorAll('.checklist input[type=checkbox]').length
              + document.querySelectorAll('.quiz').length;
    if (!total) return;
    var got = 0;
    document.querySelectorAll('.checklist input[type=checkbox]').forEach(function (c) {
      if (box.items[c.id]) got++;
    });
    document.querySelectorAll('.quiz').forEach(function (q) {
      if (box.items['q:' + q.getAttribute('data-q')] === 'ok') got++;
    });
    box.pct = Math.round((got / total) * 100);
    save();
    var lbl = document.querySelector('[data-ch-pct]');
    if (lbl) lbl.textContent = box.pct + '%';
  }

  /* ---------- 10. หน้าสารบัญ : เติมแถบความคืบหน้า ---------- */
  function initTocProgress() {
    var bars = document.querySelectorAll('.pbar[data-for]');
    if (!bars.length) return;
    bars.forEach(function (b) {
      var id = b.getAttribute('data-for');
      var pct = (DB.ch && DB.ch[id] && DB.ch[id].pct) || 0;
      b.querySelector('i').style.width = pct + '%';
      b.title = 'ความคืบหน้า ' + pct + '%';
    });
  }

  /* ---------- 11. เริ่มทำงาน ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initReadBar();
    initSideNav();
    initHighlight();
    initCopy();
    initRun();
    initPlaygroundLink();
    initPlayground();
    initChecklist();
    initQuiz();
    updatePct();
    initTocProgress();
  });
  initTheme(); // ตั้งธีมทันทีก่อนวาดหน้า กันจอกระพริบ
})();