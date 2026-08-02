type UserRole = ["user", "moderator", "admin"];

const roles: UserRole
type User = {
    id: 2,
    username: "jari",
    role: "admin",
    isActive: true
};

type PostStatus = ["draft", "published", "removed"];

type Post = {
    id: 3,
    title: 'beans',
    author: 'stefan',
    status: 'idk'
};

let currentUser = User;


