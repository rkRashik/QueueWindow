"use client";

import { X } from "lucide-react";
import { useRef } from "react";

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
          <h2 id="about-title" className="sign text-xl font-semibold">
            About QueueWindow
          </h2>
          <button
            type="button"
            className="key key-quiet key-icon"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p id="about-description">
            QueueWindow keeps service queues in sync.
            <br />
            Take a ticket and follow your turn on the TV or your phone.
          </p>
          <div className="space-y-1">
            <p className="font-semibold">Built by Redwanul Rashik</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="underline underline-offset-4" href="mailto:rkrashik@gmail.com">
                rkrashik@gmail.com
              </a>
              <a className="underline underline-offset-4" href="https://github.com/rkRashik/QueueWindow">
                GitHub repository
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
