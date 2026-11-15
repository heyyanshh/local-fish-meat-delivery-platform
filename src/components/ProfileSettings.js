"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Check } from "lucide-react";
import { sanitizePinCode } from "@/lib/delivery-slots";

const DeliveryMapPicker = dynamic(() => import("@/components/DeliveryMapPicker"), {
  ssr: false,
  loading: () => <div className="delivery-map-loading" role="status">Loading the location map…</div>,
});

const emptyProfile = { phone: "", address: "", city: "", state: "", postalCode: "", latitude: null, longitude: null };
const localProfileKey = "cutcatch-saved-delivery-v1";

export default function ProfileSettings({ initialProfile }) {
  const [profile, setProfile] = useState({ ...emptyProfile, ...initialProfile });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/profile", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (controller.signal.aborted || data?.mode !== "local-demo") return;
        try {
          const localProfile = JSON.parse(localStorage.getItem(localProfileKey) || "null");
          if (localProfile && typeof localProfile === "object") {
            setProfile((current) => ({ ...current, ...localProfile }));
            setSavedLocally(true);
          }
        } catch {}
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function update(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: name === "postalCode" ? sanitizePinCode(value) : value }));
    setSaved(false);
    setSavedLocally(false);
    setError("");
  }

  function selectLocation(location) {
    setProfile((current) => ({
      ...current,
      address: typeof location.address === "string" ? location.address : current.address,
      city: typeof location.city === "string" ? location.city : current.city,
      state: typeof location.state === "string" ? location.state : current.state,
      postalCode: typeof location.postalCode === "string" ? sanitizePinCode(location.postalCode) : current.postalCode,
      latitude: typeof location.latitude === "number" ? location.latitude : current.latitude,
      longitude: typeof location.longitude === "number" ? location.longitude : current.longitude,
    }));
    setSaved(false);
    setSavedLocally(false);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          postalCode: profile.postalCode,
          latitude: profile.latitude,
          longitude: profile.longitude,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error === "invalid_profile"
          ? "Check your phone number and PIN code, then try again."
          : data.error === "unauthorized"
            ? "Your sign-in has expired. Sign in again to save your details."
            : data.error === "database_not_configured"
              ? "Saved delivery details are unavailable because account storage is not connected."
              : data.error === "profile_not_found"
                ? "We couldn’t find your account. Sign out and sign back in, then try again."
                : data.error === "profile_save_failed"
                  ? `Your details could not be saved${data.diagnostic ? ` (${data.diagnostic})` : ""}. Please try again.`
                  : "Your details could not be saved. Please try again.";
        throw new Error(message);
      }
      const nextProfile = { ...emptyProfile, ...data.profile };
      if (data.mode === "local-demo") localStorage.setItem(localProfileKey, JSON.stringify(nextProfile));
      else localStorage.removeItem(localProfileKey);
      setProfile(nextProfile);
      setSavedLocally(data.mode === "local-demo");
      setSaved(true);
    } catch (cause) {
      setError(cause.message || "Your details could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="profile-settings" aria-labelledby="profile-settings-title">
    <div className="profile-settings-heading">
      <div><span className="eyebrow"><span className="eyebrow-line" /> FOR NEXT TIME</span><h2 id="profile-settings-title">Saved delivery details</h2></div>
      <p>Save your phone and usual address once. We’ll fill them in when you check out.</p>
    </div>
    <form className="profile-settings-form" onSubmit={save}>
      <DeliveryMapPicker onLocationSelect={selectLocation} selectedLocation={profile} />
      <p className="map-privacy-note">Map search and selected points use OpenStreetMap to look up address details. Device location is requested only if you choose “Use my current location”. You can also enter everything below by hand.</p>
      <div className="form-grid">
        <div className="field full"><label htmlFor="profile-phone">Phone number</label><input id="profile-phone" name="phone" autoComplete="tel" inputMode="tel" maxLength={24} value={profile.phone} onChange={update} placeholder="Phone for delivery updates" /></div>
        <div className="field full"><label htmlFor="profile-address">Address</label><textarea id="profile-address" name="address" autoComplete="street-address" maxLength={300} value={profile.address} onChange={update} placeholder="House, street, apartment, or landmark" /></div>
        <div className="field"><label htmlFor="profile-city">City</label><input id="profile-city" name="city" autoComplete="address-level2" maxLength={80} value={profile.city} onChange={update} /></div>
        <div className="field"><label htmlFor="profile-state">State</label><input id="profile-state" name="state" autoComplete="address-level1" maxLength={100} value={profile.state} onChange={update} /></div>
        <div className="field"><label htmlFor="profile-postalCode">Area PIN code</label><input id="profile-postalCode" name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" value={profile.postalCode} onChange={update} placeholder="6 digits" /></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="profile-saved" role="status"><Check size={14} /> {savedLocally ? "Details saved on this device for local demo checkout." : "Details saved. They’ll be ready at your next checkout."}</p>}
      <button className="button button-dark" type="submit" disabled={saving}><span>{saving ? "Saving details…" : "Save delivery details"}</span><ArrowRight size={16} /></button>
    </form>
  </section>;
}
