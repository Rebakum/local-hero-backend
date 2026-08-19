export interface IFeaturedService {
  title: string;
  estimatedPrice: string | null;
  timeEstimate: string | null;
  description: string;
  imageUrl: string | null;
  popularFor?: string[];
}

export interface ITrade {
  id: string;
  category: string;
  subtitle: string | null;
  iconUrl: string | null;
  description: string;
  avgHourlyRate: string;
  startingPrice: string | null;
  activeProsCount: number;
  popularTasks: string[];
  badge: string | null;
  featuredServices?: IFeaturedService[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
