export interface ITestimonial {
  id: string;
  author: string;
  role: string;
  city: string;
  trade: string;
  rating: number;
  date: string;
  comment: string;
  verifiedJob: string;
  avatar: string | null;
  source: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
