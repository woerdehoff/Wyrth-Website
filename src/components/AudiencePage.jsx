import { Link } from 'react-router-dom'
import AnnouncementBanner from './AnnouncementBanner'
import Nav from './Nav'
import Footer from './Footer'

function SectionContent({ section }) {
  const paragraphs = section.paragraphs ?? (section.body ? [section.body] : [])

  return (
    <section id={section.id} className="mt-9">
      <h2 className="font-body text-[1.05rem] font-bold text-bone-2 mb-3.5">
        {section.title}
      </h2>
      {paragraphs.map((text, i) => (
        <p key={i} className="text-[0.95rem] leading-[1.75] text-bone-2 mb-5">
          {text}
        </p>
      ))}
      {section.bullets?.length > 0 && (
        <ul className="list-disc pl-6 mb-5 space-y-2">
          {section.bullets.map(item => (
            <li key={item} className="text-[0.95rem] leading-[1.75] text-bone-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AudiencePage({
  tag,
  title,
  sub,
  intro,
  image,
  imageAlt,
  video,
  videoAlt,
  sections = [],
  ctaHref = '/shop',
  ctaLabel = 'Buy now',
}) {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="min-h-[80vh] px-6 pt-28 pb-24">
        <article className="max-w-[720px] mx-auto">
          {tag && (
            <p className="inline-block px-4 py-2 mb-8 border border-[#5b9fd4] rounded-md bg-[rgba(91,159,212,0.12)] font-body text-[0.95rem] font-medium text-bone">
              {tag}
            </p>
          )}

          {title && (
            <h1
              className="font-body font-semibold leading-[1.35] text-bone-2 mb-7"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.35rem)' }}
            >
              {title}
            </h1>
          )}

          {intro && (
            <p className="text-[0.95rem] leading-[1.75] text-bone-2 mb-5">
              {intro}
            </p>
          )}
          {sub && !intro && (
            <p className="text-[0.95rem] leading-[1.75] text-bone-2 mb-5">
              {sub}
            </p>
          )}

          {sections.map(section => (
            <SectionContent key={section.id ?? section.title} section={section} />
          ))}

          {video && (
            <figure className="mb-9">
              <video
                className="block w-full border border-line bg-ink-2"
                src={video}
                controls
                playsInline
                preload="metadata"
                aria-label={videoAlt || imageAlt || 'Product video'}
              />
            </figure>
          )}

          {!video && image && (
            <figure className="mb-9">
              <img
                src={image}
                alt={imageAlt || ''}
                loading="lazy"
                decoding="async"
                className="block w-full border border-line bg-ink-2"
              />
            </figure>
          )}

          <div className="mt-12">
            <Link
              to={ctaHref}
              className="btn btn--gold audience-page-cta"
            >
              {ctaLabel}
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
