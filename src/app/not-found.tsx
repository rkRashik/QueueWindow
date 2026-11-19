import { Header, HomeLink, State } from "@/features/workspace/ui";
export default function NotFound() {
  return (
    <>
      <Header />
      <State title="Page not found">
        <HomeLink />
      </State>
    </>
  );
}
