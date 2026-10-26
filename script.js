(() => {
  // Where join-form submissions go (Google Apps Script, Formspree, own API…).
  // Empty = no network request, the form only shows the success state.
  const FORM_ENDPOINT = '';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Pin the hero flyer once fonts are in, so the one load animation doesn't reflow mid-way.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    document.documentElement.classList.add('is-ready');
  });

  /* ---------- nav ---------- */
  const nav = $('[data-nav]');
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Закрыть' : 'Меню';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });

  /* ---------- hero flyer → join form ---------- */
  const compose = $('[data-compose]');
  const join = $('[data-join]');
  compose.addEventListener('submit', (e) => {
    e.preventDefault();
    // Carry over what the visitor already wrote instead of asking twice.
    join.give.value = compose.give.value.trim();
    join.want.value = compose.want.value.trim();
    $('#join').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // join.name would be the form's own name attribute, not the input
    join.elements.namedItem('name').focus({ preventScroll: true });
  });

  /* ---------- tear-off tabs on the example board ---------- */
  $$('.tabs--live button').forEach((tab) => {
    tab.addEventListener('click', () => {
      tab.classList.add('is-torn');
      tab.setAttribute('aria-label', 'Контакт оторван');
      tab.disabled = true;
    });
  });

  /* ---------- Skill Coins ledger ---------- */
  const ledger = $('[data-ledger]');
  if (ledger) {
    const rows = $('[data-rows]', ledger);
    const empty = $('[data-empty]', ledger);
    const balanceEl = $('[data-balance]', ledger);
    const earnBtn = $('[data-earn]', ledger);
    const spendBtn = $('[data-spend]', ledger);
    const hint = $('[data-spend-hint]', ledger);
    const PRICE = 10;
    const MAX_ROWS = 5;
    const taught = ['Презентации для Айгерим', 'Excel для Тимура', 'Гитара для Данияра', 'Математика для Аружан'];
    const learned = ['Английский у Ерлана', 'Figma у Мадины', 'Домбыра у Нурлана', 'Монтаж у Ерасыла'];
    let balance = 0;
    let t = 0;
    let l = 0;

    const addRow = (text, delta) => {
      empty.hidden = true;
      const li = document.createElement('li');
      li.className = 'is-new';
      const label = document.createElement('span');
      label.textContent = text;
      const amount = document.createElement('span');
      amount.className = `amount ${delta > 0 ? 'amount--plus' : 'amount--minus'}`;
      amount.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta)} SC`;
      li.append(label, amount);
      rows.prepend(li);
      $$('li:not([data-empty])', rows).slice(MAX_ROWS).forEach((old) => old.remove());
    };

    const render = () => {
      balanceEl.textContent = balance;
      spendBtn.disabled = balance < PRICE;
      hint.textContent = balance < PRICE
        ? `Чтобы взять урок, нужно ${PRICE} SC. Сначала проведите занятие.`
        : 'Баллов хватает на урок.';
    };

    earnBtn.addEventListener('click', () => {
      balance += PRICE;
      addRow(taught[t++ % taught.length], PRICE);
      render();
    });
    spendBtn.addEventListener('click', () => {
      if (balance < PRICE) return;
      balance -= PRICE;
      addRow(learned[l++ % learned.length], -PRICE);
      render();
    });
    render();
  }

  /* ---------- join form ---------- */
  if (join) {
    const status = $('[data-join-status]', join);
    const submit = $('[data-join-submit]', join);
    const tabs = $$('[data-join-tabs] span', join);
    const messages = {
      name: 'Напишите, как к вам обращаться.',
      school: 'Укажите вуз или школу.',
      give: 'Напишите хотя бы один навык, которому можете научить.',
      want: 'Напишите, чему хотите научиться.',
      telegram: 'Оставьте ник в Telegram, туда мы пришлём пару.',
    };

    const setError = (input, msg) => {
      const field = input.closest('.field');
      field.classList.toggle('is-invalid', Boolean(msg));
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      $('[data-error]', field).textContent = msg || '';
    };

    const validate = (input) => {
      const value = input.value.trim();
      if (!value) return messages[input.name];
      if (input.name === 'telegram' && !/^@?[A-Za-z0-9_]{4,32}$/.test(value)) {
        return 'Ник в Telegram: латиница, цифры и _, от 4 символов.';
      }
      return '';
    };

    join.telegram.addEventListener('input', () => {
      const raw = join.telegram.value.trim();
      const handle = raw ? (raw.startsWith('@') ? raw : `@${raw}`) : '@username';
      tabs.forEach((s) => { s.textContent = handle; });
    });

    $$('input', join).forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) setError(input, validate(input)); });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) setError(input, validate(input));
      });
    });

    join.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form__status';
      let firstInvalid = null;
      $$('input', join).forEach((input) => {
        const msg = validate(input);
        setError(input, msg);
        if (msg && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const data = Object.fromEntries(new FormData(join));
      submit.disabled = true;
      submit.textContent = 'Отправляем…';
      try {
        if (FORM_ENDPOINT) {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
        join.reset();
        tabs.forEach((s) => { s.textContent = '@username'; });
        status.classList.add('is-ok');
        status.textContent = 'Объявление висит. Напишем в Telegram, когда найдём пару.';
      } catch (err) {
        console.error('Join form submit failed:', err);
        status.classList.add('is-err');
        status.textContent = 'Заявка не отправилась. Проверьте интернет и попробуйте ещё раз или напишите на hello@skillswap.kz.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Повесить объявление';
      }
    });
  }
})();
