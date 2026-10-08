(function () {
  const slot = document.querySelector('.bims-header-slot');
  if (!slot) return;
  const root = slot.dataset.root || './';
  const active = slot.dataset.active || '';
  const copy = (th, en) => `<span data-site-th>${th}</span><span data-site-en>${en}</span>`;
  slot.innerHTML = `<header class="bims-header"><div class="bims-header-inner">
    <a class="bims-header-logo" href="${root}" aria-label="BiMSolutions หน้าแรก"><img src="${root}BiM_Solutions_profile.png" width="44" height="44" alt="BiMSolutions"></a>
    <nav class="bims-header-nav" aria-label="เมนูหลัก">
      <details class="bims-header-products"><summary class="${active === 'shop' ? 'current' : ''}">${copy('สินค้าและบริการ', 'Products & Services')} <span aria-hidden="true">⌄</span></summary><div class="bims-header-dropdown"><a href="${root}shop.html">${copy('ดูสินค้าและบริการทั้งหมด', 'All products & services')}</a><a href="${root}#products">Revit Extension</a><a href="${root}#services">${copy('บริการ BIM', 'BIM services')}</a></div></details>
      <a href="${root}#features">${copy('ฟีเจอร์', 'Features')}</a><a class="${active === 'articles' ? 'current' : ''}" href="${root}articles/">${copy('บทความ', 'Articles')}</a><a href="${root}#contact">${copy('ติดต่อ', 'Contact')}</a>
    </nav>
    <div class="bims-header-actions">
      <a class="bims-header-facebook" href="https://www.facebook.com/profile.php?id=61595030229162" target="_blank" rel="noopener noreferrer" aria-label="Facebook BiMSolutions" title="Facebook">f</a>
      <button class="bims-header-theme" type="button" aria-label="เปลี่ยนธีมสี" title="Theme"><svg class="bims-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg class="bims-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></button>
      <div class="bims-header-language" aria-label="Language"><button type="button" data-site-lang="th">TH</button><button type="button" data-site-lang="en">EN</button></div>
      <div class="site-login-slot" data-home="${root}"></div>
      <details class="bims-header-mobile"><summary aria-label="เปิดเมนู">☰</summary><div class="bims-header-mobile-links"><a href="${root}">${copy('หน้าแรก', 'Home')}</a><a href="${root}shop.html">${copy('สินค้าและบริการ', 'Products & Services')}</a><a href="${root}#features">${copy('ฟีเจอร์', 'Features')}</a><a href="${root}articles/">${copy('บทความ', 'Articles')}</a><a href="${root}#contact">${copy('ติดต่อ', 'Contact')}</a></div></details>
    </div>
  </div></header>`;
  const updateLanguage = () => {
    const en = document.documentElement.lang === 'en';
    slot.querySelectorAll('[data-site-lang]').forEach(button => {
      const selected = button.dataset.siteLang === (en ? 'en' : 'th');
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  try { if (localStorage.getItem('bims-lang') === 'en') document.documentElement.lang = 'en'; } catch (error) {}
  slot.querySelector('.bims-header-theme').addEventListener('click', () => window.toggleSiteTheme());
  slot.querySelectorAll('[data-site-lang]').forEach(button => button.addEventListener('click', () => {
    const lang = button.dataset.siteLang;
    if (typeof window.setLang === 'function') window.setLang(lang);
    else {
      document.documentElement.lang = lang;
      try { localStorage.setItem('bims-lang', lang); } catch (error) {}
    }
    updateLanguage();
  }));
  new MutationObserver(updateLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  updateLanguage();
})();
