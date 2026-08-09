type UserRole = "user" | "moderator" | "admin";
type PostStatus = "draft" | "published" | "removed";

type User = {
  id: number;
  username: string;
  role: UserRole;
  isActive: boolean;
};

type Post = {
  id: number;
  title: string;
  author: string;
  status: PostStatus;
};

const _ROLES: UserRole[] = ["user", "moderator", "admin"];

const _CURRENT_USER: User = {
  id: 2,
  username: "jari",
  role: "admin",
  isActive: true,
};

const _SAMPLE_POST: Post = {
  id: 3,
  title: "beans",
  author: "stefan",
  status: "draft",
};

export {};
