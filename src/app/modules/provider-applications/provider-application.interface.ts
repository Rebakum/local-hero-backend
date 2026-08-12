export interface IProviderApplication {
  id: string;
  userId: string;
  tradeId: string;
  professionId: string;
  trade: string;
  companyName: string;
  companyLogo: string | null;
  bio: string;
  hourlyRate: number;
  location: string;
  postcodeArea: string;
  specialties: string[];
  experienceYears: number;
  phone: string;
  avatar: string | null;
  portfolioImages: string[];
  status: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
