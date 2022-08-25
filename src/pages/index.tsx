import type { NextPage } from "next";
import Link from "@mui/material/Link";
import styles from "../styles/Home.module.css";
import Layout from "../components/layout";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Layout>
        <h1>Ohayo &#x1f44b;</h1>
        <h2>Links</h2>
        <div>
          <Link href="/blog">
            <a>Blog</a>
          </Link>
        </div>
        <div>
          <Link href="/impl-and-vis">
            <a>Impl-and-vis</a>
          </Link>
        </div>
      </Layout>
    </div>
  );
};

export default Home;
