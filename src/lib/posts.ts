export interface Post {
  id: string;
  username: string;
  caption: string;
  image?: string;
  placeId?: string;
  placeName: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  likes: number;
  likedByMe: boolean;
}

const STORAGE_KEY = "arway_posts";

const SEED_POSTS: Post[] = [
  {
    id: "seed-1",
    username: "maria.explores",
    caption: "Beautiful sunset at Luneta! Always love taking a walk here.",
    image: "/sceneries/Luneta.jpg",
    placeId: "rizal-park",
    placeName: "Rizal Park (Luneta)",
    lat: 14.5826,
    lng: 120.9787,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    likes: 120,
    likedByMe: false,
  },
  {
    id: "seed-2",
    username: "jun_wanders",
    caption: "History comes alive here. Exploring the old walls of Intramuros.",
    image: "/sceneries/Intramuros.jpg",
    placeId: "intramuros",
    placeName: "Intramuros",
    lat: 14.5896,
    lng: 120.9747,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    likes: 85,
    likedByMe: false,
  },
  {
    id: "seed-3",
    username: "karen_daily",
    caption: "Fort Santiago is so peaceful in the morning.",
    image: "/sceneries/Fort-Santiago-Intramuros.avif",
    placeId: "fort-santiago",
    placeName: "Fort Santiago",
    lat: 14.5951,
    lng: 120.9660,
    createdAt: Date.now() - 1000 * 60 * 15,
    likes: 24,
    likedByMe: false,
  },
  {
    id: "seed-4",
    username: "joseph.lens",
    caption: "The white sand really makes the Manila Bay sunset pop. Dolomite beach vibes!",
    image: "/sceneries/Dolomite-Beach.jpg",
    placeId: "manila-bay-dolomite",
    placeName: "Manila Bay Dolomite Beach",
    lat: 14.5528,
    lng: 120.9853,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    likes: 240,
    likedByMe: true,
  },
  {
    id: "seed-5",
    username: "city_walker_ph",
    caption: "Great place to chill in the middle of Makati.",
    image: "/sceneries/Ayala-Triangle.jpg",
    placeId: "ayala-triangle",
    placeName: "Ayala Triangle Gardens",
    lat: 14.5575,
    lng: 121.0252,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    likes: 12,
    likedByMe: false,
  }
];

export async function getPosts(): Promise<Post[]> {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let posts: Post[];
    if (data) {
      posts = JSON.parse(data);
    } else {
      posts = [...SEED_POSTS];
    }
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error("Failed to read posts", err);
    return [...SEED_POSTS].sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function addPost(post: Post): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const currentPosts = await getPosts();
    const isSeed = !localStorage.getItem(STORAGE_KEY);
    const newPosts = isSeed ? [post, ...SEED_POSTS] : [post, ...currentPosts];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts));
  } catch (err) {
    console.error("Failed to add post", err);
    throw err;
  }
}

export async function toggleLike(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const currentPosts = await getPosts();
    const updated = currentPosts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          likedByMe: !p.likedByMe,
          likes: p.likedByMe ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to toggle like", err);
    throw err;
  }
}
