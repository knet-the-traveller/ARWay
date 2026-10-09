export interface Category {
  id: string;
  label: string;
}

export const categories: Category[] = [
  { id: "souvenir", label: "Souvenir" },
  { id: "cafe", label: "Cafe" },
  { id: "restaurant", label: "Restaurant" }
];

export interface Shop {
  id: string;
  name: string;
  categoryId: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  image?: string;
  rating?: number;
  isOpen?: boolean;
  amenities?: string[];
}

export const shops: Shop[] = [
  // SAMPLE DATA
  { 
    id: "cioccolata-churros-cafe", 
    name: "Cioccolata Churros Café", 
    categoryId: "cafe", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.5898, 
    lng: 120.9745, 
    description: "Cafe in Intramuros.", 
    image: "/shop/cioccolata-churros-cafe.jpg",
    rating: 4.7,
    isOpen: true,
    amenities: ["Air Conditioned"]
  },
  { 
    id: "ilustrado-restaurant", 
    name: "Ilustrado Restaurant", 
    categoryId: "restaurant", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.5828, 
    lng: 120.9785, 
    description: "Restaurant in Intramuros.", 
    image: "/shop/ilustrado-restaurant.jpg",
    rating: 4.6,
    isOpen: true,
    amenities: ["Wi-Fi"]
  },
  { 
    id: "in-cafe-bar", 
    name: "In Café Bar", 
    categoryId: "cafe", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.6003, 
    lng: 120.9740, 
    description: "Cafe in Intramuros.", 
    image: "/shop/in-cafe-bar.jpg",
    rating: 4.5,
    isOpen: true,
    amenities: ["Cold Brew"]
  },
  { 
    id: "la-cathedral-cafe", 
    name: "La Cathedral Café", 
    categoryId: "cafe", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.5573, 
    lng: 121.0250, 
    description: "Cafe in Intramuros.", 
    image: "/shop/la-cathedral-cafe.jpg",
    rating: 4.6,
    isOpen: true,
    amenities: ["Air Conditioned"]
  },
  { 
    id: "paper-cup-cafe", 
    name: "Paper+Cup Café", 
    categoryId: "cafe", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.5342, 
    lng: 120.9812, 
    description: "Cafe in Intramuros.", 
    image: "/shop/paper-cup-cafe.jpg",
    rating: 4.3,
    isOpen: true,
    amenities: ["Cold Brew"]
  },
  { 
    id: "plaza-san-luis-complex-shops", 
    name: "Plaza San Luis Complex Shops", 
    categoryId: "souvenir", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.5732, 
    lng: 120.9774, 
    description: "Souvenir shops in Intramuros.", 
    image: "/shop/plaza-san-luis-souvenir.jpg",
    rating: 4.4,
    isOpen: false,
    amenities: ["Cash Only"]
  },
  { 
    id: "tesoros-intramuros", 
    name: "Tesoros (Intramuros branch)", 
    categoryId: "souvenir", 
    address: "Intramuros, Manila", 
    // TODO: replace with the real coordinates
    lat: 14.6007, 
    lng: 120.9736, 
    description: "Souvenir shop in Intramuros.", 
    image: "/shop/tesoros-intramuros.jpg",
    rating: 4.6,
    isOpen: true,
    amenities: ["Local Crafts"]
  }
];
