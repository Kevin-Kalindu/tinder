import styles from "@/styles/site.module.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function About() {
  return (
    <div className={styles.page}>
      <SiteNav />

      <main className={styles.contentPage}>
        <div className={styles.eyebrow}>About Rinder</div>
        <h1>Built for students, by students.</h1>
        <p className={styles.updated}>Fredericton, New Brunswick</p>

        <section>
          <h2>Our story</h2>
          <p>
            Rinder started as a simple observation: finding a place to live and finding
            people to live with are usually treated as two completely separate problems —
            even though they're really the same problem. We built Rinder to bring listings,
            roommate matching, and shared-home logistics into one place, so students in
            Fredericton don't have to juggle five different group chats and spreadsheets
            just to get settled.
          </p>
        </section>

        <section>
          <h2>What we're building</h2>
          <p>
            Beyond helping you find a place and the right roommates, Rinder keeps working
            after you move in — chore tracking, anonymous household notes, and a simple
            dashboard for the day-to-day of shared living.
          </p>
        </section>

        <section>
          <h2>Where we are</h2>
          <p>
            We're focused on Fredericton first, working closely with local students and
            landlords to make sure Rinder actually reflects how people here look for
            housing and roommates.
          </p>
        </section>

        <section>
          <h2>Get in touch</h2>
          <p>
            Questions, feedback, or want to partner with us? Reach out at{" "}
            <a href="mailto:hello@rinder.app">hello@rinder.app</a>.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}