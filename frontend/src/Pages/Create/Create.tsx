import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./Create.css";

export default function Create() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [community, setCommunity] = useState<string>("general");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      await api.createPost({ title, content, community });
      setMessage("Post published.");
      navigate("/");
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create post.",
      );
    }
  }

  return (
    <main className="create-post-page">
      <section className="create-post-shell">
        <h2>Create Post</h2>
        {!currentUser ? (
          <p className="create-note">
            Login from the top navigation before posting.
          </p>
        ) : null}
        <form
          className="create-post-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            required
          />

          <label htmlFor="community">Community</label>
          <input
            id="community"
            value={community}
            onChange={(event) => {
              setCommunity(event.target.value);
            }}
            required
          />

          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            rows={8}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            required
          />

          <button type="submit" disabled={!currentUser}>
            Publish
          </button>
        </form>
        {message ? <p className="create-message">{message}</p> : null}
      </section>
    </main>
  );
}
