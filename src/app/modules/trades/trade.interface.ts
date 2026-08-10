export interface ITrade {
  id: string;
  category: string;
  subtitle: string | null;
  iconName: string;
  description: string;
  avgHourlyRate: string;
  activeProsCount: number;
  popularTasks: string[];
  badge: string | null;
  featuredService: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
