import type { NextPage } from "next";
import Link from "next/link";

const HomePage: NextPage = () => {
  return (
    <ul>
      <li>
        <Link href="/location/okx">Weather at OKX</Link>
      </li>
    </ul>
  );
};

export default HomePage;
