// Default content — mirrors what's hardcoded in components.
// When content.json exists in blob storage, those values override these.

export const capeStatDefaults = [
  { value: '4',    label: 'Years in Development' },
  { value: '9mo',  label: 'Quality Control' },
  { value: '3+yr', label: 'Salon Tested' },
  { value: 'Free', label: 'US Shipping' },
]

export const capeBadgeDefaults = ['Woman-Owned']

// Default shop products — shown when Cosmos DB has no active products yet (e.g. new env).
export const defaultProducts = [
  {
    productId:    'capsule-wardrobe-cape',
    name:         'The Capsule Wardrobe Cape',
    description:  'Patent-pending side-seam design. No center seam — a smoother cutting surface for stylists, barbers, and colorists. Extended body and neckline for more coverage. Machine washable, lightweight, and color resistant. Free U.S. shipping.',
    priceInCents: 5999,
    imageUrl:     'https://cdn.shopify.com/s/files/1/0708/6751/7679/files/IMG_576DDA324E75-1.jpg?v=1736306593',
    active:       true,
  },
]

const CAPE_STAT_POSITIONS = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right']

export { CAPE_STAT_POSITIONS }

function isValidCapeStat(stat) {
  return stat?.value?.trim?.() && stat?.label?.trim?.()
}

export function normalizeContent(remote) {
  if (!remote || typeof remote !== 'object') return defaultContent

  const content = {
    ...defaultContent,
    ...remote,
    hero: { ...defaultContent.hero, ...remote.hero },
    cape: { ...defaultContent.cape, ...remote.cape },
    statement: { ...defaultContent.statement, ...remote.statement },
    audiences: remote.audiences ?? defaultContent.audiences,
    features: remote.features ?? defaultContent.features,
    announcement: remote.announcement ?? defaultContent.announcement,
    barbersPage: { ...defaultContent.barbersPage, ...remote.barbersPage },
    stylistsPage: { ...defaultContent.stylistsPage, ...remote.stylistsPage },
  }

  const stats = remote.cape?.stats
  const statsOk = Array.isArray(stats) && stats.length === 4 && stats.every(isValidCapeStat)

  content.cape.stats = statsOk
    ? stats.map(s => ({ value: s.value.trim(), label: s.label.trim() }))
    : capeStatDefaults.map(s => ({ ...s }))

  const badges = remote.cape?.badges?.filter(b => typeof b === 'string' && b.trim())
  content.cape.badges = badges?.length ? badges : [...capeBadgeDefaults]

  return content
}

export const defaultContent = {
  announcement: null, // { message: '...', link: null } or null to hide

  hero: {
    eyebrow: 'For the Professional',
    sub:     'The Capsule Wardrobe Cape',
    tagline: 'Elevate your tools, elevate your worth.',
  },

  cape: {
    titleLine1: 'The Capsule',
    titleLine2: 'Wardrobe Cape',
    body1: 'A capsule wardrobe is a small collection of high-quality, versatile pieces that work together and never go out of style. Our cape brings that philosophy behind the chair — intentional, elevated, and built to last.',
    body2: 'One essential piece that does it all. Loved by stylists, barbers, and colorists after four years in development and nine months of rigorous quality control.',
    stats: capeStatDefaults.map(s => ({ ...s })),
    badges: [...capeBadgeDefaults],
  },

  barbersPage: {
    tag: 'For the Barbers',
    title: 'Built for the Way Barbers Work- Full Coverage for Clipper cuts and Clean Lower Neck Trimming',
    video: '/videos/barber-video1.mp4',
    videoAlt: 'Barber using clippers on a client wearing the Wyrth cape',
    intro: 'Barbers don\u2019t just cut \u2014 they fade, taper, clip, shave, and shape every detail. The Wyrth Cape is designed to move with you, giving you full neck access without sacrificing shirt coverage.',
    sections: [
      {
        id: 'full-shirt-protection',
        title: 'Full Shirt Protection',
        paragraphs: [
          'Other capes open down the middle. When you need access to the lower neck, the client\u2019s shirt ends up catching loose hairs. Wyrth changes that.',
          'Our unique design ensures the cape wraps from the right shoulder across the entire back and around the left, with the front overlapping on top. Even when open, the client\u2019s shirt stays fully covered.',
        ],
      },
      {
        id: 'keep-it-clean',
        title: 'Keep It Clean, Always',
        paragraphs: [
          'Whether you\u2019re shaving a neckline or doing a full skin fade, you want a cape that protects the client and doesn\u2019t get in your way.',
        ],
        bullets: [
          'Tuckable fabric lets you maintain control without draping towels or grabbing for the brush.',
          'No center split means no exposed collar or back \u2014 just clean lines and clean shirts.',
          'Easy to adjust, easy to sanitize, and made for real working hands.',
        ],
      },
      {
        id: 'everyday-use',
        title: 'Designed for Everyday Use',
        paragraphs: [
          'Made with premium materials that hold up in the shop, the Wyrth Cape is lightweight but durable, and machine washable. It\u2019s breathable, fluid-resistant, and built for high-volume days behind the chair.',
          'Whether you\u2019re doing fades, hot shaves, or detailed beard work \u2014 the Wyrth Cape moves with you and works smarter, just like you do.',
        ],
      },
    ],
    ctaLabel: 'Buy now',
    ctaHref: '/shop',
  },

  stylistsPage: {
    brand: 'WYRTH',
    title: 'Side Seam Salon Stylists, Colorists and Barber Cape',
    description:
      'Our patent pending salon and barber cape features a side seam, and reduced rippling in fabric to provide a smoother cutting surface for haircutting and more coverage for clipper cuts, providing a clean service. The smoother cutting surface enhances your ability to cut a perfect line. We designed this cape with stylists and clients in mind by extending the body and neckline of the cape to fit more body types than a typical cutting cape. We are a salon supplier of beauty product whole products and tools.',
    showcaseImages: [
      {
        src: '/images/stylists-hair-back.jpg',
        alt: 'Long straight hair over the Wyrth cape — smooth cutting surface',
      },
      {
        src: '/images/stylists-cape-clips.jpg',
        alt: 'Stylist adjusting the cape neckline clips',
      },
      {
        src: '/images/stylists-cape-drape.jpg',
        alt: 'Stylist draping the Wyrth cape over a client',
      },
      {
        src: '/images/stylists-cape-fit.jpg',
        alt: 'Stylist fitting the cape on a seated client',
      },
    ],
    faq: [
      {
        question: 'Are Wyrth capes bleach and color resistant?',
        answer:
          'Yes. Our fabric is fluid-repelling and color-resistant, built to hold up against bleach, toner, and even the messiest bowl work. Color stays where it belongs — off your client and off their clothes.',
      },
      {
        question: 'How do I know I\u2019ll like the quality without seeing the cape?',
        answer:
          'Four years in development, nine months of quality control, and three-plus years of salon testing went into every detail. If it\u2019s not right for your chair, reach out — we stand behind what we make.',
      },
      {
        question: 'How do I care for the capes?',
        answer:
          'Machine wash cold on a gentle cycle and tumble dry low. The fabric is designed to hold its shape and coverage through hundreds of washes without losing its smooth cutting surface.',
      },
      {
        question: 'How do I pronounce Wyrth?',
        answer:
          'It\u2019s pronounced like \u201cworth\u201d — a nod to the value you bring behind the chair, and the cape that matches it.',
      },
      {
        question: 'What are the pro tips?',
        answer:
          'Clip the neckline before you start for a secure fit on every body type. Drape with the side seam to your working side so your cutting surface stays smooth and ripple-free. Between clients, a quick machine wash keeps the fabric fresh and ready for color work.',
      },
    ],
    problemsSection: {
      title: 'The problems you\u2019re tired of',
      image: {
        src: '/images/stylists-hair-back.jpg',
        alt: 'Client wearing the Wyrth cape — back view with long hair over a smooth cutting surface',
      },
      bullets: [
        'The seam down the center back',
        'Ripples in the fabric',
        'Turning the cape to the side',
        'Exposing the clients legs and clothing',
        'Necks are too small for some clients',
        'Back of cape length is too short for long hair',
      ],
    },
    whyWeCareSection: {
      title: 'Why we care',
      body:
        'When it comes to cutting hair, the perimeter is the foundation of the art in our craft. It sets the tone and provides structure for the rest of the hair. However, in many cases, capes can disrupt the process of creating a perfect perimeter. The capes are often too big, too thick, and most importantly, they are not designed to be used with a client. This can lead to a less than ideal experience for the client and the stylist.',
      aside: 'This hinders our craft, and customer service.',
      image: {
        src: '/images/stylists-why-care.webp',
        alt: 'Stylist working on a client\u2019s perimeter haircut',
      },
    },
    solutionSection: {
      title: 'Your solution',
      body:
        'With the Wyrth Side Seam Cape there is no need to turn the cape. It is designed to be used with the client from the moment it drapes. The cape is made of a soft, lightweight material that is easy to drape and remove — with a smooth cutting surface that stays ripple-free so every foundational line is pristine.',
      image: {
        src: '/images/stylists-solution.jpg',
        alt: 'Wyrth cape draped on a client in the salon',
      },
    },
    drapeSection: {
      title: 'How do I drape a client?',
      body:
        'Ensure the front of the client is facing the mirror. Drape the cape over the client\u2019s shoulders, positioning the side seam to your working side. The smooth cutting surface should face you — no need to turn the cape mid-service. Clip the neckline for a secure fit, and you\u2019re ready to cut.',
      image: {
        src: '/images/stylists-drape.webp',
        alt: 'Stylist draping the Wyrth cape over a seated client',
      },
    },
    promoVideo: {
      label: 'Video',
      src: '/videos/wyrth-final-video.mp4',
      poster: '/images/wryth-styling-cape.jpg',
      tagline: 'Elevate your tools, elevate your worth.',
      alt: 'Wyrth cape product video',
    },
  },

  audiences: [
    {
      tag:   'FOR THE',
      title: 'Barbers',
      desc:  "Full neck access without sacrificing shirt coverage. Side-seam design keeps clients covered when you open it up for the neckline.",
      href:  '/barbers',
    },
    {
      tag:   'FOR THE',
      title: 'Stylists',
      desc:  "No center seam on your working surface. Less rippling — a perfectly smooth canvas so every foundational haircut is pristine.",
      href:  '/stylists',
    },
    {
      tag:   'FOR THE',
      title: 'Colorists',
      desc:  "Color-resistant and fluid-repelling. Even the messiest bowl work stays where it belongs — off your client and off their clothes.",
      href:  '/stylists',
    },
    {
      tag:   'FOR YOUR',
      title: 'Clients',
      desc:  "Extended body coverage, premium fabric, and a logomark they'll feel from the moment it drapes. They will comment on the difference.",
      href:  '/stylists',
    },
    {
      tag:   'FOR',
      title: 'Salon Owners',
      desc:  "Equip your entire team with the industry standard. Bulk pricing means you save more when you stock up on every order.",
      href:  '/shop',
    },
    {
      tag:   'FOR YOUR',
      title: 'Brand',
      desc:  "White-label custom capes. Put your logo on the most functional, most professional cape in the industry.",
      href:  '/shop',
    },
  ],

  features: [
    { num: '01', title: 'No Center Seam',       desc: 'A unique side-seam design wraps fully around the client. When you open it for neckline access, their shirt stays covered — every single time.' },
    { num: '02', title: 'Tuckable Fabric',       desc: 'Maintain clean access to the collar without draping extra towels or reaching for the neck strip. Tuckable design keeps you in control.' },
    { num: '03', title: 'Color Resistant',       desc: 'Fluid-repelling technology holds up against even the most aggressive color applications. The messiest bowl work stays off your client.' },
    { num: '04', title: 'Machine Washable',      desc: 'Easy to sanitize between clients. Built for high-volume days and the demanding sanitation standards of a real working salon.' },
    { num: '05', title: 'Lightweight & Durable', desc: 'Premium materials that hold up after hundreds of washes without losing shape or coverage. Breathable enough for a full book of clients.' },
    { num: '06', title: 'Years in the Making',   desc: "Four years in development. Nine months of quality control. One genuinely novel design. This is not an iteration — it's a rethink." },
  ],

  statement: {
    quote: "A cape that won't quit — a statement piece, a power move.",
  },
}
