export interface FeedPost {
  id: string;
  username: string;
  avatarLetter: string;
  avatarColor: string;
  placeName: string;
  timeAgo: string;
  likes: number;
  caption: string;
  image: string;
}

export const sampleFeed: FeedPost[] = [
  {
    id: "post1",
    username: "karen.daily",
    avatarLetter: "K",
    avatarColor: "bg-[#dcba94] text-[#2a2018]",
    placeName: "Fort Santiago",
    timeAgo: "2h",
    likes: 24,
    caption: "Fort Santiago is so peaceful in the morning. No signal needed to find my way here!",
    image: "/sceneries/Fort-Santiago-Intramuros.avif"
  },
  {
    id: "post2",
    username: "maria.explores",
    avatarLetter: "M",
    avatarColor: "bg-[#8b5a2b] text-[#f2e4cc]",
    placeName: "Rizal Park (Luneta)",
    timeAgo: "5h",
    likes: 12,
    caption: "A beautiful afternoon stroll.",
    image: "/sceneries/Luneta.jpg"
  }
];
