import { Link } from 'react-router-dom'
import AnnouncementBanner from './AnnouncementBanner'
import Nav from './Nav'
import Footer from './Footer'

function SectionContent({ section }) {
  const paragraphs = section.paragraphs ?? (section.body ? [section.body] : [])

  return (
    <section id={section.id} className="audience-page__section">
      <h2 className="audience-page__section-title">{section.title}</h2>
      {paragraphs.map((text, i) => (
        <p key={i} className="audience-page__text">{text}</p>
      ))}
      {section.bullets?.length > 0 && (
        <ul className="audience-page__list">
          {section.bullets.map(item => (
            <li key={item}>{item}</li>
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
      <main className="audience-page">
        <article className="audience-page__content">
          {tag && <p className="audience-page__tag">{tag}</p>}

          {title && <h1 className="audience-page__title">{title}</h1>}

          {intro && <p className="audience-page__intro">{intro}</p>}
          {sub && !intro && <p className="audience-page__intro">{sub}</p>}

          {sections.map(section => (
            <SectionContent key={section.id ?? section.title} section={section} />
          ))}

          {video && (
            <figure className="audience-page__figure">
              <video
                className="audience-page__video"
                src={video}
                controls
                playsInline
                preload="metadata"
                aria-label={videoAlt || imageAlt || 'Product video'}
              />
            </figure>
          )}

          {!video && image && (
            <figure className="audience-page__figure">
              <img src={image} alt={imageAlt || ''} className="audience-page__image" />
            </figure>
          )}

          <div className="audience-page__cta">
            <Link to={ctaHref} className="btn btn--gold">{ctaLabel}</Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}