"use client";

import Image from "next/image";
import { ArrowUpRight, Copy, Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { Ticket } from "@/lib/domain";
import { Modal, Number } from "./ui";

export function ShareTicket({
  ticket,
  token,
  name,
  counter,
  restore,
  onClose,
  onCancel,
}: {
  ticket: Ticket;
  token: string;
  name: string;
  counter: string;
  restore: Element | null;
  onClose: () => void;
  onCancel?: () => void;
}) {
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const link = window.location.origin + "/ticket#" + token;
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(link, { width: 260, margin: 2 })
      .then((result) => {
        if (active) setQr(result);
      })
      .catch(() => {
        if (active) setMessage("QR code unavailable. Open the ticket link.");
      });
    return () => {
      active = false;
    };
  }, [link]);
  return (
    <Modal title="Ticket ready" onClose={onClose} restore={restore} print>
      <div className="printTicket">
        <div>
          <p>{name}</p>
          <Number value={ticket.number} />
          <p>{counter}</p>
        </div>
        {qr && (
          <Image
            src={qr}
            alt="Ticket QR code"
            width={124}
            height={124}
            unoptimized
          />
        )}
        <span className="printUrl">{link}</span>
      </div>
      <div className="actions">
        <a className="button" href={link} target="_blank" rel="noreferrer">
          Open ticket <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <button
          className="plain"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setMessage("Link copied.");
            } catch {
              setMessage("Unable to copy. Open the ticket to get its link.");
            }
          }}
        >
          <Copy size={17} aria-hidden="true" /> Copy
        </button>
        <button className="plain" onClick={() => window.print()}>
          <Printer size={17} aria-hidden="true" /> Print
        </button>
      </div>
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      {onCancel && (
        <button className="plain danger" onClick={onCancel}>
          Cancel ticket
        </button>
      )}
    </Modal>
  );
}
