// Default content — mirrors what's hardcoded in components.
// When content.json exists on S3, those values override these.

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
    stats: [
      { value: '4',    label: 'Years in Development' },
      { value: '9mo',  label: 'Quality Control' },
      { value: '1+yr', label: 'Salon Tested' },
      { value: '★',    label: 'Patent Pending' },
    ],
    badges: ['Woman-Owned', 'Free US Shipping', 'Patent Pending'],
  },

  audiences: [
    {
      tag:   'FOR THE',
      title: 'Barbers',
      desc:  "Full neck access without sacrificing shirt coverage. Side-seam design keeps clients covered when you open it up for the neckline.",
      href:  'https://wyrthco.com/pages/barber-cape',
    },
    {
      tag:   'FOR THE',
      title: 'Stylists',
      desc:  "No center seam on your working surface. Less rippling — a perfectly smooth canvas so every foundational haircut is pristine.",
      href:  'https://wyrthco.com/products/salon-cape',
    },
    {
      tag:   'FOR THE',
      title: 'Colorists',
      desc:  "Color-resistant and fluid-repelling. Even the messiest bowl work stays where it belongs — off your client and off their clothes.",
      href:  'https://wyrthco.com/products/salon-cape',
    },
    {
      tag:   'FOR YOUR',
      title: 'Clients',
      desc:  "Extended body coverage, premium fabric, and a logomark they'll feel from the moment it drapes. They will comment on the difference.",
      href:  'https://wyrthco.com/products/salon-cape',
    },
    {
      tag:   'FOR',
      title: 'Salon Owners',
      desc:  "Equip your entire team with the industry standard. Bulk pricing means you save more when you stock up on every order.",
      href:  'https://wyrthco.com/pages/bundles',
    },
    {
      tag:   'FOR YOUR',
      title: 'Brand',
      desc:  "White-label custom capes. Put your logo on the most functional, most professional cape in the industry.",
      href:  'https://wyrthco.com/pages/custom-logo-capes',
    },
  ],

  features: [
    { num: '01', title: 'No Center Seam',       desc: 'A unique side-seam design wraps fully around the client. When you open it for neckline access, their shirt stays covered — every single time.' },
    { num: '02', title: 'Tuckable Fabric',       desc: 'Maintain clean access to the collar without draping extra towels or reaching for the neck strip. Tuckable design keeps you in control.' },
    { num: '03', title: 'Color Resistant',       desc: 'Fluid-repelling technology holds up against even the most aggressive color applications. The messiest bowl work stays off your client.' },
    { num: '04', title: 'Machine Washable',      desc: 'Easy to sanitize between clients. Built for high-volume days and the demanding sanitation standards of a real working salon.' },
    { num: '05', title: 'Lightweight & Durable', desc: 'Premium materials that hold up after hundreds of washes without losing shape or coverage. Breathable enough for a full book of clients.' },
    { num: '06', title: 'Patent Pending',        desc: "Four years in development. Nine months of quality control. One genuinely novel design. This is not an iteration — it's a rethink." },
  ],

  statement: {
    quote: "A cape that won't quit — a statement piece, a power move.",
  },
}
