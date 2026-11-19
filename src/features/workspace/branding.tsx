"use client";

import Image from "next/image";
import Link from "next/link";
import { Monitor, Printer, QrCode, Tablet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminHeading } from "./admin-ui";
import { useMutation } from "./admin-data";
import { api, jsonRequest } from "./client";
import { useLocale } from "./locale";
import { CopyButton, InputField, Notice, type useToast } from "./ui";

export type Branding = {
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  plan: string;
};
const swatches = ["#1B2231", "#1F4FA8", "#17694F", "#8E2B22", "#8A5A12", "#6B2C68"];

function validLogo(value: string) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}

function Logo({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const { t } = useLocale();
  return failed ? (
    <span className="muted text-sm font-semibold">{t.logoUnavailable}</span>
  ) : (
    <Image
      src={url}
      width={48}
      height={48}
      unoptimized
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="venue-mark"
    />
  );
}

export function BrandingSection({
  branding,
  slug,
  expiresAt,
  onSaved,
  notify,
}: {
  branding: Branding;
  slug: string;
  expiresAt: string;
  onSaved: (value: Branding) => void;
  notify: ReturnType<typeof useToast>["notify"];
}) {
  const { t, language } = useLocale();
  const mutation = useMutation();
  const [name, setName] = useState(branding.name);
  const [color, setColor] = useState(branding.primaryColor);
  const [logo, setLogo] = useState(branding.logoUrl ?? "");
  const [validationError, setValidationError] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<"board" | "spotlight" | "kinetic">("board");
  const validColor = /^#[0-9a-f]{6}$/i.test(color);
  const previewColor = validColor ? color : "#1B2231";
  const expiry = new Intl.DateTimeFormat(language, {
    dateStyle: "long",
    timeZone: "Asia/Dhaka",
  }).format(new Date(expiresAt));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = logo.trim();
    if (!name.trim() || !validColor || (url && !validLogo(url))) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    void mutation.run(async () => {
      const result = await api<{ organization: Branding }>(
        "/api/admin/organization",
        jsonRequest("PATCH", {
          name: name.trim(),
          primaryColor: color.toUpperCase(),
          logoUrl: url || null,
        }),
      );
      onSaved(result.organization);
      setName(result.organization.name);
      setColor(result.organization.primaryColor);
      setLogo(result.organization.logoUrl ?? "");
      notify(t.brandingSaved);
    });
  }

  const plan =
    branding.plan === "FREE"
      ? { name: t.free, detail: t.freeDetail }
      : branding.plan === "TRIAL"
        ? { name: t.trial, detail: `${t.trialEnds} ${expiry}` }
        : branding.plan === "DEMO"
          ? { name: t.liveDemo, detail: t.demoReadOnly }
          : { name: branding.plan, detail: `${t.expiration} ${expiry}` };

  return (
    <>
      <AdminHeading title={t.branding} description={t.brandingDetail} />
      <div className="admin-split">
        <section aria-labelledby="branding-title">
          <h2 id="branding-title" className="admin-sub">
            {t.identity}
          </h2>
          <form className="grid gap-5" onSubmit={submit}>
            <InputField
              label={t.organization}
              name="name"
              value={name}
              maxLength={100}
              required
              onChange={(event) => setName(event.target.value)}
            />
            <fieldset>
              <legend className="field-label">{t.primaryColor}</legend>
              <div className="flex flex-wrap items-center gap-2">
                {swatches.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className="swatch"
                    aria-pressed={swatch === color.toUpperCase()}
                    aria-label={swatch}
                    style={{ background: swatch }}
                    onClick={() => setColor(swatch)}
                  />
                ))}
                <input
                  className="field sign w-32 text-base uppercase"
                  aria-label={t.primaryColor}
                  value={color}
                  maxLength={7}
                  onChange={(event) => setColor(event.target.value)}
                />
              </div>
            </fieldset>
            <InputField
              label={t.logoUrl}
              name="logoUrl"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={logo}
              onChange={(event) => setLogo(event.target.value)}
            />
            <div className="admin-preview" aria-label={t.preview}>
              {logo && validLogo(logo.trim()) ? (
                <Logo key={logo} url={logo.trim()} />
              ) : (
                <span className="venue-mark" style={{ background: previewColor }} aria-hidden="true">
                  {Array.from(name.trim())[0]?.toUpperCase() ?? "Q"}
                </span>
              )}
              <span className="sign text-xl font-semibold break-words">{name || "—"}</span>
            </div>
            {validationError && <Notice title={t.brandingInvalid} tone="error" />}
            {mutation.error && <Notice title={mutation.error} tone="error" />}
            <div>
              <button type="submit" className="key key-primary" disabled={mutation.busy}>
                {mutation.busy ? t.saving : t.save}
              </button>
            </div>
          </form>
        </section>

        <div className="grid content-start gap-10">
          <section aria-labelledby="plan-title">
            <h2 id="plan-title" className="admin-sub">
              {t.plan}
            </h2>
            <p className="sign text-3xl font-semibold">{plan.name}</p>
            <p className="muted mt-1">{plan.detail}</p>
          </section>

          <section aria-labelledby="signage-title">
            <h2 id="signage-title" className="admin-sub">
              {t.signage}
            </h2>
            <div className="seg" role="group" aria-label={t.displayStyle}>
              {(
                [
                  ["board", t.styleBoard],
                  ["spotlight", t.styleSpotlight],
                  ["kinetic", t.styleKinetic],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={displayStyle === value}
                  onClick={() => setDisplayStyle(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="muted mt-2 text-sm">{t.displayStyleHelp}</p>
          </section>

          <section aria-labelledby="links-title">
            <h2 id="links-title" className="admin-sub">
              {t.links}
            </h2>
            <ul className="admin-links">
              {(
                [
                  [t.tv, `/display/${slug}?style=${displayStyle}`, Monitor],
                  [t.visitorLink, `/join/${slug}`, QrCode],
                  [t.kiosk, `/kiosk/${slug}`, Tablet],
                  [t.printQr, `/print/${slug}/qr`, Printer],
                ] as const
              ).map(([label, href, Icon]) => (
                <li key={href}>
                  <Icon aria-hidden="true" />
                  <span className="min-w-0">
                    <Link className="font-bold underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
                      {label}
                    </Link>
                    <span className="muted block truncate text-sm" translate="no">
                      {href}
                    </span>
                  </span>
                  <CopyButton
                    label={t.copy}
                    value={() => new URL(href, location.origin).href}
                    notify={notify}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
