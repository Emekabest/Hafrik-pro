// Shared topic pool used by both the Explore Hot Topics and the Feed Discovery Strip.

export const TOPIC_POOL = [
  // Living & Community
  'Jobs in China', 'Student life in China', 'Best cities to live', 'How to find roommates',
  'Making friends in China', 'Mental health abroad', 'Fitness in China', 'Dating culture',
  'African community in Shanghai', 'African community in Guangzhou', 'African community in Shenzhen',
  'African community in Beijing', 'African community in Yiwu', 'African community in Hangzhou',
  'How to find churches', 'Best halal food', 'Best African restaurants', 'African hair salons',
  'African food shops', 'Nigerian community events', 'Ghanaian community events',
  'East African community groups', 'Francophone Africans in China', 'Pan-African events',

  // Business & Trade
  'Shipping from China to Africa', 'Business ideas in China', 'How to register a business',
  'Freight forwarders', 'Agent recommendations', 'China trade fairs', 'Canton Fair tips',
  'Guangzhou markets', 'Yiwu sourcing', 'Importing goods', 'Exporting from China',
  'Marketing for small business', 'How to price products', 'Customer service tips',
  'Starting a restaurant', 'Starting a salon', 'Logistics business', 'E-commerce tips',
  '1688 wholesale sourcing', 'Taobao shopping tips', 'AliExpress guide', 'JD.com deals',
  'Pinduoduo wholesale', 'Drop shipping from China', 'Product quality control',
  'Customs clearance tips', 'Import duties guide', 'How to find reliable suppliers',
  'Building a brand from China', 'Online reselling', 'Affiliate marketing',

  // Visa & Legal
  'Visa renewal tips', 'Work permits', 'Residence permits', 'Student visa tips',
  'Business visa guide', 'X1 visa requirements', 'Z visa guide', 'Embassy contacts Africa',
  'Embassy registration in China', 'How to extend a visa', 'Overstay fines China',
  'Green card equivalent China', 'Permanent residency China', 'Travel documents tips',
  'International driving license', 'Chinese driving license', 'Car ownership in China',

  // Finance & Banking
  'China banking tips', 'How to open a bank account', 'Best banks for foreigners',
  'WeChat pay setup', 'Alipay setup', 'Sending money back home', 'Best remittance apps',
  'Currency exchange tips', 'Crypto in China', 'International transfers',
  'Tax basics for foreigners', 'Tax filing in China', 'Managing finances abroad',

  // Tech & Apps
  'Best VPN in China', 'VPN recommendations 2025', 'Best SIM cards', 'Getting a Chinese number',
  'Internet in China guide', 'DiDi ride guide', 'Meituan food delivery', 'Eleme delivery tips',
  'Bicycle sharing apps', 'Metro apps China', 'High speed train booking', 'Ctrip travel tips',
  'YouTube alternatives China', 'WhatsApp alternatives China', 'Instagram alternatives China',
  'WeChat official accounts for Africans', 'WeChat groups for Africans', 'TikTok in China',
  'Best translation apps', 'Baidu Maps vs Google Maps',

  // Jobs & Education
  'Part-time jobs', 'Teaching English in China', 'TEFL certification', 'HSK exam tips',
  'Learning Chinese fast', 'Chinese language schools', 'Scholarships', 'Internships',
  'Job interviews in China', 'Resume tips for China', 'Networking events',
  'How to build connections', 'LinkedIn in China', 'Finding a job as a foreigner',

  // Housing & Lifestyle
  'Apartment contracts tips', 'Where to buy furniture',
  'Accommodation hacks', 'Cheap flights Africa-China', 'Travel insurance guide',
  'Emergency contacts in China', 'Health check requirements', 'International health insurance',
  'Bringing family to China', 'Schools for African kids in China', 'Pet ownership in China',

  // Products & Sourcing
  'Fashion suppliers', 'Jewelry suppliers', 'Sneakers suppliers', 'Perfume sourcing',
  'Electronics wholesale', 'Best phones to buy in China', 'Best laptops deals',
  'Hair extensions suppliers', 'Cosmetics suppliers', 'Baby products wholesale',
  'Furniture suppliers China', 'Building materials import', 'Solar panels sourcing',
  'Auto parts suppliers', 'Textile suppliers', 'Fabric sourcing guide',

  // Side Hustles & Income
  'Side hustles for Africans in China', 'Freelancing online', 'Content creation tips',
  'YouTube monetization', 'Dropshipping guide', 'Print on demand', 'Amazon FBA tips',
  'Selling on Jumia from China', 'Selling on Konga from China',

  // Food & Culture
  'Food delivery apps', 'Best halal restaurants', 'African food recipes', 'Chinese cuisine guide',
  'Best street food China', 'Vegetarian food in China', 'Cooking African food in China',
  'Where to find African spices', 'African groceries online China',
];

export function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom(arr, count) {
  return shuffle(arr).slice(0, count);
}
