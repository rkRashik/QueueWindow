"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Building2, Link2, Paintbrush } from "lucide-react";
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
const swatches = [
  "#0F172A",
  "#4F46E5",
  "#0369A1",
  "#047857",
  "#BE123C",
  "#A16207",
];

function validLogo(value: string) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}

function Logo({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const { t } = useLocale();
  return failed ? (
    <span className="text-xs font-bold text-muted">{t.logoUnavailable}</span>
  ) : (
    <Image
      src={url}
      width={48}
      height={48}
      unoptimized
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-12 shrink-0 rounded-lg border border-line bg-white object-contain"
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
  const validColor = /^#[0-9a-f]{6}$/i.test(color);
  const previewColor = validColor ? color : "#0F172A";
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

  return (
    <>
      <AdminHeading title={t.branding} description={t.brandingDetail} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="panel" aria-labelledby="branding-title">
          <div className="eyeline flex items-center gap-2.5 px-5 py-4">
            <Paintbrush aria-hidden="true" className="size-4 text-brand" />
            <h2 className="section-heading" id="branding-title">
              {t.branding}
            </h2>
          </div>
          <form className="space-y-4 p-5" onSubmit={submit}>
            <InputField
              name="name"
              label={t.organization}
              maxLength={100}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div>
              <InputField
                name="primaryColor"
                label={t.primaryColor}
                value={color}
                maxLength={7}
                required
                onChange={(event) => setColor(event.target.value)}
              />
              <div
                role="group"
                aria-label={t.primaryColor}
                className="mt-2 flex flex-wrap gap-1"
              >
                {swatches.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={swatch}
                    aria-pressed={swatch === color.toUpperCase()}
                    className={`grid size-10 place-items-center rounded-lg border ${swatch === color.toUpperCase() ? "border-brand bg-teal-50" : "border-transparent hover:bg-slate-100"}`}
                    onClick={() => setColor(swatch)}
                  >
                    <span
                      style={{ backgroundColor: swatch }}
                      className="size-5 rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
            <InputField
              name="logoUrl"
              label={t.logoUrl}
              type="url"
              placeholder="https://"
              value={logo}
              onChange={(event) => setLogo(event.target.value)}
              maxLength={2048}
            />
            <div
              role="group"
              aria-label={t.preview}
              className="flex items-center gap-3 rounded-xl border border-line bg-slate-50 p-3.5"
            >
              {validLogo(logo.trim()) ? (
                <Logo key={logo.trim()} url={logo.trim()} />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-white">
                  <Building2
                    aria-hidden="true"
                    className="size-5"
                    style={{ color: previewColor }}
                  />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted">{t.preview}</p>
                <p className="break-words font-extrabold">
                  {name || branding.name}
                </p>
              </div>
              <span
                className="ms-auto size-4 shrink-0 rounded-full"
                style={{ backgroundColor: previewColor }}
                aria-hidden="true"
              />
            </div>
            {(validationError || mutation.error) && (
              <Notice
                title={validationError ? t.brandingInvalid : mutation.error}
                tone="error"
              />
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.busy}
            >
              {mutation.busy ? t.saving : t.save}
            </button>
          </form>
        </section>
        <div className="grid gap-5">
          <section className="panel" aria-labelledby="subscription-title">
            <div className="eyeline flex items-center gap-2.5 px-5 py-4">
              <BadgeCheck aria-hidden="true" className="size-4 text-brand" />
              <h2 id="subscription-title" className="section-heading">
                {t.subscription}
              </h2>
            </div>
            <dl className="divide-y divide-slate-100 px-5">
              <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                <dt className="text-sm font-bold text-muted">{t.plan}</dt>
                <dd className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-extrabold text-teal-800">
                  {branding.plan === "TRIAL" ? t.trial : branding.plan}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                <dt className="text-sm font-bold text-muted">{t.expiration}</dt>
                <dd className="text-sm font-extrabold tabular-nums">
                  <time dateTime={expiresAt}>{expiry}</time>
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel" aria-labelledby="links-title">
            <div className="eyeline flex items-center gap-2.5 px-5 py-4">
              <Link2 aria-hidden="true" className="size-4 text-brand" />
              <h2 id="links-title" className="section-heading">
                {t.links}
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Link
                  className="btn"
                  href={`/print/${slug}/qr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.printQr}
                </Link>
                <Link
                  className="btn"
                  href={`/kiosk/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.kiosk}
                </Link>
              </div>
              {[
                [t.tv, `/display/${slug}`],
                [t.visitorLink, `/join/${slug}`],
              ].map(([label, href]) => (
                <div
                  key={href}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
                >
                  <label className="min-w-0 text-sm font-bold">
                    {label}
                    <input
                      className="field mt-1.5 text-sm"
                      readOnly
                      value={href}
                      onFocus={(event) => event.target.select()}
                    />
                  </label>
                  <CopyButton
                    label={t.copy}
                    value={() => new URL(href, location.origin).href}
                    notify={notify}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
