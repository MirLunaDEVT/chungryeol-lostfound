import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name: string;
      studentNo: string;
      studentNoMasked: string;
      grade?: number | null;
      classNo?: number | null;
      role: string; // STUDENT, TEACHER, ADMIN
      status: string; // ACTIVE, PENDING_ONBOARDING, SUSPENDED, GRADUATED
      returnedCount: number;
      warningCount: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email?: string | null;
    name: string;
    studentNo: string;
    studentNoMasked: string;
    grade?: number | null;
    classNo?: number | null;
    role: string;
    status: string;
    returnedCount: number;
    warningCount: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null;
    name: string;
    studentNo: string;
    studentNoMasked: string;
    grade?: number | null;
    classNo?: number | null;
    role: string;
    status: string;
    returnedCount: number;
    warningCount: number;
  }
}
