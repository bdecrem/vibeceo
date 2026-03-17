import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  properties: Record<string, unknown>;
};

async function fetchSharedList(slug: string): Promise<{ title: string; tasks: Task[] } | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
    "https://kochi.to";

  const res = await fetch(`${baseUrl}/api/mutabl/todoit/view/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const list = await fetchSharedList(params.slug);
  if (!list) return { title: "List not found" };
  return {
    title: list.title,
    description: `${list.tasks.length} tasks on todoit`,
    openGraph: {
      title: list.title,
      description: `${list.tasks.length} tasks on todoit`,
    },
  };
}

export default async function SharedListPage({
  params,
}: {
  params: { slug: string };
}) {
  const list = await fetchSharedList(params.slug);

  if (!list) {
    notFound();
  }

  const done = list.tasks.filter((t) => t.completed).length;
  const total = list.tasks.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "64px 24px 80px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 8px",
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          {list.title}
        </h1>

        <div
          style={{
            fontSize: "13px",
            color: "#555",
            marginBottom: "32px",
            letterSpacing: "0.5px",
          }}
        >
          {done}/{total} complete
        </div>

        <div
          style={{
            borderTop: "1px solid #1a1a2e",
            paddingTop: "24px",
          }}
        >
          {list.tasks.length === 0 ? (
            <div style={{ color: "#444", fontSize: "14px", fontStyle: "italic" }}>
              no tasks yet
            </div>
          ) : (
            list.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: "1px solid #0f0f25",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    border: task.completed ? "none" : "1px solid #333",
                    background: task.completed ? "#6366f1" : "transparent",
                    flexShrink: 0,
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {task.completed && (
                    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                      <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "15px",
                    color: task.completed ? "#444" : "#d0d0d0",
                    lineHeight: 1.5,
                    textDecoration: task.completed ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            marginTop: "56px",
            paddingTop: "24px",
            borderTop: "1px solid #1a1a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#444", letterSpacing: "0.5px" }}>
            made with
          </span>
          <a
            href="/mutabl/todoit"
            style={{
              fontSize: "12px",
              color: "#6366f1",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "1px",
            }}
          >
            TODOIT
          </a>
        </div>
      </div>
    </div>
  );
}
