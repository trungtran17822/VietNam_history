import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const main = document.getElementById("noi-dung");
    if (!main) return;
    const root = main;

    const largeMotionViewport = window.matchMedia("(min-width: 961px) and (min-height: 580px) and (prefers-reduced-motion: no-preference)");
    let dispose: (() => void) | undefined;
    let revision = 0;
    let initialHash = window.location.hash;

    async function configure() {
      const request = ++revision;
      dispose?.();
      dispose = undefined;
      if (!largeMotionViewport.matches) return;

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (request !== revision) return;

      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        const hero = root.querySelector<HTMLElement>(".hero");
        const picture = hero?.querySelector(".hero-picture");
        const copy = hero?.querySelector(".hero-copy");

        if (hero && picture && copy) {
          const drift = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .45 },
          });
          drift.to(picture, { yPercent: 11, scale: 1.085 }, 0)
            .to(copy, { y: -40 }, 0);
        }

        const exhibition = root.querySelector<HTMLElement>(".story-exhibition");
        if (!exhibition) return;

        const closing = root.querySelector(".closing");
        const closingImage = closing?.querySelector(".closing-art");
        if (closing && closingImage) {
          gsap.fromTo(closingImage, { yPercent: -2, scale: 1.09 }, {
            yPercent: 4, scale: 1.14, ease: "none",
            scrollTrigger: { trigger: closing, start: "top bottom", end: "bottom top", scrub: .45 },
          });
        }

        const chapters = [...exhibition.querySelectorAll<HTMLElement>("[data-chapter]")];
        const initialChapter = chapters.find(chapter => `#${chapter.id}` === initialHash);
        const anchored = initialChapter && (
          window.scrollY < window.innerHeight * .2 ||
          Math.abs(initialChapter.getBoundingClientRect().top) < window.innerHeight * .45
        );
        initialHash = "";
        exhibition.dataset.motion = "ready";
        if (anchored) initialChapter.scrollIntoView({ block: "start", behavior: "instant" });
        const frames = [...exhibition.querySelectorAll<HTMLElement>("[data-frame]")];
        const links = [...exhibition.querySelectorAll<HTMLAnchorElement>("[data-chapter-link]")];
        const meter = exhibition.querySelector(".chapter-progress span");
        let showing: string | undefined;

        function show(year: string | undefined) {
          if (!year || showing === year) return;
          showing = year;
          frames.forEach(frame => {
            frame.toggleAttribute("data-current", frame.dataset.frame === year);
          });
          links.forEach(link => {
            if (link.dataset.chapterLink === year) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        }

        show(chapters[0]?.dataset.chapter);
        chapters.forEach(chapter => {
          ScrollTrigger.create({
            trigger: chapter,
            start: "top 54%",
            end: "bottom 54%",
            onEnter: () => show(chapter.dataset.chapter),
            onEnterBack: () => show(chapter.dataset.chapter),
            onRefresh: trigger => { if (trigger.isActive) show(chapter.dataset.chapter); },
          });
        });

        if (meter) {
          gsap.fromTo(meter, { scaleX: 0 }, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: exhibition, start: "top 54%", end: "bottom 54%", scrub: true },
          });
        }

        return () => {
          delete exhibition.dataset.motion;
          frames.forEach(frame => frame.toggleAttribute("data-current", frame.dataset.frame === chapters[0]?.dataset.chapter));
          links.forEach(link => link.removeAttribute("aria-current"));
        };
      }, root);

      dispose = () => context.revert();
    }

    void configure();
    largeMotionViewport.addEventListener("change", configure);
    return () => {
      revision++;
      largeMotionViewport.removeEventListener("change", configure);
      dispose?.();
    };
  }, []);

  return null;
}
