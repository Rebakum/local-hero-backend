import { Role } from "@prisma/client";

export interface IUpdateProfilePayload {
  name?: string;
  phone?: string;
  avatar?: string;
}

export interface IApplyProviderPayload {
  category: string;
  experienceYears: number;
  serviceDetails: string;
  phone: string;
}

export interface IProfileResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  approvalStatus: string;
  category: string | null;
  experienceYears: number | null;
  serviceDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeleteProfilePayload {
  password: string;
}

export interface IGetAllUsersQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  approvalStatus?: string;
}
