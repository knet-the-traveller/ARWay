// Placeholder data. Replace with real shops.

export interface Category {
  id: string;
  label: string;
}

export const categories: Category[] = [
  { id: "souvenir", label: "Souvenir" },
  { id: "cafe", label: "Cafe" },
  { id: "restaurant", label: "Restaurant" },
  { id: "street-food", label: "Street Food" },
  { id: "crafts", label: "Crafts & Art" },
  { id: "pasalubong", label: "Pasalubong" }
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
}

export const shops: Shop[] = [
  { id: "s1", name: "Souvenir Shop 1", categoryId: "souvenir", address: "Intramuros, Manila", lat: 14.5898, lng: 120.9745, description: "Generic souvenirs from Intramuros." },
  { id: "s2", name: "Souvenir Shop 2", categoryId: "souvenir", address: "Rizal Park, Ermita", lat: 14.5828, lng: 120.9785, description: "Memorabilia from Rizal Park." },
  { id: "c1", name: "Cafe 1", categoryId: "cafe", address: "Binondo, Manila", lat: 14.6003, lng: 120.9740, description: "A cozy cafe in Chinatown." },
  { id: "c2", name: "Cafe 2", categoryId: "cafe", address: "Ayala Triangle, Makati", lat: 14.5573, lng: 121.0250, description: "Quick coffee spot for professionals." },
  { id: "r1", name: "Restaurant 1", categoryId: "restaurant", address: "MOA Complex, Pasay", lat: 14.5342, lng: 120.9812, description: "Family dining near the bay." },
  { id: "r2", name: "Restaurant 2", categoryId: "restaurant", address: "Malate, Manila", lat: 14.5732, lng: 120.9774, description: "Local cuisine near the sunset view." },
  { id: "sf1", name: "Street Food Stall 1", categoryId: "street-food", address: "Binondo, Manila", lat: 14.6007, lng: 120.9736, description: "Authentic local street food." },
  { id: "sf2", name: "Street Food Stall 2", categoryId: "street-food", address: "Rizal Park, Ermita", lat: 14.5824, lng: 120.9789, description: "Quick snacks while walking." },
  { id: "cr1", name: "Crafts & Art Shop 1", categoryId: "crafts", address: "Intramuros, Manila", lat: 14.5894, lng: 120.9749, description: "Handmade local crafts." },
  { id: "cr2", name: "Crafts & Art Shop 2", categoryId: "crafts", address: "Ayala, Makati", lat: 14.5577, lng: 121.0254, description: "Modern art and bespoke pieces." },
  { id: "p1", name: "Pasalubong Center 1", categoryId: "pasalubong", address: "MOA Complex, Pasay", lat: 14.5338, lng: 120.9808, description: "Take-home treats for the family." },
  { id: "p2", name: "Pasalubong Center 2", categoryId: "pasalubong", address: "Malate, Manila", lat: 14.5728, lng: 120.9770, description: "Traditional delicacies." }
];
