export interface Scenery {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image?: string;
  images?: string[];
}

export const sceneries: Scenery[] = [
  { id: "rizal-park", name: "Rizal Park (Luneta)", address: "Ermita, Manila", lat: 14.5826, lng: 120.9787, image: "/sceneries/Luneta.jpg" },
  { id: "manila-baywalk", name: "Manila Baywalk (Bay sunset)", address: "Roxas Blvd, Malate, Manila", lat: 14.5730, lng: 120.9772, image: "/sceneries/manila-baywalk.jpg" },
  { id: "intramuros", name: "Intramuros", address: "Manila", lat: 14.5896, lng: 120.9747, image: "/sceneries/Intramuros.jpg" },
  { id: "fort-santiago", name: "Fort Santiago", address: "Intramuros, Manila", lat: 14.5951, lng: 120.9660, image: "/sceneries/Fort-Santiago-Intramuros.avif" },
  { id: "manila-cathedral", name: "Manila Cathedral", address: "Intramuros, Manila", lat: 14.5911, lng: 120.9728, image: "/sceneries/Manila-Cathedral.jpg" },
  { id: "binondo", name: "Binondo (Chinatown)", address: "Binondo, Manila", lat: 14.6005, lng: 120.9738, image: "/sceneries/Binondo-Chinatown.jpg" },
  { id: "paco-park", name: "Paco Park", address: "Paco, Manila", lat: 14.5815, lng: 120.9916, image: "/sceneries/Paco-Park.jpg" },
  { id: "pasig-river-esplanade", name: "Pasig River Esplanade", address: "Manila", lat: 14.5953, lng: 120.9697, image: "/sceneries/Pasig-River-Esplanade.jpg" },
  { id: "manila-bay-dolomite", name: "Manila Bay Dolomite Beach", address: "Roxas Blvd, Malate, Manila", lat: 14.5528, lng: 120.9853, image: "/sceneries/Dolomite-Beach.jpg" },
  { id: "ccp-complex", name: "CCP Complex", address: "Pasay City", lat: 14.5566, lng: 120.9822, image: "/sceneries/CCP-Complex.jpeg" },
  { id: "sm-by-the-bay", name: "SM by the Bay / MOA Seaside Blvd", address: "Pasay City", lat: 14.5340, lng: 120.9810, image: "/sceneries/SM-MOA.jpg" },
  { id: "ayala-triangle", name: "Ayala Triangle Gardens", address: "Makati City", lat: 14.5575, lng: 121.0252, image: "/sceneries/Ayala-Triangle.jpg" },
  { id: "greenbelt-park", name: "Greenbelt Park", address: "Ayala Center, Makati City", lat: 14.5530, lng: 121.0214, image: "/sceneries/Greenbelt.jpg" },
  { id: "sm-makati", name: "SM Makati", address: "Hotel Dr, East St, Ayala Center, Makati City", lat: 14.5494, lng: 121.0267, image: "/sceneries/sm-makati.jpg" }
];
