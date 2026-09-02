import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { SCHOOL_CONFIG } from "./constants";
import { maskStudentNo, maskName } from "./security";
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
    // 1. 학교 구글 계정 OAuth 2.0 (기본, 권장)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "select_account",
                // Google OAuth hd(hosted domain) 힌트 제공
                hd: SCHOOL_CONFIG.allowedGoogleDomains[0] || undefined,
              },
            },
          }),
        ]
      : []),

    // 2. 학번 + 이름 + 비밀번호/PIN 로그인 (보조 및 로컬 테스트 지원)
    CredentialsProvider({
      id: "credentials",
      name: "학번/비밀번호 로그인",
      credentials: {
        studentNo: { label: "학번", type: "text" },
        name: { label: "이름", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.studentNo || !credentials?.password) {
          throw new Error("학번과 비밀번호를 입력해주세요.");
        }

        const studentNo = credentials.studentNo.trim();

        // 1. 재학생 명단(Roster)에 존재하는지 먼저 검증 (외부인 원천 차단)
        const roster = await prisma.rosterEntry.findUnique({
          where: { studentNo },
        });

        if (!roster || !roster.enrolled) {
          await createAuditLog({
            action: "LOGIN_FAILED_CREDENTIALS",
            details: { studentNo, reason: "재학생 명단에 없거나 퇴학/졸업 처리됨" },
          });
          throw new Error("학교 재학생 명단에 등록되지 않았거나 졸업/전학 처리된 학번입니다.");
        }

        // 2. 가입된 User 계정 조회
        let user = await prisma.user.findUnique({
          where: { studentNo },
        });

        // 계정이 없고 초기 PIN(예: "1234")으로 최초 가입하는 경우 자동 계정 활성화 지원
        if (!user) {
          // 이름 일치 확인
          if (credentials.name && credentials.name.trim() !== roster.name) {
            throw new Error("재학생 명단의 이름과 일치하지 않습니다.");
          }

          // 초기 비밀번호(1234) 검증
          if (credentials.password !== "1234") {
            throw new Error("최초 로그인 시 임시 PIN 번호는 1234 입니다.");
          }

          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(credentials.password, salt);

          user = await prisma.user.create({
            data: {
              studentNo: roster.studentNo,
              studentNoMasked: maskStudentNo(roster.studentNo),
              name: roster.name,
              grade: roster.grade,
              classNo: roster.classNo,
              role: roster.role,
              status: "ACTIVE",
              passwordHash: hash,
            },
          });

          await prisma.rosterEntry.update({
            where: { id: roster.id },
            data: { activatedAt: new Date() },
          });
        } else {
          // 비밀번호 확인
          if (user.passwordHash) {
            const isMatch = await bcrypt.compare(
              credentials.password,
              user.passwordHash
            );
            if (!isMatch) {
              await createAuditLog({
                userId: user.id,
                action: "LOGIN_FAILED_CREDENTIALS",
                details: { studentNo, reason: "비밀번호 불일치" },
              });
              throw new Error("비밀번호가 일치하지 않습니다.");
            }
          }
        }

        // 계정 정지 여부 검사
        if (user.status === "SUSPENDED") {
          await createAuditLog({
            userId: user.id,
            action: "LOGIN_BLOCKED_SUSPENDED",
            details: { reason: user.suspendedReason },
          });
          throw new Error(`계정이 일시 정지되었습니다: ${user.suspendedReason || "관리자 문의"}`);
        }

        await createAuditLog({
          userId: user.id,
          action: "LOGIN_SUCCESS",
          details: { method: "credentials" },
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const emailDomain = email.split("@")[1];
        const isAllowedDomain = SCHOOL_CONFIG.allowedGoogleDomains.some(
          (domain) => emailDomain === domain.toLowerCase()
        );

        if (!isAllowedDomain) {
          await createAuditLog({
            action: "LOGIN_FAILED_DOMAIN",
            details: {
              email,
              rejectedDomain: emailDomain,
              allowed: SCHOOL_CONFIG.allowedGoogleDomains,
            },
          });
          // 허용 도메인이 아니면 거부 에러 메시지 쿼리로 리다이렉트
          return "/login?error=InvalidDomain";
        }

        // DB에 연동된 유저가 있는지 확인
        let existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { googleSub: account.providerAccountId },
            ],
          },
        });

        // 교사 도메인인 경우 교사/관리자 권한 자동 감지
        const isTeacherEmail = emailDomain === SCHOOL_CONFIG.teacherDomain.toLowerCase() || email === SCHOOL_CONFIG.adminEmail.toLowerCase();
        const role = isTeacherEmail ? "ADMIN" : "STUDENT";

        if (!existingUser) {
          // 신규 구글 유저: 온보딩을 위해 임시 유저 생성 (PENDING_ONBOARDING)
          const tempStudentNo = "G-" + account.providerAccountId.slice(-6);
          existingUser = await prisma.user.create({
            data: {
              email,
              googleSub: account.providerAccountId,
              name: user.name || "학생",
              studentNo: tempStudentNo,
              studentNoMasked: tempStudentNo,
              role,
              status: "PENDING_ONBOARDING",
            },
          });
        }

        if (existingUser.status === "SUSPENDED") {
          return "/login?error=Suspended";
        }

        // 사용자 정보를 세션 유저 객체에 바인딩
        user.id = existingUser.id;
        user.studentNo = existingUser.studentNo;
        user.studentNoMasked = existingUser.studentNoMasked;
        user.grade = existingUser.grade;
        user.classNo = existingUser.classNo;
        user.role = existingUser.role;
        user.status = existingUser.status;
        user.returnedCount = existingUser.returnedCount;
        user.warningCount = existingUser.warningCount;
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
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

      // 온보딩 완료나 정보 업데이트 시 세션 갱신 지원
      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        token.studentNo = session.user.studentNo ?? token.studentNo;
        token.studentNoMasked = session.user.studentNoMasked ?? token.studentNoMasked;
        token.grade = session.user.grade ?? token.grade;
        token.classNo = session.user.classNo ?? token.classNo;
        token.status = session.user.status ?? token.status;
        token.returnedCount = session.user.returnedCount ?? token.returnedCount;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.studentNo = token.studentNo as string;
        session.user.studentNoMasked = token.studentNoMasked as string;
        session.user.grade = token.grade as number | undefined;
        session.user.classNo = token.classNo as number | undefined;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.returnedCount = (token.returnedCount as number) || 0;
        session.user.warningCount = (token.warningCount as number) || 0;
      }
      return session;
    },
  },
};
