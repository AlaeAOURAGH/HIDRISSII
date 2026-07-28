class Component extends DCLogic {
  // Overridden at runtime from /api/config (env WA_NUMBER). Fallback below.
  WA_NUMBER = '212641451387';

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
    loaded: false
  };

  // Populated at runtime from products.json (see componentDidMount).
  PRODUCTS = [];
  CATS = [];
  BRANDS = [];
  CAT_OF = {};
  BRAND_OF = {};

  async componentDidMount() {
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
      if (this.WA_NUMBER === '212641451387' && data.waNumberDefault) this.WA_NUMBER = data.waNumberDefault;
      const first = this.PRODUCTS[0] ? this.PRODUCTS[0].name : '';
      this.setState({ loaded: true, selectedProduct: this.state.selectedProduct || first });
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
    const { view, activeProduct, activeImage, selectedProduct, form, lang } = this.state;
    const t = this.T[lang];
    const L = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang] ?? v.fr) : v;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const cats = (this.CATS && this.CATS.length) ? this.CATS : this.CATS_FALLBACK;

    const products = this.PRODUCTS.map((p) => {
      const isSelected = p.name === selectedProduct;
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
        isSelected,
        borderColor: isSelected ? '#E0A645' : 'rgba(255,255,255,0.14)',
        bgColor: isSelected ? '#E0A645' : '#17232F',
        textColor: isSelected ? '#0E1621' : '#F3ECDD'
      };
    });

    const EMPTY = { name: '', category: '', desc: '', price: '', specs: [], features: { fr: [], ar: [] }, images: [] };
    const cp = this.PRODUCTS[activeProduct] || this.PRODUCTS[0] || EMPTY;
    const cpImages = cp.images || [];
    const currentProduct = {
      name: cp.name,
      category: L(cp.category),
      desc: L(cp.desc),
      price: cp.price,
      specs: (cp.specs || []).map(s => ({ label: L(s.label), value: L(s.value) })),
      features: L(cp.features || { fr: [], ar: [] }),
      images: cpImages.map((im, i) => ({
        thumb: im.thumb,
        w: im.w,
        h: im.h,
        borderColor: i === activeImage ? '#E0A645' : 'rgba(255,255,255,0.14)'
      }))
    };
    const curMain = cpImages[activeImage] || cpImages[0] || { display: '', w: '', h: '' };
    const currentImage = curMain.display, currentImageW = curMain.w, currentImageH = curMain.h;

    const heroImage = 'assets/hero-1600.webp', heroW = 1536, heroH = 1024;

    const qty = parseInt(form.qty) || 1;
    const selP = this.PRODUCTS.find(p => p.name === selectedProduct) || this.PRODUCTS[0] || { priceNum: 0 };
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
      bg: on ? 'rgba(224,166,69,0.12)' : 'transparent',
      color: on ? '#E0A645' : '#C3CCD5',
      bar: on ? '#E0A645' : 'transparent',
      countBg: on ? 'rgba(224,166,69,0.18)' : 'rgba(255,255,255,0.05)',
      countColor: on ? '#E0A645' : '#8A96A3'
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
      t, dir, lang, waLink,
      filteredProducts, catChips, brandChips, resultLabel,
      hasResults: n > 0, noResults: this.state.loaded && n === 0,
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
      selectProduct: (e) => this.setState({ selectedProduct: e.currentTarget.dataset.product }),
      selectFromDetail: (e) => {
        if (e) e.preventDefault();
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
        const p = this.PRODUCTS.find(p => p.name === this.state.selectedProduct) || this.PRODUCTS[0];
        if (!p) return;
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
