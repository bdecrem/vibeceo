import { notFound } from "next/navigation";

type Block = {
  id: string;
  type: "paragraph" | "heading" | "richtext";
  content: string;
  properties: { level?: number };
};

async function fetchDocument(slug: string): Promise<{ title: string; blocks: Block[] } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    || "https://kochi.to";

  const res = await fetch(`${baseUrl}/api/mutabl/notabl/view/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

function renderInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#FD79A8;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>');
}

function BlockRenderer({ block }: { block: Block }) {
  const html = renderInlineFormatting(block.content);

  if (block.type === "heading") {
    const level = block.properties.level || 1;
    const sizes: Record<number, string> = { 1: "32px", 2: "24px", 3: "20px" };
    const weights: Record<number, number> = { 1: 700, 2: 600, 3: 600 };
    const margins: Record<number, string> = { 1: "32px 0 12px", 2: "24px 0 10px", 3: "20px 0 8px" };

    return (
      <div
        style={{
          fontSize: sizes[level] || "32px",
          fontWeight: weights[level] || 700,
          color: "#ffffff",
          margin: margins[level] || "32px 0 12px",
          lineHeight: 1.3,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (!block.content.trim()) {
    return <div style={{ height: "1em" }} />;
  }

  return (
    <div
      style={{
        fontSize: "16px",
        color: "#d0d0d0",
        lineHeight: 1.7,
        margin: "4px 0",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function SharedDocumentPage({
  params,
}: {
  params: { slug: string };
}) {
  const doc = await fetchDocument(params.slug);

  if (!doc) {
    notFound();
  }

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
          maxWidth: "680px",
          margin: "0 auto",
          padding: "64px 24px 80px",
        }}
      >
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 32px",
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          {doc.title}
        </h1>

        <div
          style={{
            borderTop: "1px solid #1a1a2e",
            paddingTop: "24px",
          }}
        >
          {doc.blocks[0]?.type === "richtext" ? (
            <>
              <style>{`
                .nb-public h1 { font-size: 32px; font-weight: 700; color: #fff; margin: 32px 0 12px; line-height: 1.3; }
                .nb-public h2 { font-size: 24px; font-weight: 600; color: #fff; margin: 24px 0 10px; line-height: 1.35; }
                .nb-public h3 { font-size: 20px; font-weight: 600; color: #fff; margin: 20px 0 8px; line-height: 1.4; }
                .nb-public p { font-size: 16px; color: #d0d0d0; line-height: 1.7; margin: 4px 0; }
                .nb-public strong { color: #e8e8e8; font-weight: 600; }
                .nb-public em { font-style: italic; }
                .nb-public u { text-decoration: underline; text-underline-offset: 3px; }
                .nb-public ul { list-style: disc; padding-left: 24px; margin: 4px 0; }
                .nb-public ol { list-style: decimal; padding-left: 24px; margin: 4px 0; }
                .nb-public li { margin: 2px 0; }
                .nb-public li p { margin: 0; }
                .nb-public blockquote { border-left: 3px solid #FD79A860; padding-left: 16px; margin: 8px 0; color: #999; font-style: italic; }
                .nb-public pre { background: #0d0d20; border-radius: 6px; padding: 14px 16px; margin: 8px 0; overflow-x: auto; }
                .nb-public pre code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: #a0a0b0; background: none; padding: 0; }
                .nb-public code { background: #1a1a30; padding: 2px 5px; border-radius: 3px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: #c0c0d0; }
                .nb-public hr { border: none; border-top: 1px solid #1e1e35; margin: 16px 0; }
                .nb-public a { color: #FD79A8; text-decoration: underline; text-underline-offset: 3px; }
                .nb-public img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; display: block; }
              `}</style>
              <div
                className="nb-public"
                dangerouslySetInnerHTML={{
                  __html: doc.blocks
                    .filter((b: Block) => b.type === "richtext")
                    .map((b: Block) => b.content)
                    .join(""),
                }}
              />
            </>
          ) : (
            doc.blocks.map((block: Block) => (
              <BlockRenderer key={block.id} block={block} />
            ))
          )}
        </div>

        <div
          style={{
            marginTop: "64px",
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
            href="/mutabl/notabl"
            style={{
              fontSize: "12px",
              color: "#FD79A8",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "1px",
            }}
          >
            NOTABL
          </a>
        </div>
      </div>
    </div>
  );
}
