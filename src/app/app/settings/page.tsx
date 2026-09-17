"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { api } from "@/lib/api";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { PASSPORT_CITIES } from "@/lib/cities";
import { Modal } from "@/components/ui/Modal";

export default function SettingsPage() {
  const { me, toast, refresh } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passportOpen, setPassportOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  async function savePrivacy(patch: Record<string, unknown>) {
    await api("/api/settings?type=privacy", { method: "POST", body: JSON.stringify(patch) });
    toast("Privacy updated");
    await refresh();
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-3 rounded-3xl bg-white/5 p-5">
        <h2 className="font-semibold">Trust</h2>
        <p className="text-sm text-white/60">
          Selfie {me?.profile?.verified ? "verified" : "not verified"} · Email {me?.profile?.emailVerified ? "verified" : "unverified"} · Phone {me?.profile?.phoneVerified ? "verified" : "unverified"}
        </p>
        <label className="block text-sm">
          Selfie verification
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.set("file", file);
              await api("/api/settings?type=selfie", { method: "POST", body: form }).catch((err) => toast(err.message));
              toast("Selfie sent for review");
              await refresh();
            }}
          />
        </label>
        <input className="w-full rounded-2xl bg-black/30 p-3" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <FlirtyButton
          variant="ghost"
          onClick={async () => {
            const result = await api<{ code?: string }>("/api/settings?type=phone", { method: "POST", body: JSON.stringify({ phone }) });
            toast(result.code ? `Code ${result.code}` : "Code sent");
          }}
        >
          Send phone code
        </FlirtyButton>
        <input className="w-full rounded-2xl bg-black/30 p-3" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
        <FlirtyButton
          variant="ghost"
          onClick={async () => {
            await api("/api/settings?type=phone-confirm", { method: "POST", body: JSON.stringify({ code }) });
            toast("Phone verified");
            await refresh();
          }}
        >
          Confirm phone
        </FlirtyButton>
      </div>
      <div className="space-y-3 rounded-3xl bg-white/5 p-5">
        <h2 className="font-semibold">Privacy</h2>
        {[
          ["showDistance", "Show distance", "Others see a fuzzy distance, never exact coordinates."],
          ["showOnline", "Show online status", "Let matches know when you're around."],
          ["discoveryVisible", "Appear in Discover", "Turn off to pause being recommended."],
        ].map((row) => {
          const key = row[0]!;
          const label = row[1]!;
          const help = row[2]!;
          return (
          <label key={key} className="flex items-start justify-between gap-4 text-sm">
            <span>
              <strong>{label}</strong>
              <p className="text-white/50">{help}</p>
            </span>
            <input
              type="checkbox"
              defaultChecked={Boolean((me?.privacy as Record<string, unknown> | undefined)?.[key] ?? true)}
              onChange={(e) => savePrivacy({ [key]: e.target.checked })}
            />
          </label>
          );
        })}
        <label className="flex items-start justify-between gap-4 text-sm">
          <span>
            <strong>Hide from friends / contacts</strong>
            <p className="text-white/50">Ready for later, when contact matching exists.</p>
          </span>
          <input
            type="checkbox"
            defaultChecked={Boolean(me?.profile?.hideFromContacts)}
            onChange={(e) => api("/api/settings?type=hide-contacts", { method: "POST", body: JSON.stringify({ hideFromContacts: e.target.checked }) }).then(() => toast("Saved"))}
          />
        </label>
        <FlirtyButton
          variant="ghost"
          onClick={() =>
            api("/api/subscriptions?action=incognito", {
              method: "POST",
              body: JSON.stringify({ incognito: !me?.profile?.incognito }),
            })
              .then(() => toast("Incognito updated"))
              .catch((e) => toast(e.message))
          }
        >
          Toggle Incognito
        </FlirtyButton>
        <FlirtyButton variant="ghost" onClick={() => setPassportOpen(true)}>
          Passport city
        </FlirtyButton>
      </div>
      <div className="space-y-3 rounded-3xl bg-white/5 p-5">
        <h2 className="font-semibold">Your data</h2>
        <FlirtyButton variant="ghost" onClick={() => api("/api/settings?type=export").then(() => toast("Export ready in response"))}>
          Export my data
        </FlirtyButton>
        <p className="text-xs text-white/50">
          Account deletion anonymizes profile, photos, sessions and personal fields. Remaining messages are replaced with a
          deletion note. Safety/billing records required for legal retention stay without identifiers.
        </p>
        <input className="w-full rounded-2xl bg-black/30 p-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="w-full rounded-2xl bg-black/30 p-3" placeholder="Type DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <FlirtyButton
          variant="danger"
          onClick={() =>
            api("/api/settings?type=delete", { method: "POST", body: JSON.stringify({ password, confirm: "DELETE" }) })
              .then(() => toast("Account deleted"))
              .catch((e) => toast(e.message))
          }
        >
          Delete account
        </FlirtyButton>
      </div>
      <Modal open={passportOpen} onClose={() => setPassportOpen(false)} title="Passport">
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {PASSPORT_CITIES.map((row) => (
            <button
              key={row.city}
              type="button"
              className="rounded-2xl bg-white/5 px-4 py-3 text-left"
              onClick={() =>
                api("/api/subscriptions?action=passport", { method: "POST", body: JSON.stringify({ city: row.city }) })
                  .then(() => {
                    toast(`Discovering in ${row.city}`);
                    setPassportOpen(false);
                    void refresh();
                  })
                  .catch((e) => toast(e.message))
              }
            >
              {row.city}, {row.country}
            </button>
          ))}
        </div>
      </Modal>
    </section>
  );
}
