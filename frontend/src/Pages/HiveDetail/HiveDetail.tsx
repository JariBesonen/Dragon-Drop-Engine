import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ApiHive } from "../../lib/api";
import "./HiveDetail.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function resolveBannerSrc(bannerImage: string | null): string | null {
  if (!bannerImage) {
    return null;
  }

  if (
    bannerImage.startsWith("http://") ||
    bannerImage.startsWith("https://") ||
    bannerImage.startsWith("data:") ||
    bannerImage.startsWith("blob:")
  ) {
    return bannerImage;
  }

  const normalizedPath = bannerImage.startsWith("/")
    ? bannerImage
    : `/${bannerImage}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function HiveDetail() {
  const { id } = useParams();
  const [hive, setHive] = useState<ApiHive | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadHive(): Promise<void> {
      const hiveId = Number(id);
      if (!Number.isInteger(hiveId) || hiveId <= 0) {
        setError("Invalid hive id.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.getHive(hiveId);
        setHive(response.hive);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load hive.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadHive();
  }, [id]);

  if (loading) {
    return (
      <main className="hive-page">
        <section className="hive-shell">
          <p>Loading hive...</p>
        </section>
      </main>
    );
  }

  if (error || !hive) {
    return (
      <main className="hive-page">
        <section className="hive-shell">
          <h2>Hive</h2>
          <p className="hive-error">{error || "Hive not found."}</p>
          <Link className="hive-back-link" to="/explore">
            Back to Explore
          </Link>
        </section>
      </main>
    );
  }

  const bannerSrc = resolveBannerSrc(hive.bannerImage);

  return (
    <main className="hive-page">
      <section className="hive-shell">
        {bannerSrc ? (
          <img
            className="hive-banner"
            src={bannerSrc}
            alt={`${hive.name} banner`}
          />
        ) : null}

        <header className="hive-header">
          <div>
            <h2>{hive.name}</h2>
            <p className="hive-meta">
              Created by user #{hive.ownerUserId} on{" "}
              {new Date(hive.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button type="button" className="hive-follow-button" disabled>
            Join Hive (Soon)
          </button>
        </header>

        {hive.tags.length > 0 ? (
          <div className="hive-tags">
            {hive.tags.map((tag: string) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}

        <article className="hive-description-card">
          <h3>About</h3>
          <p>{hive.description}</p>
        </article>

        <section className="hive-posts-placeholder">
          <h3>Posts</h3>
          <p>Hive posts feed will appear here soon.</p>
        </section>
      </section>
    </main>
  );
}
