"use client";

import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CounterBadge } from "@/components/counter-badge";
import { getCounterTheme, sortCounters } from "@/lib/counter-theme";
import { AdminHeading, ResourceNotice } from "./admin-ui";
import { useMutation, useResource } from "./admin-data";
import { api, jsonRequest } from "./client";
import { useLocale } from "./locale";
import {
  CopyButton,
  InputField,
  Modal,
  Notice,
  StatusPill,
  type useToast,
} from "./ui";

type Notify = ReturnType<typeof useToast>["notify"];
type Counter = {
  id: string;
  name: string;
  prefix: string;
  status: "OPEN" | "PAUSED";
};
type Staff = { id: string; fullName: string; username: string; role: "STAFF" };
type CounterModal =
  { kind: "create" } | { kind: "edit" | "delete"; counter: Counter };

export function CountersSection({ notify }: { notify: Notify }) {
  const { t } = useLocale();
  const { data, error, reload } = useResource<{ counters: Counter[] }>(
    "/api/admin/counters",
  );
  const mutation = useMutation();
  const [modal, setModal] = useState<CounterModal | null>(null);
  function open(value: CounterModal) {
    mutation.clear();
    setModal(value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void mutation.run(async () => {
      if (modal.kind === "delete") {
        await api(
          `/api/admin/counters/${modal.counter.id}`,
          jsonRequest("DELETE"),
        );
        notify(t.counterRemoved);
      } else {
        const creating = modal.kind === "create";
        await api(
          creating
            ? "/api/admin/counters"
            : `/api/admin/counters/${modal.counter.id}`,
          jsonRequest(creating ? "POST" : "PATCH", values),
        );
        notify(creating ? t.counterCreated : t.counterUpdated);
      }
      setModal(null);
      await reload();
    });
  }
  function toggle(counter: Counter) {
    void mutation.run(async () => {
      const status = counter.status === "OPEN" ? "PAUSED" : "OPEN";
      await api(
        `/api/admin/counters/${counter.id}`,
        jsonRequest("PATCH", { status }),
      );
      notify(status === "OPEN" ? t.opened : t.pausedNotice);
      await reload();
    });
  }

  return (
    <>
      <AdminHeading
        title={t.counters}
        description={t.countersDetail}
        action={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => open({ kind: "create" })}
            disabled={mutation.busy}
          >
            <Plus aria-hidden="true" />
            {t.newCounter}
          </button>
        }
      />
      <ResourceNotice
        error={error}
        load={() => void reload()}
        loading={!data}
      />
      {!modal && mutation.error && (
        <Notice title={mutation.error} tone="error" />
      )}
      {data && (
        <div className="panel mt-4">
          {data.counters.length ? (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={t.counters}
            >
              <table className="data-table min-w-[32rem]">
                <thead>
                  <tr>
                    {[t.counter, t.prefix, t.status, t.actions].map((label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortCounters(data.counters).map((counter) => (
                    <tr key={counter.id}>
                      <td
                        className="font-extrabold"
                        style={{
                          boxShadow: `inset 3px 0 0 ${getCounterTheme(counter.prefix).hue}`,
                        }}
                      >
                        {counter.name}
                      </td>
                      <td>
                        <CounterBadge prefix={counter.prefix} size="sm" />
                      </td>
                      <td>
                        <StatusPill status={counter.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-quiet"
                            disabled={mutation.busy}
                            onClick={() => toggle(counter)}
                          >
                            {counter.status === "OPEN"
                              ? t.pauseShort
                              : t.resumeShort}
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            aria-label={`${t.edit} ${counter.name}`}
                            disabled={mutation.busy}
                            onClick={() => open({ kind: "edit", counter })}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet text-rose-700 hover:text-rose-800"
                            aria-label={`${t.delete} ${counter.name}`}
                            disabled={mutation.busy}
                            onClick={() => open({ kind: "delete", counter })}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted">{t.noCounters}</p>
          )}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "delete"
              ? t.deleteCounter
              : modal.kind === "edit"
                ? t.editCounter
                : t.newCounter
          }
          busy={mutation.busy}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit} className="space-y-4">
            {modal.kind === "delete" ? (
              <p className="text-sm text-muted">
                <strong className="block text-ink">{modal.counter.name}</strong>
                {t.deleteCounterDetail}
              </p>
            ) : (
              <>
                <InputField
                  name="name"
                  label={t.counterName}
                  required
                  maxLength={100}
                  defaultValue={modal.kind === "edit" ? modal.counter.name : ""}
                />
                <InputField
                  name="prefix"
                  label={t.prefix}
                  help={t.prefixHelp}
                  pattern="[A-Za-z0-9]{1,2}"
                  maxLength={2}
                  required
                  defaultValue={
                    modal.kind === "edit" ? modal.counter.prefix : ""
                  }
                />
              </>
            )}
            {mutation.error && <Notice title={mutation.error} tone="error" />}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="btn"
                type="button"
                disabled={mutation.busy}
                onClick={() => setModal(null)}
              >
                {t.cancel}
              </button>
              <button
                className={`btn ${modal.kind === "delete" ? "btn-destructive" : "btn-primary"}`}
                disabled={mutation.busy}
              >
                {mutation.busy
                  ? t.saving
                  : modal.kind === "delete"
                    ? t.deleteCounter
                    : modal.kind === "edit"
                      ? t.save
                      : t.createCounter}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function TeamSection({ notify }: { notify: Notify }) {
  const { t } = useLocale();
  const { data, error, reload } = useResource<{ staff: Staff[] }>(
    "/api/admin/staff",
  );
  const mutation = useMutation();
  const [modal, setModal] = useState<"create" | Staff | null>(null);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  function open(value: "create" | Staff) {
    mutation.clear();
    setModal(value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void mutation.run(async () => {
      if (modal === "create") {
        const password = String(values.get("password"));
        const result = await api<{ staff: Staff }>(
          "/api/admin/staff",
          jsonRequest("POST", {
            fullName: String(values.get("fullName")),
            username: String(values.get("username")),
            password,
          }),
        );
        setCredentials({ username: result.staff.username, password });
        notify(t.staffCreated);
      } else if (modal) {
        await api(`/api/admin/staff/${modal.id}`, jsonRequest("DELETE"));
        if (credentials?.username === modal.username) setCredentials(null);
        notify(t.staffRemoved);
      }
      setModal(null);
      await reload();
    });
  }

  return (
    <>
      <AdminHeading
        title={t.team}
        description={t.teamDetail}
        action={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => open("create")}
            disabled={mutation.busy}
          >
            <UserPlus aria-hidden="true" />
            {t.addStaff}
          </button>
        }
      />
      <ResourceNotice
        error={error}
        load={() => void reload()}
        loading={!data}
      />
      {credentials && (
        <section
          aria-labelledby="login-details"
          className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4"
        >
          <h2 id="login-details" className="section-heading">
            {t.loginDetails}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t.loginDetailsHelp}{" "}
            <strong className="break-all text-ink" translate="no">
              {credentials.username}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton
              label={t.copyLogin}
              copiedLabel={t.loginCopied}
              notify={notify}
              value={() =>
                `${new URL("/login", location.origin).href}\n${t.username}: ${credentials.username}\n${t.password}: ${credentials.password}`
              }
            />
            <button
              className="btn btn-quiet"
              type="button"
              onClick={() => setCredentials(null)}
            >
              {t.dismiss}
            </button>
          </div>
        </section>
      )}
      {data && (
        <div className="panel">
          {data.staff.length ? (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={t.team}
            >
              <table className="data-table min-w-[28rem]">
                <thead>
                  <tr>
                    {[t.fullName, t.username, t.role, t.actions].map(
                      (label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((account) => (
                    <tr key={account.id}>
                      <td className="font-extrabold">{account.fullName}</td>
                      <td translate="no">{account.username}</td>
                      <td className="text-muted">{t.staff}</td>
                      <td>
                        <button
                          className="btn btn-quiet text-rose-700 hover:text-rose-800"
                          type="button"
                          aria-label={`${t.remove} ${account.fullName}`}
                          disabled={mutation.busy}
                          onClick={() => open(account)}
                        >
                          <Trash2 aria-hidden="true" />
                          {t.remove}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <h2 className="section-heading">{t.noStaff}</h2>
              <p className="mt-1 text-sm text-muted">{t.emptyTeam}</p>
            </div>
          )}
        </div>
      )}
      {modal && (
        <Modal
          title={modal === "create" ? t.addStaff : t.removeStaff}
          busy={mutation.busy}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit} className="space-y-4">
            {modal === "create" ? (
              <>
                <InputField
                  name="fullName"
                  label={t.fullName}
                  autoComplete="off"
                  required
                  maxLength={100}
                />
                <InputField
                  name="username"
                  label={t.username}
                  help={t.usernameHelp}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  required
                  minLength={3}
                  maxLength={32}
                />
                <InputField
                  name="password"
                  label={t.password}
                  help={t.passwordHelp}
                  autoComplete="new-password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                />
              </>
            ) : (
              <p className="text-sm text-muted">
                <strong className="block text-ink">{modal.fullName}</strong>
                {t.removeStaffDetail}
              </p>
            )}
            {mutation.error && <Notice title={mutation.error} tone="error" />}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn"
                disabled={mutation.busy}
                onClick={() => setModal(null)}
              >
                {t.cancel}
              </button>
              <button
                className={`btn ${modal === "create" ? "btn-primary" : "btn-destructive"}`}
                disabled={mutation.busy}
              >
                {mutation.busy
                  ? t.saving
                  : modal === "create"
                    ? t.createStaff
                    : t.removeStaff}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
