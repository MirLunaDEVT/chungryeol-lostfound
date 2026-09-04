import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { SCHOOL_CONFIG } from "./constants";
import { maskStudentNo } from "./security";
import bcrypt from "bcryptjs";
import { createAuditLog } from "./audit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "chungryeol-lostfound-secret-key-2026!",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // 1. 충렬고 학생 1클릭 바로 입장 (구글/비밀번호 장벽 없이 즉시 진입)
    CredentialsProvider({
      id: "student-quick",
      name: "충렬고 학생 바로 입장",
      credentials: {},
      async authorize() {
        let guestUser = await prisma.user.findFirst({
          where: { studentNo: "STUDENT" },
        });

        if (!guestUser) {
          guestUser = await prisma.user.create({
            data: {
              studentNo: "STUDENT",
              studentNoMasked: "충렬고 학생",
              name: "충렬고 학생",
              role: "STUDENT",
              status: "ACTIVE",
              returnedCount: 0,
              warningCount: 0,
            },
          });
        }

        return {
          id: guestUser.id,
          name: guestUser.name,
          email: guestUser.email,
          studentNo: guestUser.studentNo,
          studentNoMasked: guestUser.studentNoMasked,
          grade: guestUser.grade,
          classNo: guestUser.classNo,
          role: guestUser.role,
          status: guestUser.status,
          returnedCount: guestUser.returnedCount,
          warningCount: guestUser.warningCount,
        };
      },
    }),

    // 2. 교직원 / 관리자 전용 로그인 (교번 T9901 + 비밀번호)
    CredentialsProvider({
      id: "credentials",
      name: "교직원/관리자 로그인",
      credentials: {
        studentNo: { label: "교번 / ID", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.studentNo || !credentials?.password) {
          throw new Error("아이디(교번)와 비밀번호를 입력해주세요.");
        }

        const studentNo = credentials.studentNo.trim();

        // 사용자 조회
        const user = await prisma.user.findUnique({
          where: { studentNo },
        });

        if (!user) {
          throw new Error("등록되지 않은 관리자/교직원 계정입니다.");
        }

        // 비밀번호 대조
        let isValid = false;
        if (user.passwordHash) {
          isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        } else if (credentials.password === "1234") {
          isValid = true;
        }

        if (!isValid) {
          await createAuditLog({
            userId: user.id,
            action: "LOGIN_FAILED_CREDENTIALS",
            details: { studentNo, reason: "비밀번호 불일치" },
          });
          throw new Error("비밀번호가 일치하지 않습니다.");
        }

        if (user.status === "SUSPENDED") {
          throw new Error("정지된 계정입니다.");
        }

        await createAuditLog({
          userId: user.id,
          action: "LOGIN_SUCCESS",
          details: { method: "admin-credentials", role: user.role },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          studentNo: user.studentNo,
          studentNoMasked: user.studentNoMasked,
          grade: user.grade,
          classNo: user.classNo,
          role: user.role,
          status: user.status,
          returnedCount: user.returnedCount,
          warningCount: user.warningCount,
        };
      },
    }),
  ],

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.studentNo = user.studentNo;
        token.studentNoMasked = user.studentNoMasked;
        token.grade = user.grade;
        token.classNo = user.classNo;
        token.role = user.role;
        token.status = user.status;
        token.returnedCount = user.returnedCount;
        token.warningCount = user.warningCount;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string | null;
        session.user.name = (token.name as string) || "충렬고 학생";
        session.user.studentNo = (token.studentNo as string) || "STUDENT";
        session.user.studentNoMasked = (token.studentNoMasked as string) || "충렬고 학생";
        session.user.grade = token.grade as number | null;
        session.user.classNo = token.classNo as number | null;
        session.user.role = token.role as any;
        session.user.status = token.status as any;
        session.user.returnedCount = (token.returnedCount as number) || 0;
        session.user.warningCount = (token.warningCount as number) || 0;
      }
      return session;
    },
  },
};
