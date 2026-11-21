import { stories } from "./content";
import { SectionHeading, Source } from "./journey";

export function Stories() {
  return <section id="cau-chuyen" className="stories" aria-labelledby="stories-title">
    <div className="shell story-intro">
      <SectionHeading id="stories-title" title="Những trang sử còn vang"
        description="Bốn câu chuyện về những bước ngoặt của lịch sử Việt Nam." />
    </div>
    <div className="shell story-exhibition">
      <div className="story-stage">
        <div className="stage-window" aria-hidden="true">
          {stories.map(({ year, image }) => <picture key={year} className="stage-layer" data-frame={year}
            data-current={year === stories[0].year ? "true" : undefined}>
            <img src={`./landing/media/${image}.webp`} alt="" loading="lazy" width="880" height="435" />
          </picture>)}
          <div className="stage-edge" />
        </div>
        <div className="stage-caption">
          {stories.map(({ year, place }) => <span key={year} data-frame={year}
            data-current={year === stories[0].year ? "true" : undefined}>{place} <span>·</span> Tái hiện nghệ thuật</span>)}
        </div>
        <nav className="chapter-index" aria-label="Đi đến chương">
          {stories.map(({ year, title }) => <a data-chapter-link={year} key={year} href={`#nam-${year}`}
            aria-label={`Năm ${year}, ${title}`}>{year}</a>)}
        </nav>
        <div className="chapter-progress" aria-hidden="true"><span /></div>
      </div>
      <div className="story-chapters">
        {stories.map(({ year, place, title, image, text, detail, source }) =>
          <article className="story" data-chapter={year} key={year} id={`nam-${year}`} aria-labelledby={`title-${year}`}>
            <figure className="chapter-picture">
              <img src={`./landing/media/${image}.webp`} alt="" loading="lazy" width="880" height="435" />
              <figcaption>Tái hiện nghệ thuật</figcaption>
            </figure>
            <div className="story-copy">
              <div className="chapter-date">
                <time dateTime={year.padStart(4, "0")}>{year}</time>
                <span>{place}</span>
              </div>
              <h3 id={`title-${year}`}>{title}</h3>
              <p>{text}</p>
              <p>{detail}</p>
              <Source href={source} />
            </div>
          </article>)}
      </div>
    </div>
  </section>;
}
