class Component extends DCLogic {
  // JS-driven colors — keep in sync with :root / [data-theme="light"] in catalog CSS.
  THEME_DARK = {
    navy: '#0E1621',
    gold: '#E0A645',
    goldRgb: '224, 166, 69',
    cream: '#F3ECDD',
    surfaceAlt: '#17232F',
    textSubtle: '#8A96A3',
    textNav: '#C3CCD5',
    textDim: '#8A96A3',
    borderMedium: 'rgba(255,255,255,0.14)',
    chipCountBg: 'rgba(255,255,255,0.05)',
  };
  THEME_LIGHT = {
    navy: '#0E1621',
    gold: '#E0A645',
    goldRgb: '224, 166, 69',
    cream: '#0E1621',
    surfaceAlt: '#F5F0E8',
    textSubtle: '#7A8794',
    textNav: '#4A5564',
    textDim: '#8A96A3',
    borderMedium: 'rgba(14,22,33,0.14)',
    chipCountBg: 'rgba(14,22,33,0.06)',
  };

  // Overridden at runtime from /api/config (env WA_NUMBER). Fallback below.
  WA_NUMBER = '212606555567';
  MAPS_URL = 'https://share.google/KK0zyXkLZF3piDKKC';

  state = {
    view: 'home',
    activeProduct: 0,
    activeImage: 0,
    selectedProduct: '',
    lang: 'fr',
    form: { name: '', phone: '', city: '', qty: '1', address: '', note: '', hp: '' },
    search: '',
    cat: 'all',
    brand: 'all',
    theme: 'light',
    loaded: false
  };

  applyTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('hidrissi-theme', t); } catch (e) { /* private mode */ }
  }

  // Populated at runtime from products.json (see componentDidMount).
  PRODUCTS = [];
  CATS = [];
  BRANDS = [];
  CAT_OF = {};
  BRAND_OF = {};

  async componentDidMount() {
    let theme = 'light';
    try { theme = localStorage.getItem('hidrissi-theme') || 'light'; } catch (e) { /* ignore */ }
    if (theme !== 'dark') theme = 'light';
    this.applyTheme(theme);
    this.setState({ theme });

    // WhatsApp number from the serverless env, so it lives in WA_NUMBER (not code).
    try {
      const rc = await fetch('/api/config', { cache: 'no-store' });
      if (rc.ok) { const c = await rc.json(); if (c && c.waNumber) this.WA_NUMBER = c.waNumber; }
    } catch (e) { /* keep fallback */ }

    // Catalog data — editable without touching code.
    try {
      const r = await fetch('products.json', { cache: 'no-cache' });
      const data = await r.json();
      this.PRODUCTS = Array.isArray(data.products) ? data.products : [];
      this.CATS = data.cats || [];
      this.BRANDS = data.brands || [];
      this.CAT_OF = {};
      this.BRAND_OF = {};
      for (const p of this.PRODUCTS) { this.CAT_OF[p.name] = p.cat; this.BRAND_OF[p.name] = p.brand; }
      if (this.WA_NUMBER === '212606555567' && data.waNumberDefault) this.WA_NUMBER = data.waNumberDefault;
      const firstInStock = this.PRODUCTS.find(p => p.inStock !== false);
      const first = firstInStock ? firstInStock.name : (this.PRODUCTS[0] ? this.PRODUCTS[0].name : '');
      let selected = this.state.selectedProduct || first;
      const sel = this.PRODUCTS.find(p => p.name === selected);
      if (!sel || sel.inStock === false) selected = first;
      this.setState({ loaded: true, selectedProduct: selected });
    } catch (e) {
      this.setState({ loaded: true });
    }
  }

  // __T_BLOCK__

  CATS_FALLBACK = [
    { key: 'all', fr: 'Tous', ar: 'الكل' },
    { key: 'perf', fr: 'Performance', ar: 'أداء عالٍ' },
    { key: 'city', fr: 'Urbain', ar: 'حضري' },
    { key: 'compact', fr: 'Compacte', ar: 'مدمجة' }
  ];

  renderVals() {
    const { view, activeProduct, activeImage, selectedProduct, form, lang, theme } = this.state;
    const t = this.T[lang];
    const L = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang] ?? v.fr) : v;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const cats = (this.CATS && this.CATS.length) ? this.CATS : this.CATS_FALLBACK;
    const palette = theme === 'dark' ? this.THEME_DARK : this.THEME_LIGHT;
    const isLight = theme !== 'dark';
    const logoSrc = isLight ? 'assets/logo-dark.png' : 'assets/logo-white.png';
    const themeIcon = isLight ? '🌙' : '☀️';

    const products = this.PRODUCTS.map((p) => {
      const isSelected = p.name === selectedProduct;
      const inStock = p.inStock !== false;
      const first = p.images[0] || { thumb: '', w: '', h: '' };
      return {
        name: p.name,
        category: L(p.category),
        badge: L(p.badge),
        shortDesc: L(p.shortDesc),
        power: p.power,
        speed: L(p.speed),
        range: L(p.range),
        price: p.price,
        thumb: first.thumb,
        thumbW: first.w,
        thumbH: first.h,
        imageCountLabel: t.photos(p.images.length),
        inStock,
        isOutOfStock: !inStock,
        cardOpacity: inStock ? '1' : '0.72',
        priceColor: inStock ? palette.gold : palette.textSubtle,
        isSelected,
        borderColor: isSelected ? palette.gold : palette.borderMedium,
        bgColor: isSelected ? palette.gold : palette.surfaceAlt,
        textColor: isSelected ? palette.navy : palette.cream
      };
    });
    const orderableProducts = products.filter(p => p.inStock);

    const EMPTY = { name: '', category: '', desc: '', price: '', specs: [], features: { fr: [], ar: [] }, images: [] };
    const cp = this.PRODUCTS[activeProduct] || this.PRODUCTS[0] || EMPTY;
    const cpImages = cp.images || [];
    const cpInStock = cp.inStock !== false;
    const currentProduct = {
      name: cp.name,
      category: L(cp.category),
      badge: L(cp.badge),
      hasBadge: !!L(cp.badge),
      desc: L(cp.desc),
      price: cp.price,
      inStock: cpInStock,
      isOutOfStock: !cpInStock,
      specs: (cp.specs || []).map(s => ({ label: L(s.label), value: L(s.value) })),
      features: L(cp.features || { fr: [], ar: [] }),
      images: cpImages.map((im, i) => ({
        thumb: im.thumb,
        w: im.w,
        h: im.h,
        borderColor: i === activeImage ? palette.gold : palette.borderMedium
      }))
    };
    const curMain = cpImages[activeImage] || cpImages[0] || { display: '', w: '', h: '' };
    const currentImage = curMain.display, currentImageW = curMain.w, currentImageH = curMain.h;

    const heroImage = 'assets/hero-1600.webp', heroW = 1536, heroH = 1024;

    const qty = parseInt(form.qty) || 1;
    const selP = this.PRODUCTS.find(p => p.name === selectedProduct) || this.PRODUCTS.find(p => p.inStock !== false) || this.PRODUCTS[0] || { priceNum: 0, inStock: true };
    const canOrder = selP.inStock !== false;
    const total = (selP.priceNum * qty).toLocaleString('fr-FR').replace(/,/g, ' ');

    const cities = t.cities;
    const formView = { ...form, city: form.city || cities[0], address: form.address || '', note: form.note || '', hp: form.hp || '' };

    const waGreeting = lang === 'ar'
      ? 'مرحباً، أريد الاستفسار عن دراجاتكم الكهربائية.'
      : 'Bonjour, je souhaite avoir des informations sur vos trottinettes.';
    const waLink = 'https://wa.me/' + this.WA_NUMBER + '?text=' + encodeURIComponent(waGreeting);

    const search = this.state.search || '';
    const activeCat = this.state.cat || 'all';
    const activeBrand = this.state.brand || 'all';
    const matchCat = (name) => activeCat === 'all' || (this.CAT_OF[name] || 'city') === activeCat;
    const matchBrand = (name) => activeBrand === 'all' || this.BRAND_OF[name] === activeBrand;
    const matchSearch = (name) => { const q = search.trim().toLowerCase(); return !q || name.toLowerCase().includes(q); };
    const filteredProducts = products.filter(p => matchCat(p.name) && matchBrand(p.name) && matchSearch(p.name));
    const chipStyle = (on) => ({
      weight: on ? 700 : 500,
      bg: on ? `rgba(${palette.goldRgb},0.12)` : 'transparent',
      color: on ? palette.gold : palette.textNav,
      bar: on ? palette.gold : 'transparent',
      countBg: on ? `rgba(${palette.goldRgb},0.18)` : palette.chipCountBg,
      countColor: on ? palette.gold : palette.textDim
    });
    const catChips = cats.map(c => {
      const on = c.key === activeCat;
      const count = products.filter(p => matchSearch(p.name) && matchBrand(p.name) && (c.key === 'all' || (this.CAT_OF[p.name] || 'city') === c.key)).length;
      return { key: c.key, label: c[lang] || c.fr, count, ...chipStyle(on) };
    });
    const brandItems = [{ key: 'all', label: t.allBrands }].concat(this.BRANDS.map(b => ({ key: b, label: b })));
    const brandChips = brandItems.map(b => {
      const on = b.key === activeBrand;
      const count = products.filter(p => matchSearch(p.name) && matchCat(p.name) && (b.key === 'all' || this.BRAND_OF[p.name] === b.key)).length;
      return { key: b.key, label: b.label, count, ...chipStyle(on) };
    });
    const n = filteredProducts.length;
    const resultLabel = lang === 'ar' ? (n + ' نتيجة') : (n + (n > 1 ? ' résultats' : ' résultat'));

    return {
      t, dir, lang, waLink, mapsUrl: this.MAPS_URL, theme, logoSrc, themeIcon,
      filteredProducts, orderableProducts, catChips, brandChips, resultLabel,
      hasResults: n > 0, noResults: this.state.loaded && n === 0,
      canOrder, orderBlocked: !canOrder,
      search,
      onSearch: (e) => this.setState({ search: e.currentTarget.value }),
      selectCat: (e) => this.setState({ cat: e.currentTarget.dataset.cat }),
      selectBrand: (e) => this.setState({ brand: e.currentTarget.dataset.brand }),
      showHome: view === 'home',
      showDetail: view === 'detail',
      products, currentProduct,
      currentImage, currentImageW, currentImageH,
      heroImage, heroW, heroH,
      cities, total,
      form: formView,
      toggleLang: () => this.setState({ lang: lang === 'fr' ? 'ar' : 'fr' }),
      toggleTheme: () => {
        const next = theme === 'light' ? 'dark' : 'light';
        this.applyTheme(next);
        this.setState({ theme: next });
      },
      openProduct: (e) => {
        const name = e.currentTarget.dataset.name;
        const idx = Math.max(0, this.PRODUCTS.findIndex(p => p.name === name));
        this.setState({ view: 'detail', activeProduct: idx, activeImage: 0 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      goHome: (e) => {
        if (e) e.preventDefault();
        this.setState({ view: 'home' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      selectImage: (e) => this.setState({ activeImage: parseInt(e.currentTarget.dataset.idx) }),
      selectProduct: (e) => {
        const name = e.currentTarget.dataset.product;
        const p = this.PRODUCTS.find(x => x.name === name);
        if (p && p.inStock === false) return;
        this.setState({ selectedProduct: name });
      },
      selectFromDetail: (e) => {
        if (e) e.preventDefault();
        if (cp.inStock === false) return;
        // The order form lives in the home view, so switch back to it, pre-select
        // the scooter being viewed, then scroll down to the form once it renders.
        this.setState({ view: 'home', selectedProduct: cp.name });
        setTimeout(() => {
          const el = document.getElementById('commander');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      updateField: (e) => {
        const field = e.currentTarget.dataset.field;
        this.setState({ form: { ...this.state.form, [field]: e.currentTarget.value } });
      },
      submitOrder: () => {
        const p = this.PRODUCTS.find(p => p.name === this.state.selectedProduct) || this.PRODUCTS.find(p => p.inStock !== false) || this.PRODUCTS[0];
        if (!p || p.inStock === false) return;
        const f = this.state.form;
        const city = f.city || this.T[this.state.lang].cities[0];

        // Capture the lead server-side first (fire-and-forget with keepalive so the
        // request survives navigation to WhatsApp and the popup keeps the user gesture).
        // This way we keep every lead even if the customer never hits "send" in WhatsApp.
        const payload = {
          name: f.name, phone: f.phone, city, qty: f.qty,
          product: p.name, price: p.priceNum,
          address: f.address || '', note: f.note || '',
          lang: this.state.lang, hp: f.hp || '',
          ts: new Date().toISOString()
        };
        try {
          fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(() => {});
        } catch (e) { /* never block the WhatsApp handoff */ }

        const lines = this.state.lang === 'ar'
          ? `مرحباً،\n\nأرغب في طلب :\n\nالمنتج : ${p.name}\nالثمن : ${p.price} درهم\nالكمية : ${f.qty}\n\nالاسم : ${f.name}\nالهاتف : ${f.phone}\nالمدينة : ${city}\nالعنوان : ${f.address || '—'}${f.note ? `\nملاحظة : ${f.note}` : ''}\n\nشكراً.`
          : `Bonjour,\n\nJe souhaite commander :\n\nProduit : ${p.name}\nPrix : ${p.price} MAD\nQuantité : ${f.qty}\n\nNom : ${f.name}\nTéléphone : ${f.phone}\nVille : ${city}\nAdresse : ${f.address || '—'}${f.note ? `\nNote : ${f.note}` : ''}\n\nMerci.`;
        window.open('https://wa.me/' + this.WA_NUMBER + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
      }
    };
  }
}
