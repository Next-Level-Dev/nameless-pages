import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import EditPageClient from "./edit-client";

interface Props {
  params: Promise<{ id: string }>;
}

interface ContentRow {
  id: number;
  title: string;
  body: string;
  excerpt: string;
  content_type: string;
  published: number;
  user_id: number;
}

export default async function EditPage({ params }: Props) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, title, body, excerpt, content_type, published, user_id
       FROM content WHERE id = ?`
    )
    .get(numId) as ContentRow | undefined;

  if (!row || row.user_id !== user.id) notFound();

  return (
    <EditPageClient
      id={row.id}
      title={row.title}
      initialBody={row.body}
      excerpt={row.excerpt}
      contentType={row.content_type}
      initialPublished={row.published === 1}
    />
  );
}
