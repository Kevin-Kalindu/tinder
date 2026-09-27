import Link from "next/link";
import styles from "@/styles/site.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <span>© 2026 Rinder</span>
        <div className={styles.footerLinks}>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}