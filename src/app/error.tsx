"use client";
import { useRouter } from "next/navigation";
import { Header, State } from "@/features/workspace/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <>
      <Header />
      <State
        title="Something went wrong"
        detail="Please try loading this page again."
      >
        <button
          className="button"
          onClick={() => {
            reset();
            router.refresh();
          }}
        >
          Try again
        </button>
      </State>
    </>
  );
}
