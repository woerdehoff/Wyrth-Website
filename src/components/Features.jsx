import { useContent } from '../context/ContentContext'

export default function Features() {
  const { features } = useContent()
  return (
    <section
      className="bg-ink-2 py-36"
      id="features"
      style={{ paddingLeft: '5%', paddingRight: '5%' }}
    >
      <div className="max-w-[1300px] mx-auto">
        <div className="mb-20 flex flex-col gap-5">
          <span className="label">The Details</span>
          <h2 className="features-title font-normal text-bone">Why Wyrth Works</h2>
          <p className="text-[0.9rem] text-bone-2">
            Every decision in this cape is intentional. Here&apos;s what makes it different.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-line-warm">
          {features.map(f => (
            <div
              key={f.num}
              className="px-10 py-11 border-r border-b border-line-warm flex flex-col gap-4 transition-colors duration-300 ease-brand hover:bg-ink-3"
            >
              <span className="font-display text-[0.8rem] font-light text-magenta tracking-[.1em]">
                {f.num}
              </span>
              <h3 className="font-display text-[1.45rem] font-normal text-bone leading-[1.2]">
                {f.title}
              </h3>
              <p className="text-[0.85rem] text-bone-2 leading-[1.85]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
