import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./Settings.css";

export default function Settings() {
  const { currentUser, refreshMe } = useAuth();
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") || "").trim();
    const bio = String(formData.get("bio") || "").trim();

    try {
      await api.updateSettings({ displayName, bio });
      await refreshMe();
      setMessage("Settings updated.");
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update settings.",
      );
    }
  }

  return (
    <main className="settings-page">
      <section className="settings-shell">
        <h2>Settings</h2>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            name="displayName"
            defaultValue={currentUser?.displayName || ""}
          />
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={currentUser?.bio || ""}
          />
          <button type="submit">Save Settings</button>
        </form>
        {message ? <p className="settings-message">{message}</p> : null}
      </section>
    </main>
  );
}
