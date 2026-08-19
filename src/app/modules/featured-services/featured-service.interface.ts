export interface IFeaturedService {
  id: string;
  tradeId: string;
  title: string;
  estimatedPrice: string | null;
  timeEstimate: string | null;
  popularFor: string[];
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  trade?: {
    id: string;
    category: string;
  };
}
