import styles from "@/styles/site.module.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <SiteNav />

      <main className={styles.contentPage}>
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2>1. Information we collect</h2>
          <p>
            We collect information you provide directly, such as your name, email, age,
            program, and roommate preferences, as well as information generated through
            your use of the app, including chore lists, chat messages, and house data.
          </p>
        </section>

        <section>
          <h2>2. How we use your information</h2>
          <p>
            We use your information to match you with compatible roommates, show you
            relevant listings, and power features like household chore tracking and
            messaging between friends.
          </p>
        </section>

        <section>
          <h2>3. Sharing your information</h2>
          <p>
            Your profile information (name, program, interests, picture) is visible to
            other users for the purpose of roommate matching. We do not sell your
            personal information to third parties.
          </p>
        </section>

        <section>
          <h2>4. Data storage</h2>
          <p>
            Your data is stored securely using Firebase. You can request deletion of
            your account and associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2>5. Your choices</h2>
          <p>
            You can edit or delete your profile information, leave a house, or remove
            friends at any time from within the app.
          </p>
        </section>

        <section>
          <h2>6. Contact us</h2>
          <p>
            If you have questions about this policy, please reach out to us at{" "}
            <a href="mailto:support@rinder.app">support@rinder.app</a>.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}