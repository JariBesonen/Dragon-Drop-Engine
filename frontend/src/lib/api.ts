export interface ApiUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  themePreference: "light" | "dark";
  notificationPreferences: {
    all: boolean;
    postLikes: boolean;
    postComments: boolean;
    replies: boolean;
    commentLikes: boolean;
    hiveFollows: boolean;
  };
  createdAt: string;
}

export interface ApiPost {
  id: number;
  userId: number;
  hiveId: number | null;
  authorUsername: string;
  authorDisplayName: string;
  title: string;
  content: string;
  community: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userVote: number | null;
}

export interface ApiComment {
  id: number;
  postId: number;
  userId: number;
  parentCommentId: number | null;
  content: string;
  createdAt: string;
  authorUsername: string;
  authorDisplayName: string;
  isDeleted: boolean;
  likeCount: number;
  dislikeCount: number;
  userVote: number | null;
  replies: ApiComment[];
}

export interface ApiProfileComment {
  id: number;
  postId: number;
  userId: number;
  parentCommentId: number | null;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  authorUsername: string;
  authorDisplayName: string;
  likeCount: number;
  dislikeCount: number;
  userVote: number | null;
  postTitle: string;
  postCommunity: string;
}

export interface ApiOwnedHive {
  id: number;
  name: string;
}

export interface ApiProfileView {
  user: ApiUser;
  posts: ApiPost[];
  comments: ApiProfileComment[];
  followerCount: number;
  isFollowing: boolean;
  ownedHives: ApiOwnedHive[];
}

export type ApiNotificationType =
  | "post_like"
  | "post_comment"
  | "post_reply"
  | "comment_like"
  | "comment_reply"
  | "hive_follow";

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  postId: number | null;
  commentId: number | null;
  hiveId: number | null;
  actorUsernames: string[];
  count: number;
  createdAt: string;
  read: boolean;
}

export interface ApiHive {
  id: number;
  ownerUserId: number;
  name: string;
  description: string;
  bannerImage: string | null;
  tags: string[];
  createdAt: string;
}

export interface ApiSearchResult {
  searches: string[];
  hives: ApiHive[];
}

export interface ApiHiveDetailResult {
  hive: ApiHive;
  joined: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormDataBody = init?.body instanceof FormData;

  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  getMe: () => request<{ user: ApiUser | null }>("/api/auth/me"),
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
  search: (query: string) =>
    request<ApiSearchResult>(`/api/search?q=${encodeURIComponent(query)}`),
  createPost: (body: { title: string; content: string; community: string }) =>
    request<{ post: ApiPost }>("/api/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getHivePosts: (id: number) =>
    request<{ posts: ApiPost[] }>(`/api/hives/${id}/posts`),
  getPostById: (id: number) => request<{ post: ApiPost }>(`/api/posts/${id}`),
  createHivePost: (id: number, formData: FormData) =>
    request<{ post: ApiPost }>(`/api/hives/${id}/posts`, {
      method: "POST",
      body: formData,
    }),
  deletePost: (id: number) =>
    request<{ message: string }>(`/api/posts/${id}`, {
      method: "DELETE",
    }),
  likePost: (id: number) =>
    request<{ post: ApiPost }>(`/api/posts/${id}/like`, {
      method: "POST",
    }),
  dislikePost: (id: number) =>
    request<{ post: ApiPost }>(`/api/posts/${id}/dislike`, {
      method: "POST",
    }),
  getPostComments: (id: number) =>
    request<{ comments: ApiComment[] }>(`/api/posts/${id}/comments`),
  createPostComment: (
    id: number,
    body: { content: string; parentCommentId?: number },
  ) =>
    request<{ comment: ApiComment }>(`/api/posts/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  likeComment: (postId: number, commentId: number) =>
    request<{ comment: ApiComment }>(
      `/api/posts/${postId}/comments/${commentId}/like`,
      {
        method: "POST",
      },
    ),
  dislikeComment: (postId: number, commentId: number) =>
    request<{ comment: ApiComment }>(
      `/api/posts/${postId}/comments/${commentId}/dislike`,
      {
        method: "POST",
      },
    ),
  deleteComment: (postId: number, commentId: number) =>
    request<{ message: string; comment: ApiComment }>(
      `/api/posts/${postId}/comments/${commentId}`,
      {
        method: "DELETE",
      },
    ),
  createHive: (formData: FormData) =>
    request<{ hive: ApiHive }>("/api/hives", {
      method: "POST",
      body: formData,
    }),
  getMyHives: () => request<{ hives: ApiHive[] }>("/api/hives/me"),
  getHive: (id: number) => request<ApiHiveDetailResult>(`/api/hives/${id}`),
  joinHive: (id: number) =>
    request<{ message: string; joined: boolean }>(`/api/hives/${id}/join`, {
      method: "POST",
    }),
  getMyProfile: () =>
    request<{ user: ApiUser; posts: ApiPost[] }>("/api/profile/me"),
  getNotifications: () =>
    request<{ notifications: ApiNotification[]; unreadCount: number }>(
      "/api/notifications",
    ),
  markNotificationsRead: () =>
    request<{ message: string }>("/api/notifications/read", {
      method: "POST",
    }),
  getProfileByUsername: (username: string) =>
    request<ApiProfileView>(`/api/profile/${encodeURIComponent(username)}`),
  followUser: (username: string) =>
    request<{ message: string; followerCount: number; isFollowing: boolean }>(
      `/api/profile/${encodeURIComponent(username)}/follow`,
      {
        method: "POST",
      },
    ),
  unfollowUser: (username: string) =>
    request<{ message: string; followerCount: number; isFollowing: boolean }>(
      `/api/profile/${encodeURIComponent(username)}/follow`,
      {
        method: "DELETE",
      },
    ),
  updateSettings: (body: {
    username?: string;
    displayName?: string;
    bio?: string;
    themePreference?: "light" | "dark";
    notificationPreferences?: {
      all?: boolean;
      postLikes?: boolean;
      postComments?: boolean;
      replies?: boolean;
      commentLikes?: boolean;
      hiveFollows?: boolean;
    };
  }) =>
    request<{ user: ApiUser }>("/api/profile/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAccount: (body: { confirmation: string }) =>
    request<{ message: string }>("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};
