import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimilarPosts } from "@/lib/matching";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const postId = params.id;

    // 조회수 증가
    const post = await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            studentNoMasked: true,
            grade: true,
            classNo: true,
            role: true,
            returnedCount: true,
            warningCount: true,
          },
        },
        images: {
          orderBy: { order: "asc" },
        },
        reactions: true,
        claims: session?.user?.id
          ? {
              where:
                session.user.role === "ADMIN" || session.user.role === "TEACHER"
                  ? {}
                  : {
                      OR: [
                        { claimantId: session.user.id },
                        { post: { authorId: session.user.id } },
                      ],
                    },
              include: {
                claimant: {
                  select: {
                    id: true,
                    name: true,
                    studentNoMasked: true,
                    grade: true,
                    classNo: true,
                  },
                },
              },
            }
          : false,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // AI 유사 글 추천 목록 조회
    const similarPosts = await getSimilarPosts({
      id: post.id,
      title: post.title,
      body: post.body,
      tags: post.tags,
      type: post.type,
      category: post.category,
      placeBuilding: post.placeBuilding,
      placeDetail: post.placeDetail,
      occurredAt: post.occurredAt,
      createdAt: post.createdAt,
    });

    // 현재 접속자의 공감 반응 여부 계산
    const userHelpful = session?.user?.id
      ? post.reactions.some(
          (r) => r.userId === session.user.id && r.type === "HELPFUL"
        )
      : false;
    const userSighting = session?.user?.id
      ? post.reactions.some(
          (r) => r.userId === session.user.id && r.type === "ME_TOO"
        )
      : false;

    return NextResponse.json({
      post,
      similarPosts,
      stats: {
        helpfulCount: post.reactions.filter((r) => r.type === "HELPFUL").length,
        sightingCount: post.reactions.filter((r) => r.type === "ME_TOO").length,
        userHelpful,
        userSighting,
      },
    });
  } catch (error) {
    console.error("Post detail GET error:", error);
    return NextResponse.json(
      { error: "게시글 정보를 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const postId = params.id;
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "TEACHER";
    const isAuthor = post.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 반환 완료(RETURNED) 또는 수령 예약 중(RESERVED)인 글은 임의 삭제 불가
    if ((post.status === "RETURNED" || post.status === "RESERVED") && !isAdmin) {
      return NextResponse.json(
        {
          error:
            post.status === "RETURNED"
              ? "반환 완료된 분실물 기록은 신뢰 보존을 위해 삭제할 수 없습니다."
              : "현재 학생실 수령 예약이 진행 중인 글은 삭제할 수 없습니다. 예약을 취소한 후 진행해주세요.",
        },
        { status: 400 }
      );
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "POST_DELETED",
      details: { postId, title: post.title },
    });

    return NextResponse.json({ success: true, message: "게시글이 삭제되었습니다." });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json(
      { error: "삭제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
