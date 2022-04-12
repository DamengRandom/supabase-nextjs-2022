import styles from "../styles/Auth.module.css";
import React from "react";

export default function Auth({ supabase }) {
  async function signInWithGithub() {
    supabase.auth.signIn({ provider: "github" });
  }

  return (
    <div>
      <h1 className={styles.title}>Supabase Chat</h1>
      <button className={styles.github} onClick={signInWithGithub}>
        Login with Github
      </button>
    </div>
  );
}
