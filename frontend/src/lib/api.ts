export interface ApiUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  createdAt: string;
}

export interface ApiPost {
  id: number;
  userId: number;
  authorUsername: string;
  authorDisplayName: string;
  title: string;
  content: string;
  community: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message || `Request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  getMe: () => request<{ user: ApiUser }>("/api/auth/me"),
  register: (body: { username: string; email: string; password: string }) =>
    request<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { identity: string; password: string }) =>
    request<{ user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", {
      method: "POST",
    }),
  getExplorePosts: () => request<{ posts: ApiPost[] }>("/api/posts/explore"),
  getHomePosts: () => request<{ posts: ApiPost[] }>("/api/posts/home"),
  createPost: (body: { title: string; content: string; community: string }) =>
    request<{ post: ApiPost }>("/api/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMyProfile: () =>
    request<{ user: ApiUser; posts: ApiPost[] }>("/api/profile/me"),
  updateSettings: (body: { displayName?: string; bio?: string }) =>
    request<{ user: ApiUser }>("/api/profile/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
