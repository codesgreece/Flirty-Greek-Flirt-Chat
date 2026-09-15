"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { api } from "@/lib/api";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

export default function SettingsPage() {
  const { me, toast, refresh } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function savePrivacy(patch: Record<string, unknown>) {
    await api("/api/settings?type=privacy", { method: "POST", body: JSON.stringify(patch) });
    toast("Privacy updated");
    await refresh();
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
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
        <FlirtyButton
          variant="ghost"
          onClick={() =>
            api("/api/subscriptions?action=passport", {
              method: "POST",
              body: JSON.stringify({ city: "Thessaloniki", country: "Greece", latitude: 40.64, longitude: 22.94 }),
            })
              .then(() => toast("Passport set to Thessaloniki"))
              .catch((e) => toast(e.message))
          }
        >
          Passport: Thessaloniki
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
        <input className="w-full rounded-2xl bg-black/30 p-3" placeholder='Type DELETE' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
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
    </section>
  );
}
