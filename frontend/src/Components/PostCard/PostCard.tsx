import type { ApiPost } from "../../lib/api";
import "./PostCard.css";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

export default function PostCard({ post }: { post: ApiPost }) {
  return (
    <article className="post-card">
      <header className="post-card-header">
        <span>c/{post.community}</span>
        <span>by @{post.authorUsername}</span>
      </header>
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <small>{formatDate(post.createdAt)}</small>
    </article>
  );
}
