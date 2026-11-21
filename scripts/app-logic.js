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
    sort: 'recommended',
    stockOnly: false,
    budget: 'all',
    comparison: ['', '', ''],
    orderError: '',
    submitting: false,
    theme: 'light',
    loaded: false,
    loadError: false
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
      const r = await fetch('/data/products.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('Catalog HTTP ' + r.status);
      const data = await r.json();
      if (!Array.isArray(data.products)) throw new Error('Invalid catalog');
      this.PRODUCTS = data.products.map(p => ({ ...p,
        cat: p.category,
        category: (data.cats || this.CATS_FALLBACK).find(c => c.key === p.category) || p.category,
        shortDesc: p.short_desc,
        inStock: p.in_stock,
        priceNum: p.price,
        price: p.price.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' '),
        speed: { ...(p.speed_i18n || {}), fr: p.speed },
        range: { ...(p.range_i18n || {}), fr: p.range },
        specs: p.specs && p.specs.length ? p.specs.map(s => {
          const label = typeof s.label === 'object' ? s.label.fr : s.label;
          const value = { Puissance: p.power, Vitesse: p.speed, Autonomie: p.range }[label];
          return value ? { ...s, value: typeof s.value === 'object' ? { ...s.value, fr: value } : value } : s;
        }) : [{ label: { fr: 'Puissance', ar: 'القوة' }, value: p.power }, { label: { fr: 'Vitesse', ar: 'السرعة' }, value: p.speed }, { label: { fr: 'Autonomie', ar: 'المدى' }, value: p.range }],
        images: p.images.map(src => ({ display: src, thumb: src, ...(p.image_meta || {})[src] }))
      }));
      this.CATS = data.cats || [];
      this.BRANDS = [...new Set(this.PRODUCTS.map(p => p.brand).filter(Boolean))];
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
      this.setState({ loaded: true, loadError: true });
    }
  }

  // __T_BLOCK__

  UI = {
    fr: {
      heroTitle: 'VOTRE VILLE.', heroTitleAccent: 'VOTRE RYTHME.',
      heroBadge: 'HIDRISSI · ELECTRIC MOBILITY',
      heroSubtitle: 'Une nouvelle façon de vivre la ville. Découvrez votre prochaine trottinette électrique.',
      heroCta: 'Explorer la collection', talk: 'Parlons de votre projet', from: 'À partir de',
      budget:'Votre budget', allPrices:'Tous les prix', under4000:'Moins de 4 000 MAD',over4000:'4 000 MAD et plus',chooseModel:'Choisir un modèle',compareHelp:'Sélectionnez jusqu’à trois modèles et comparez leurs caractéristiques.',compareNav:'Comparer',parts:'Accessoires & pièces',partsTitle:'Votre trajet continue.',partsCopy:'Pneu, chargeur ou frein : indiquez votre modèle pour vérifier la compatibilité et la disponibilité.',partsCta:'Trouver ma pièce',shopTitle:'Du premier conseil au prochain kilomètre.',shopCopy:'Rencontrez notre équipe au showroom d’Aïn Aouda. Choix du modèle, entretien et assistance : parlons de ce dont vous avez besoin.',visit:'Visiter le showroom',chooseRide:'À chaque trajet, son caractère.',urbanTitle:'La ville, en toute liberté.',perfTitle:'Changez de rythme.',explore:'Explorer',imageNote:'Mise en scène studio',
      showroom: 'Votre prochain départ commence ici.', showroomPlace: 'Notre showroom · Aïn Aouda, Rabat',
      collectionEyebrow: 'CHOISISSEZ VOTRE PROCHAIN DÉPART', collectionTitle: 'À chacun sa façon de rouler.',
      collectionGoal: 'Comparez les modèles, trouvez votre équilibre entre puissance, autonomie et budget.',
      sortLabel: 'Trier par', recommended: 'Notre sélection', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant',
      stockOnly: 'En stock uniquement', resetFilters: 'Tout réinitialiser', inStockLabel: 'Disponible',
      discover: 'Voir le modèle', catalog: 'Le catalogue', advise: 'Un conseil ? Parlons-en.',
      shipping: 'Livraison offerte', nationwide: 'Partout au Maroc', payment: 'À la livraison',
      browseCollection: 'Voir la collection', formError: 'Indiquez votre nom et un numéro de téléphone valide pour continuer.',
      step2Desc: 'Un conseiller confirme votre commande avec vous.', waSubtitle: 'Un conseiller vous accompagne',
      orderTitle: 'Votre nouvelle liberté, en quelques clics.', orderEyebrow: 'ON S’OCCUPE DE VOUS',
      compareEyebrow: 'LE BON CHOIX, SIMPLEMENT', compareTitle: 'Trouvez celle qui vous ressemble.',
      mobileHome: 'Accueil', mobileCatalog: 'Modèles', mobileOrder: 'Commander'
    },
    ar: {
      heroTitle: 'مدينتك.', heroTitleAccent: 'بإيقاعك.', heroBadge: 'HIDRISSI · التنقل الكهربائي',
      budget:'الميزانية',allPrices:'كل الأثمنة',under4000:'أقل من 4000 درهم',over4000:'4000 درهم وأكثر',chooseModel:'اختر موديل',compareHelp:'اختر حتى ثلاثة موديلات وقارن مواصفاتها.',compareNav:'قارن',parts:'الإكسسوارات والقطع',partsTitle:'نرافقك بعد الشراء أيضاً.',partsCopy:'أخبرنا بموديل دراجتك للتحقق من التوافق وتوفر القطعة المناسبة.',partsCta:'ابحث عن قطعتي',shopTitle:'من أول نصيحة إلى الكيلومتر القادم.',shopCopy:'زر فريقنا في معرض عين عودة لاختيار الموديل والصيانة والمساعدة.',visit:'زيارة المعرض',chooseRide:'لكل رحلة طابعها.',urbanTitle:'المدينة بكل حرية.',perfTitle:'غيّر إيقاعك.',explore:'اكتشف',imageNote:'تصوير استوديو توضيحي',
      heroSubtitle: 'لتنقّلاتك اليومية أو رحلاتك بكل حرية. اختر دراجتك الكهربائية ودع التوصيل علينا.',
      heroCta: 'اختر دراجتك', talk: 'استشر فريقنا', from: 'ابتداءً من',
      showroom: 'انطلاقتك القادمة تبدأ هنا.', showroomPlace: 'معرضنا · عين عودة، الرباط',
      collectionEyebrow: 'اختر انطلاقتك القادمة', collectionTitle: 'لكل شخص طريقته في التنقّل.',
      collectionGoal: 'قارن الموديلات واختر التوازن المناسب بين القوة والمدى والميزانية.',
      sortLabel: 'الترتيب', recommended: 'اختياراتنا', priceAsc: 'الثمن تصاعدياً', priceDesc: 'الثمن تنازلياً',
      stockOnly: 'المتوفر فقط', resetFilters: 'إعادة ضبط الفلاتر', inStockLabel: 'متوفر',
      discover: 'اكتشف الموديل', catalog: 'المنتجات', advise: 'تحتاج نصيحة؟ تواصل معنا.',
      shipping: 'توصيل مجاني', nationwide: 'لكل أنحاء المغرب', payment: 'عند الاستلام',
      browseCollection: 'عرض المنتجات', formError: 'أدخل اسمك ورقم هاتف صحيحاً للمتابعة.',
      step2Desc: 'يتواصل معك مستشار لتأكيد الطلب.', waSubtitle: 'فريقنا هنا لمساعدتك',
      orderTitle: 'حريتك الجديدة، بخطوات بسيطة.', orderEyebrow: 'نرافقك في كل خطوة',
      compareEyebrow: 'الاختيار المناسب بكل سهولة', compareTitle: 'اختر الدراجة التي تناسبك.',
      mobileHome: 'الرئيسية', mobileCatalog: 'الموديلات', mobileOrder: 'اطلب الآن'
    }
  };

  CATS_FALLBACK = [
    { key: 'all', fr: 'Tous', ar: 'الكل' },
    { key: 'perf', fr: 'Performance', ar: 'أداء عالٍ' },
    { key: 'city', fr: 'Urbain', ar: 'حضري' },
    { key: 'compact', fr: 'Compacte', ar: 'مدمجة' }
  ];

  renderVals() {
    const { view, activeProduct, activeImage, selectedProduct, form, lang, theme } = this.state;
    const t = { ...this.T[lang], ...this.UI[lang], themeToggle: lang === 'ar' ? (theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح') : (theme === 'light' ? 'Mode sombre' : 'Mode clair') };
    const L = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? ((Array.isArray(v[lang]) ? v[lang].length > 0 : !!v[lang]) ? v[lang] : v.fr) : v;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const cats = (this.CATS && this.CATS.length) ? this.CATS : this.CATS_FALLBACK;
    const palette = theme === 'dark' ? this.THEME_DARK : this.THEME_LIGHT;
    const isLight = theme !== 'dark';
    const logoSrc = isLight ? 'assets/logo-dark.png' : 'assets/logo-white.png';
    const themeIcon = isLight ? '◐' : '◑';

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

    const heroImage = 'assets/hero-studio-v3.webp', heroW = 1536, heroH = 1024;

    const qty = parseInt(form.qty) || 1;
    const selP = this.PRODUCTS.find(p => p.name === selectedProduct) || this.PRODUCTS.find(p => p.inStock !== false) || this.PRODUCTS[0] || { priceNum: 0, inStock: true };
    const canOrder = this.state.loaded && !this.state.loadError && this.PRODUCTS.some(p => p.inStock !== false) && selP.inStock !== false;
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
    const filteredProducts = products.filter(p => { const price=this.PRODUCTS.find(x=>x.name===p.name).priceNum; return matchCat(p.name) && matchBrand(p.name) && matchSearch(p.name) && (!this.state.stockOnly || p.inStock) && (this.state.budget==='all' || (this.state.budget==='under' ? price<4000 : price>=4000)); });
    if (this.state.sort === 'priceAsc') filteredProducts.sort((a,b) => this.PRODUCTS.find(p=>p.name===a.name).priceNum - this.PRODUCTS.find(p=>p.name===b.name).priceNum);
    if (this.state.sort === 'priceDesc') filteredProducts.sort((a,b) => this.PRODUCTS.find(p=>p.name===b.name).priceNum - this.PRODUCTS.find(p=>p.name===a.name).priceNum);
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
      partsLink:'https://wa.me/'+this.WA_NUMBER+'?text='+encodeURIComponent(lang==='ar'?'مرحباً، أبحث عن قطعة أو إكسسوار لدراجتي. الموديل: ... القطعة: ... هل هي متوافقة ومتوفرة؟':'Bonjour, je cherche une pièce ou un accessoire. Mon modèle : ... Pièce souhaitée : ... Pouvez-vous confirmer la compatibilité et la disponibilité ?'),
      filteredProducts, orderableProducts, catChips, brandChips, resultLabel,
      budget:this.state.budget, changeBudget:e=>this.setState({budget:e.currentTarget.value}),
      compareSlots:this.state.comparison.map((name,i)=>({index:i,name,label:(lang==='ar'?'الموديل ':'Modèle ')+(i+1)})),
      comparisonProducts:products.filter(p=>this.state.comparison.some(Boolean)?this.state.comparison.includes(p.name):products.slice(0,3).some(x=>x.name===p.name)),
      changeComparison:e=>{const comparison=[...this.state.comparison];comparison[Number(e.currentTarget.dataset.slot)]=e.currentTarget.value;this.setState({comparison});},
      chooseRide:e=>{this.setState({cat:e.currentTarget.dataset.category,brand:'all',search:'',budget:'all',view:'home'});setTimeout(()=>document.getElementById('collection')?.scrollIntoView({behavior:'smooth'}),60);},
      navigateSection:e=>{e.preventDefault();const id=e.currentTarget.dataset.section;this.setState({view:'home'});setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),60);},
      productCount: products.length,
      minPrice: this.PRODUCTS.length ? Math.min(...this.PRODUCTS.map(p=>p.priceNum)).toLocaleString('fr-FR') : '—',
      sort: this.state.sort, stockOnly: this.state.stockOnly,
      changeSort: e => this.setState({sort:e.currentTarget.value}),
      toggleStock: e => this.setState({stockOnly:e.currentTarget.checked}),
      resetFilters: () => this.setState({search:'',cat:'all',brand:'all',sort:'recommended',stockOnly:false,budget:'all'}),
      navigateCatalog: e => { if(e)e.preventDefault();this.setState({view:'home'});setTimeout(()=>document.getElementById('collection')?.scrollIntoView({behavior:'smooth'}),60); },
      navigateOrder: e => { if(e)e.preventDefault();this.setState({view:'home'});setTimeout(()=>document.getElementById('commander')?.scrollIntoView({behavior:'smooth'}),60); },
      openProductKey: e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();const idx=this.PRODUCTS.findIndex(p=>p.name===e.currentTarget.dataset.name);if(idx>=0){this.setState({view:'detail',activeProduct:idx,activeImage:0});window.scrollTo({top:0,behavior:'smooth'});}} },
      hasOrderError: !!this.state.orderError, orderError: this.state.orderError,
      submitting: this.state.submitting,
      orderButtonLabel: this.state.submitting ? (lang === 'ar' ? 'جارٍ تسجيل الطلب…' : 'Enregistrement de la commande…') : t.waCta,
      hasResults: n > 0, noResults: this.state.loaded && !this.state.loadError && n === 0,
      loading: !this.state.loaded, loadError: this.state.loadError,
      catalogStatus: lang === 'ar' ? (this.state.loadError ? 'تعذر تحميل المنتجات. أعد تحميل الصفحة.' : 'جارٍ تحميل المنتجات…') : (this.state.loadError ? 'Impossible de charger le catalogue. Rechargez la page.' : 'Chargement du catalogue…'),
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
      toggleLang: () => { const next = lang === 'fr' ? 'ar' : 'fr'; document.documentElement.lang = next; this.setState({ lang: next, orderError: '' }); },
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
      submitOrder: async () => {
        if (this.state.submitting) return;
        const p = this.PRODUCTS.find(p => p.name === this.state.selectedProduct) || this.PRODUCTS.find(p => p.inStock !== false) || this.PRODUCTS[0];
        if (!p || p.inStock === false) return;
        const f = this.state.form;
        if (!f.name.trim() || !/^[+\d][\d\s().-]{7,19}$/.test(f.phone.trim())) { this.setState({ orderError: this.UI[this.state.lang].formError }); return; }
        this.setState({orderError:'', submitting:true});
        const city = f.city || this.T[this.state.lang].cities[0];

        // Keep the same request ID on retry, even after an uncertain network response.
        const fingerprint = JSON.stringify([f, p.name, p.priceNum, this.state.lang]);
        if (this.orderFingerprint !== fingerprint) {
          this.orderFingerprint = fingerprint;
          this.orderRequestId = Date.now() + '-' + crypto.randomUUID();
        }
        const payload = {
          name: f.name, phone: f.phone, city, qty: f.qty,
          product: p.name, price: p.priceNum,
          address: f.address || '', note: f.note || '',
          lang: this.state.lang, hp: f.hp || '',
          orderId: this.orderRequestId
        };
        const popup = window.open('about:blank', '_blank');
        if (popup) { popup.opener = null; popup.document.title = 'HIDRISSI'; popup.document.body.textContent = this.state.lang === 'ar' ? 'جارٍ تسجيل طلبك…' : 'Enregistrement de votre commande…'; }
        try {
          const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
            signal: AbortSignal.timeout(25000)
          });
          const saved = await response.json();
          if (!response.ok || !saved.ok) throw new Error('order_not_saved');
        } catch (e) {
          if (popup && !popup.closed) popup.close();
          this.setState({submitting:false,orderError:this.state.lang === 'ar' ? 'لم نتمكن من تسجيل الطلب. معلوماتك ما زالت هنا. أعد المحاولة.' : 'La commande n’a pas pu être enregistrée. Vos informations sont conservées ici. Réessayez.'});
          return;
        }

        const lines = this.state.lang === 'ar'
          ? `مرحباً،\n\nأرغب في طلب :\n\nالمنتج : ${p.name}\nالثمن : ${p.price} درهم\nالكمية : ${f.qty}\n\nالاسم : ${f.name}\nالهاتف : ${f.phone}\nالمدينة : ${city}\nالعنوان : ${f.address || '—'}${f.note ? `\nملاحظة : ${f.note}` : ''}\n\nشكراً.`
          : `Bonjour,\n\nJe souhaite commander :\n\nProduit : ${p.name}\nPrix : ${p.price} MAD\nQuantité : ${f.qty}\n\nNom : ${f.name}\nTéléphone : ${f.phone}\nVille : ${city}\nAdresse : ${f.address || '—'}${f.note ? `\nNote : ${f.note}` : ''}\n\nMerci.`;
        const destination = 'https://wa.me/' + this.WA_NUMBER + '?text=' + encodeURIComponent(lines);
        this.setState({submitting:false});
        if (popup && !popup.closed) popup.location.replace(destination);
        else window.location.assign(destination);
      }
    };
  }
}
