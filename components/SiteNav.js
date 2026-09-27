"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/styles/site.module.css";

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.navShell}>
      <nav className={`${styles.container} ${styles.nav}`}>
        <Link href="/" className={styles.brand} aria-label="Rinder home">
          <img
            className={styles.brandLogo}
            src="https://res.cloudinary.com/n8gegfki/image/upload/v1790479054/rinder-logo.png"
            alt="Rinder"
          />
        </Link>

        <button className={styles.menuBtn} onClick={() => setOpen((v) => !v)}>
          Menu
        </button>

        <div className={`${styles.navLinks} ${open ? styles.open : ""}`}>
          {/* <Link href="/signup">Listings</Link>
          <Link href="/signup">Roommates</Link> */}
          <Link href="/about">About</Link>
          <Link href="/privacypolicy">Privacy Policy</Link>
          <Link href="/signup" className={styles.navCta}>
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}