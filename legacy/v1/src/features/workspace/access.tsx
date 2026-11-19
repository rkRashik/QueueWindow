"use client";

import { ExternalLink, Printer } from "lucide-react";
import { Modal } from "./ui";
import { Qr } from "./qr";

export function Access({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const join = "/join/" + id;
  const url = window.location.origin + join;
  return (
    <Modal title="Visitor access" onClose={onClose} print>
      <div className="printTicket accessPoster">
        <p>{name}</p>
        <strong lang="bn">টোকেন নিতে স্ক্যান করুন</strong>
        <p>Scan to take a ticket</p>
        <Qr value={url} label="QR code for joining the queue" />
        <a className="accessUrl" href={join} target="_blank" rel="noreferrer">
          {url}
        </a>
      </div>
      <div className="actions">
        <a
          className="button"
          href={"/kiosk/" + id}
          target="_blank"
          rel="noreferrer"
        >
          Open kiosk <ExternalLink size={16} aria-hidden="true" />
        </a>
        <button className="plain" onClick={() => window.print()}>
          <Printer size={17} aria-hidden="true" /> Print QR sign
        </button>
      </div>
    </Modal>
  );
}
