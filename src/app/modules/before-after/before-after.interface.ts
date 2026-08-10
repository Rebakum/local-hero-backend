export interface IBeforeAfterProject {
  id: string;
  title: string;
  trade: string;
  location: string;
  beforeImage: string | null;
  afterImage: string | null;
  description: string;
  cost: string;
  completionDays: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
