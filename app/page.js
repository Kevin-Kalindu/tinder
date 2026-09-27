"use client";

import { useRef } from "react";
import Link from "next/link";
import styles from "@/styles/site.module.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const TEAM = {
  ali: "https://res.cloudinary.com/n8gegfki/image/upload/v1790479054/team-1.jpg",
  saumya: "https://res.cloudinary.com/n8gegfki/image/upload/v1790479054/team-2.jpg",
  arin: "https://res.cloudinary.com/n8gegfki/image/upload/v1790479054/team-3.jpg",
  kevin: "https://res.cloudinary.com/n8gegfki/image/upload/v1790479054/team-4.jpg",
};

const LISTINGS = [
  {
    kicker: "Manhattan Drive",
    title: "Bright modern apartment",
    desc: "Open living space with a clean, warm interior.",
    tags: ["Fredericton", "Modern", "Apartment"],
    img: "https://colpittsdev.ca/images/gallery/8.jpg",
  },
  {
    kicker: "650 Waterloo Row",
    title: "Central & contemporary",
    desc: "A modern building with easy access to central Fredericton.",
    tags: ["Waterloo Row", "Apartment"],
    img: "https://images1.apartments.com/i2/WqyZ_N7hL3trwp9QWH0G5Uh6kePTSRIMKt9CNDPYApw/111/650-waterloo-row-fredericton-nb-micro-boutique-fredericton.jpg?p=1",
  },
  {
    kicker: "Harold Doherty Court",
    title: "Simple, practical living",
    desc: "Clean finishes and room to make the space your own.",
    tags: ["Fredericton", "Residential"],
    img: "https://images1.apartments.com/i2/y_tsiNwXHXqqPJVxQ0QT8i0PFgIxyWUJu8fI4SWhtZI/111/11-harold-doherty-court-fredericton-nb-building-photo.png?p=1",
  },
];

const ROOMMATES = [
  { name: "Ali Akhtar", tags: ["Soccer", "Gym", "Movies", "Fredericton"], img: TEAM.ali },
  { name: "Saumya Jaiswal", tags: ["Dance", "Music", "Cafés", "Fredericton"], img: TEAM.saumya },
  { name: "Arin Bhan", tags: ["Soccer", "Coding", "Fitness", "Fredericton"], img: TEAM.arin },
  { name: "Kevin Hettiarachchi", tags: ["Basketball", "Gaming", "Music", "Fredericton"], img: TEAM.kevin },
];

const FEATURES = [
  { icon: "⌂", title: "My House", desc: "Your shared-home dashboard for chores, notes and access.", orange: true },
  { icon: "✓", title: "Chores", desc: "Assign tasks, keep ownership clear and mark them complete." },
  { icon: "✦", title: "Anonymous notes", desc: "Leave household feedback without turning small issues into awkward conversations." },
  { icon: "⌁", title: "Door access", desc: "A simple smart-entry dashboard with status and access activity." },
  { icon: "↔", title: "Roommate discovery", desc: "Browse compatible profiles and move naturally into conversation." },
  { icon: "◫", title: "Listing discovery", desc: "Photos, location, price and essentials without unnecessary clutter." },
];

export default function Home() {
  const listingRef = useRef(null);
  const peopleRef = useRef(null);

  function scrollBy(ref, dir) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.78, 460), behavior: "smooth" });
  }

  return (
    <div className={styles.page}>
      <SiteNav />

      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div>
              <div className={styles.eyebrow}>Fredericton student housing</div>
              <h1>
                Find home.
                <br />
                Find your people.
              </h1>
              <p>
                Discover rentals, meet compatible roommates and manage the day-to-day of
                shared living — all in one focused place.
              </p>
              <div className={styles.actions}>
                <Link href="/listings" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Browse listings
                </Link>
                <Link href="/roommates" className={styles.btn}>
                  Meet roommates
                </Link>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <img src="https://colpittsdev.ca/images/gallery/8.jpg" alt="Fredericton apartment interior" />
              <div className={styles.heroShade} />
              <div className={`${styles.heroBadge} ${styles.badgeOne}`}>
                <strong>Fredericton, NB</strong>
                <span>Student-friendly rentals nearby</span>
              </div>
              <div className={`${styles.heroBadge} ${styles.badgeTwo}`}>
                <strong>One place for home life</strong>
                <span>Listings · roommates · chores</span>
              </div>
            </div>
          </div>
        </section>

        {/* MOTION BAND */}
        <section className={styles.motionBand}>
          <div className={styles.motionTrack}>
            {Array(2)
              .fill(null)
              .map((_, i) => (
                <span key={i} style={{ display: "flex", gap: 24 }}>
                  <span>FREDERICTON LISTINGS</span>
                  <i>•</i>
                  <span>ROOMMATE MATCHING</span>
                  <i>•</i>
                  <span>CHORE MANAGEMENT</span>
                  <i>•</i>
                  <span>ANONYMOUS NOTES</span>
                  <i>•</i>
                  <span>SMART DOOR ACCESS</span>
                  <i>•</i>
                </span>
              ))}
          </div>
        </section>

        {/* LISTINGS */}
        <section className={styles.section} id="listings">
          <div className={`${styles.container} ${styles.sectionHead}`}>
            <div>
              <div className={styles.eyebrow}>Listings</div>
              <h2>Places around Fredericton.</h2>
            </div>
            <p>Quickly compare homes, interiors and neighbourhood context without turning the search into a spreadsheet.</p>
          </div>

          <div className={`${styles.container} ${styles.scrollWrap}`}>
            <div className={styles.scroller} ref={listingRef}>
              {LISTINGS.map((l) => (
                <Link href="/listings" className={styles.card} key={l.title}>
                  <div className={styles.cardMedia}>
                    <img src={l.img} alt={l.title} />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.kicker}>{l.kicker}</div>
                    <h3>{l.title}</h3>
                    <p>{l.desc}</p>
                    <div className={styles.pills}>
                      {l.tags.map((t) => (
                        <span className={styles.pill} key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className={styles.controls}>
              <button className={styles.iconBtn} onClick={() => scrollBy(listingRef, -1)}>
                ←
              </button>
              <button className={styles.iconBtn} onClick={() => scrollBy(listingRef, 1)}>
                →
              </button>
            </div>
          </div>
        </section>

        {/* ROOMMATES */}
        <section className={`${styles.section} ${styles.sectionSoft}`} id="roommates">
          <div className={`${styles.container} ${styles.sectionHead}`}>
            <div>
              <div className={styles.eyebrow}>Roommates</div>
              <h2>People you could match with.</h2>
            </div>
          </div>

          <div className={styles.container}>
            <div className={styles.scroller} ref={peopleRef}>
              {ROOMMATES.map((r) => (
                <Link href="/roommates" className={styles.card} key={r.name}>
                  <div className={styles.cardMedia}>
                    <img src={r.img} alt={`Sample roommate profile for ${r.name}`} />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.kicker}>Suggested match</div>
                    <h3>{r.name}</h3>
                    <div className={styles.pills}>
                      {r.tags.map((t) => (
                        <span className={styles.pill} key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className={styles.controls}>
              <button className={styles.iconBtn} onClick={() => scrollBy(peopleRef, -1)}>
                ←
              </button>
              <button className={styles.iconBtn} onClick={() => scrollBy(peopleRef, 1)}>
                →
              </button>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className={styles.section}>
          <div className={`${styles.container} ${styles.sectionHead}`}>
            <div>
              <div className={styles.eyebrow}>One app, after move-in too</div>
              <h2>Rinder does more than search.</h2>
            </div>
            <p>The useful part starts before move-in and continues once you actually share a home.</p>
          </div>
          <div className={`${styles.container} ${styles.featureGrid}`}>
            {FEATURES.map((f) => (
              <article
                className={`${styles.feature} ${f.orange ? styles.featureOrange : ""}`}
                key={f.title}
              >
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* STORY */}
        <section className={`${styles.section} ${styles.sectionDark}`}>
          <div className={`${styles.container} ${styles.sectionHead}`}>
            <div>
              <div className={styles.eyebrow}>Fredericton life</div>
              <h2>See more than four walls.</h2>
            </div>
            <p>Housing is the space, the people and the everyday life around it.</p>
          </div>
          <div className={`${styles.container} ${styles.storyGrid}`}>
            <article className={`${styles.story} ${styles.storyLarge}`}>
              <img
                src="https://images1.apartments.com/i2/WqyZ_N7hL3trwp9QWH0G5Uh6kePTSRIMKt9CNDPYApw/111/650-waterloo-row-fredericton-nb-micro-boutique-fredericton.jpg?p=1"
                alt="Fredericton apartment exterior"
              />
              <div className={styles.storyCopy}>
                <span>Exterior</span>
                <strong>Know the building before you book a viewing.</strong>
              </div>
            </article>

            <div className={styles.storyStack}>
              <article className={styles.story}>
                <img src="https://colpittsdev.ca/images/gallery/8.jpg" alt="Fredericton interior" />
                <div className={styles.storyCopy}>
                  <span>Interior</span>
                  <strong>Get a feel for the space.</strong>
                </div>
              </article>

              <article className={`${styles.story} ${styles.peopleGridStory}`}>
                <div className={styles.peoplePhotoGrid} aria-label="Roommate match photo grid">
                  <img src={TEAM.ali} alt="Ali Akhtar" />
                  <img src={TEAM.saumya} alt="Saumya Jaiswal" />
                  <img src={TEAM.arin} alt="Arin Bhan" />
                  <img src={TEAM.kevin} alt="Kevin Hettiarachchi" />
                </div>
                <div className={styles.storyCopy}>
                  <span>People</span>
                  <strong>Make shared living less random.</strong>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <h2>Your next place starts here.</h2>
          <p>Browse Fredericton homes, meet roommates and keep shared living organized in one place.</p>
          <Link href="/listings" className={`${styles.btn} ${styles.btnPrimary}`}>
            Browse listings
          </Link>
        </section>
      </main>
    </div>
  );
}