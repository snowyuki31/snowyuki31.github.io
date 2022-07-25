import Link from "next/link";

const Index = () => {
  return (
    <>
      <div>Ohayo &#x1f44b;</div>
      <Link href="/blog">
        <a>My Blog</a>
      </Link>
    </>
  );
};

export default Index;
