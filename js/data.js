/* UPKEEP demo data.
   Every brand, model, product, price and person here is FICTIONAL.
   Prices are customer prices including GST, in rupees. */
(function () {
  'use strict';
  var U = (window.UPKEEP = window.UPKEEP || {});

  // Shown in the footer and on the About page. Change before the pitch if needed.
  var teamName = 'Team Riddhi';

  // Recommended change intervals, in months.
  var STAGES = {
    sediment:   { id: 'sediment',   name: 'Sediment filter',  short: 'Sediment',    months: 6,  blurb: 'Catches sand, rust and silt.' },
    precarbon:  { id: 'precarbon',  name: 'Pre-carbon filter', short: 'Pre-carbon', months: 12, blurb: 'Removes chlorine and odours before the membrane.' },
    membrane:   { id: 'membrane',   name: 'RO membrane',      short: 'RO membrane', months: 24, blurb: 'Reduces dissolved salts (TDS).' },
    postcarbon: { id: 'postcarbon', name: 'Post-carbon filter', short: 'Post-carbon', months: 12, blurb: 'Polishes taste after storage.' },
    uf:         { id: 'uf',         name: 'UF membrane',      short: 'UF',          months: 12, blurb: 'Ultrafiltration polishing stage.' }
  };

  var BRANDS = [
    { id: 'aquanova',  name: 'AquaNova' },
    { id: 'hydrapure', name: 'HydraPure' },
    { id: 'clearsip',  name: 'ClearSip' },
    { id: 'purahome',  name: 'PuraHome' }
  ];

  // Model codes are what's printed on the model label. `aliases` feed the
  // chatbot's keyword matcher (lower-case, matched partially).
  var MODELS = [
    {
      code: 'AQN-N8', brand: 'aquanova', name: 'Neo 8', type: 'RO+UV', housing: 'standard',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon'],
      aliases: ['neo 8', 'neo8', 'n8', 'aqn-n8', 'aqnn8'],
      accent: '#0E7C7B', body: '#FFFFFF', shape: 'tall'
    },
    {
      code: 'AQN-N10P', brand: 'aquanova', name: 'Neo 10 Plus', type: 'RO+UV', housing: 'wide',
      housingNote: '7 cm wide sediment housing',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon'],
      aliases: ['neo 10 plus', 'neo10 plus', 'neo 10+', 'neo10+', 'neo 10p', 'neo10p', 'neo 10', 'neo10', 'n10p', 'aqn-n10p', 'aqnn10p'],
      accent: '#0B2545', body: '#FFFFFF', shape: 'wide'
    },
    {
      code: 'HYP-CRO', brand: 'hydrapure', name: 'Classic RO', type: 'RO', housing: 'standard',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon'],
      aliases: ['classic ro', 'classic', 'hyp-cro', 'hypcro'],
      accent: '#2F6FA3', body: '#F4F7FA', shape: 'tall'
    },
    {
      code: 'HYP-SRU', brand: 'hydrapure', name: 'Smart RO+UF', type: 'RO+UF', housing: 'standard',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon', 'uf'],
      aliases: ['smart ro+uf', 'smart ro uf', 'smart ro', 'smart', 'hyp-sru', 'hypsru'],
      accent: '#2F6FA3', body: '#1C2B3A', shape: 'dark'
    },
    {
      code: 'CSP-M6', brand: 'clearsip', name: 'Mini 6', type: 'RO', housing: 'compact',
      housingNote: 'compact under-counter housing',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon'],
      aliases: ['mini 6', 'mini6', 'mini', 'csp-m6', 'cspm6', 'm6'],
      accent: '#5BC0BE', body: '#FFFFFF', shape: 'mini'
    },
    {
      code: 'PRH-ELT', brand: 'purahome', name: 'Elite RO+UV+UF', type: 'RO+UV+UF', housing: 'standard',
      stages: ['sediment', 'precarbon', 'membrane', 'postcarbon', 'uf'],
      aliases: ['elite ro+uv+uf', 'elite ro', 'elite', 'prh-elt', 'prhelt'],
      accent: '#B7791F', body: '#FFFFFF', shape: 'elite'
    }
  ];

  var PRICES = { sediment: 294, kit3: 999, membrane: 1649, annual: 2479, install: 349, diagnosis: 349, careplan: 2359 };

  var MADE_BY = 'Made & wet-tested by Sarjan Watertech';

  function modelByCode(code) {
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].code === code) return MODELS[i];
    return null;
  }
  function brandById(id) {
    for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i].id === id) return BRANDS[i];
    return null;
  }
  function modelLabel(m) { return brandById(m.brand).name + ' ' + m.name; }

  // ---- Products: model-specific variants so the fit logic is visible ----
  var PRODUCTS = [];
  function add(p) { p.madeBy = MADE_BY; PRODUCTS.push(p); }

  MODELS.forEach(function (m) {
    var label = modelLabel(m);
    var suffix = m.housing === 'wide' ? ' (wide housing)' : m.housing === 'compact' ? ' (compact)' : '';
    var key = m.code;
    add({
      sku: 'SED-' + key, family: 'sediment', kind: 'part', addOn: true,
      name: 'Sediment pre-filter — ' + label + suffix,
      short: 'Sediment pre-filter',
      price: PRICES.sediment, fits: [m.code], stages: ['sediment'],
      box: ['1 × spun sediment cartridge' + (m.housing === 'wide' ? ' (7 cm wide)' : ''), '2 × O-rings', 'Fit card with your model code'],
      desc: 'A fresh spun-polypropylene pre-filter that protects everything after it. Sold as an add-on to any kit.'
    });
    add({
      sku: 'KIT3-' + key, family: 'kit3', kind: 'part',
      name: 'Filter kit — ' + label + suffix,
      short: '3-stage filter kit',
      price: PRICES.kit3, fits: [m.code], stages: ['sediment', 'precarbon', 'postcarbon'],
      box: ['Sediment cartridge' + (m.housing === 'wide' ? ' (7 cm wide housing)' : ''), 'Pre-carbon block', 'Post-carbon (inline)', 'O-rings, thread tape, 2 × push-fit clips', 'Fit card + QR verification label'],
      desc: 'Sediment, pre-carbon and post-carbon in one box, cut and sealed for the ' + label + '. Restores flow and fresh taste.'
    });
    add({
      sku: 'ANN-' + key, family: 'annual', kind: 'part',
      name: 'Complete annual kit — ' + label + suffix,
      short: 'Complete annual kit',
      price: PRICES.annual, fits: [m.code], stages: m.stages.slice(),
      box: ['80 GPD RO membrane', 'Sediment, pre-carbon and post-carbon cartridges'].concat(m.stages.indexOf('uf') > -1 ? ['UF membrane'] : []).concat(['O-rings, thread tape, clips', 'Fit card + QR verification label']),
      desc: 'Every consumable stage of the ' + label + ' in one box: the membrane plus all filters' + (m.stages.indexOf('uf') > -1 ? ', including the UF stage' : '') + '.'
    });
  });

  // Membranes: one standard 80 GPD membrane is shared by four models,
  // the compact and Elite units need their own. This keeps "Fits:" honest.
  add({
    sku: 'MEM80-STD', family: 'membrane', kind: 'part',
    name: 'RO membrane 80 GPD — standard 11.75″',
    short: 'RO membrane 80 GPD',
    price: PRICES.membrane, fits: ['AQN-N8', 'AQN-N10P', 'HYP-CRO', 'HYP-SRU'], stages: ['membrane'],
    box: ['1 × 80 GPD TFC membrane (wet-tested)', 'Membrane housing O-ring', 'Fit card + QR verification label'],
    desc: 'A thin-film RO membrane that brings TDS back down. Shares one housing size across four mapped models.'
  });
  add({
    sku: 'MEM80-CSP-M6', family: 'membrane', kind: 'part',
    name: 'RO membrane 80 GPD — ClearSip Mini 6 (compact)',
    short: 'RO membrane 80 GPD',
    price: PRICES.membrane, fits: ['CSP-M6'], stages: ['membrane'],
    box: ['1 × 80 GPD compact membrane (wet-tested)', 'Housing O-ring', 'Fit card + QR verification label'],
    desc: 'The compact-length 80 GPD membrane for the ClearSip Mini 6 under-counter housing.'
  });
  add({
    sku: 'MEM80-PRH-ELT', family: 'membrane', kind: 'part',
    name: 'RO membrane 80 GPD — PuraHome Elite RO+UV+UF',
    short: 'RO membrane 80 GPD',
    price: PRICES.membrane, fits: ['PRH-ELT'], stages: ['membrane'],
    box: ['1 × 80 GPD membrane with Elite end-cap (wet-tested)', 'Housing O-ring', 'Fit card + QR verification label'],
    desc: 'An 80 GPD membrane with the Elite\'s keyed end-cap, so it seats first time.'
  });

  var SERVICES = [
    { sku: 'SRV-INSTALL', kind: 'service', name: 'Installation by a vetted partner technician (Part + Pro)', short: 'Part + Pro installation', price: PRICES.install },
    { sku: 'SRV-DIAG', kind: 'service', name: 'Diagnosis visit', short: 'Diagnosis visit', price: PRICES.diagnosis, desc: 'A Sarjan-trained technician checks leaks, power and pressure, then quotes before any work.' },
    { sku: 'SRV-CARE', kind: 'service', name: 'Annual care plan (2 visits + 1 filter kit)', short: 'Annual care plan', price: PRICES.careplan, desc: 'Two scheduled visits a year plus one model-matched filter kit.' }
  ];

  var TECHNICIANS = [
    { id: 'T1', name: 'Mehul Parmar',  initials: 'MP', area: 'Satellite',  rating: 4.9, jobs: 412, eta: '2.1 km away' },
    { id: 'T2', name: 'Farhan Shaikh', initials: 'FS', area: 'Bopal',      rating: 4.8, jobs: 356, eta: '6.4 km away' },
    { id: 'T3', name: 'Kiran Solanki', initials: 'KS', area: 'Maninagar',  rating: 4.7, jobs: 298, eta: '9.8 km away' },
    { id: 'T4', name: 'Ankit Desai',   initials: 'AD', area: 'Chandkheda', rating: 4.6, jobs: 241, eta: '12.3 km away' }
  ];

  var DELIVERY = {
    nextday: { id: 'nextday', name: 'UPKEEP next-day', sub: 'Ahmedabad · free above ₹999', fee: 49, freeAbove: 999 },
    quick: { id: 'quick', name: 'Delivered in ~15 min', sub: 'via a quick-commerce partner', fee: 0 },
    partners: ['Blinkit', 'Zepto', 'Instamart'],
    marketplaces: ['Amazon', 'Flipkart']
  };

  var SLOTS = [
    { id: 'morning', name: 'Morning', time: '9 am – 12 pm' },
    { id: 'afternoon', name: 'Afternoon', time: '12 – 4 pm' },
    { id: 'evening', name: 'Evening', time: '4 – 8 pm' }
  ];

  var ALL = PRODUCTS.concat(SERVICES);
  function productBySku(sku) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].sku === sku) return ALL[i];
    return null;
  }
  function productsForModel(code) {
    return PRODUCTS.filter(function (p) { return p.fits.indexOf(code) > -1; });
  }
  // The exact-fit product for a model + family (e.g. 'kit3', 'membrane').
  function productFor(code, family) {
    var list = productsForModel(code);
    for (var i = 0; i < list.length; i++) if (list[i].family === family) return list[i];
    return null;
  }

  U.data = {
    teamName: teamName,
    stages: STAGES,
    brands: BRANDS,
    models: MODELS,
    products: PRODUCTS,
    services: SERVICES,
    technicians: TECHNICIANS,
    delivery: DELIVERY,
    slots: SLOTS,
    prices: PRICES,
    madeBy: MADE_BY,
    plant: 'Changodar, Ahmedabad',
    modelByCode: modelByCode,
    brandById: brandById,
    modelLabel: modelLabel,
    productBySku: productBySku,
    productsForModel: productsForModel,
    productFor: productFor
  };
})();
