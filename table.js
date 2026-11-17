// Таблица «Адрес дома / Количество подъездов» и счётчик .slon-total из той же Google Таблицы, что и карта.
// Подключение в Tilda (T123): <div class="slon-table"></div><script src=".../table.js" data-p="p5"></script>
(function () {
  const CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS4KJwO3SevXXouRnOvZ_mKdCp1jMYBmJIg2m67uZtR1Y9m0D7hYnuTGjBoGg-FHNVlf2Gqj1Egl-7E/pub?gid=0&single=true&output=csv';
  const p = (document.currentScript && document.currentScript.dataset.p) || '';

  // копия из index.html: поля в кавычках могут содержать запятые и "" внутри
  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c !== '"') f += c; else if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const [head = [], ...body] = rows;
    return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
  }

  const pick = (rows, per) => rows.filter(r => r['периметр'] === per && r['показывать'] !== 'нет' && r['адрес']);
  const total = rows => rows.reduce((s, r) => s + (parseInt(r['подъездов'], 10) || 0), 0);

  // класс .slon-total в Tilda ставится на весь текстовый блок «Подъездов: 83» — меняем только последнее число,
  // разметку Tilda и подпись не трогаем
  const LAST_NUM = /\d+(?!.*\d)/s;
  const setNum = (s, n) => s.replace(LAST_NUM, n);
  function setTotal(el, n) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last = null;
    while (w.nextNode()) if (/\d/.test(w.currentNode.nodeValue)) last = w.currentNode;
    if (last) last.nodeValue = setNum(last.nodeValue, n);
  }

  // self-check
  console.assert(setNum('Подъездов: 83', 90) === 'Подъездов: 90' && setNum('83', 7) === '7' &&
    setNum('Подъездов:', 5) === 'Подъездов:', 'table.js setNum');
  const t = pick(parseCSV('периметр,адрес,подъездов,показывать\np5,"А, 1",3,да\np5,Б 2,4,нет\np1,В 3,5,да\np5,Г 4,x,да\n'), 'p5');
  console.assert(t.length === 2 && t[0]['адрес'] === 'А, 1' && total(t) === 3, 'table.js pick/total');

  const style = document.createElement('style');
  style.textContent = '.slon-t{width:100%;border-collapse:collapse;font:16px/1.4 inherit}' +
    '.slon-t th,.slon-t td{padding:10px 14px;border-bottom:1px solid #e5e5e5;text-align:left}' +
    '.slon-t th{background:#e6761b;color:#fff;font-weight:600}' +
    '.slon-t td:last-child,.slon-t th:last-child{text-align:center;width:40%}';
  document.head.appendChild(style);

  function render(box, rows) {
    const table = document.createElement('table');
    table.className = 'slon-t';
    const tr = cells => { const r = document.createElement('tr'); cells.forEach(([tag, text]) => {
      const c = document.createElement(tag); c.textContent = text; r.appendChild(c); }); return r; };
    const thead = table.createTHead(), tbody = table.createTBody();
    thead.appendChild(tr([['th', 'Адрес дома'], ['th', 'Количество подъездов']]));
    rows.forEach(r => tbody.appendChild(tr([['td', r['адрес']], ['td', r['подъездов']]])));
    box.replaceChildren(table);
  }

  function start() {
    const boxes = document.querySelectorAll('.slon-table');
    const fail = () => boxes.forEach(b => { b.textContent = 'Не удалось загрузить список адресов'; });
    if (!/^[a-z0-9-]+$/.test(p)) return fail();
    fetch(CSV).then(r => { if (!r.ok) throw r.status; return r.text(); })
      .then(text => {
        const rows = pick(parseCSV(text), p);
        boxes.forEach(b => render(b, rows));
        document.querySelectorAll('.slon-total').forEach(el => setTotal(el, total(rows)));
      })
      .catch(fail);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
