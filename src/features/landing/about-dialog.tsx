"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { BrandMark } from "@/components/brand";

export function AboutDialog() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="key key-quiet key-sm"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        About
      </button>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="about-title"
        aria-describedby="about-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-head">
          <h2 id="about-title" className="sign flex items-center gap-2.5 text-xl font-semibold">
            <BrandMark size={26} />
            <span><span className="sr-only">About </span>QueueWindow</span>
          </h2>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded text-(--fg-2) hover:bg-(--bg-2) hover:text-(--fg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fg)"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-4 px-5 pt-3 pb-4">
          <p id="about-description">
            QueueWindow keeps service queues in sync.
            <br />
            Take a ticket and follow your turn on the TV or your phone.
          </p>
          <div className="space-y-2">
            <p className="font-semibold">Built by Redwanul Rashik</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="underline underline-offset-4" href="mailto:rkrashik@gmail.com">
                rkrashik@gmail.com
              </a>
              <a className="underline underline-offset-4" href="https://github.com/rkRashik/QueueWindow">
                <span aria-label="GitHub repository">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
