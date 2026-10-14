/** Layout for the shareable top 5 image. Satori only supports flexbox, so every box is display:flex. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_FONT = "Liberation Sans";

export interface CardRow {
  rank: number;
  name: string;
  /** "31.2 mi" or "4,101 ft". */
  value: string;
  /** A data: URL for the member's photo, or null to show initials. */
  avatar: string | null;
  initials: string;
}

const RANK_COLORS = ["#d97706", "#6b7280", "#b45309", "#ea580c", "#ea580c"];

export function initialsOf(name: string): string {
  const parts = name.replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function Top5Card({
  title,
  subtitle,
  rows,
  logo,
  siteHost,
}: {
  title: string;
  subtitle: string;
  rows: CardRow[];
  logo: string | null;
  siteHost: string;
}) {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff7ed",
        fontFamily: CARD_FONT,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#ea580c",
          padding: "40px 48px",
          height: 270,
        }}
      >
        {logo ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 190,
              height: 190,
              borderRadius: 32,
              backgroundColor: "#ffffff",
              marginRight: 40,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={170} height={170} />
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#ffedd5", letterSpacing: 3 }}>LOUISVILLE LANDSHARKS</div>
          <div style={{ display: "flex", fontSize: 76, color: "#ffffff", marginTop: 6 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 40, color: "#ffedd5", marginTop: 6 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "36px 48px 0 48px", flex: 1 }}>
        {rows.map((row, i) => (
          <div
            key={row.rank}
            style={{
              display: "flex",
              alignItems: "center",
              height: 168,
              marginBottom: 18,
              padding: "0 36px",
              borderRadius: 30,
              backgroundColor: i === 0 ? "#fffbeb" : "#ffffff",
              border: i === 0 ? "4px solid #f59e0b" : "2px solid #fed7aa",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: RANK_COLORS[i] ?? "#ea580c",
                color: "#ffffff",
                fontSize: 46,
                marginRight: 28,
              }}
            >
              {row.rank}
            </div>
            {row.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img
                src={row.avatar}
                width={116}
                height={116}
                style={{ borderRadius: 58, objectFit: "cover", marginRight: 28 }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 116,
                  height: 116,
                  borderRadius: 58,
                  backgroundColor: "#ffedd5",
                  color: "#c2410c",
                  fontSize: 46,
                  marginRight: 28,
                }}
              >
                {row.initials}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flex: 1,
                fontSize: 54,
                color: "#111827",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {row.name}
            </div>
            <div style={{ display: "flex", fontSize: 58, color: "#c2410c", marginLeft: 16 }}>{row.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          height: 84,
          fontSize: 30,
          color: "#9a3412",
        }}
      >
        <div style={{ display: "flex" }}>Multisport Club</div>
        <div style={{ display: "flex" }}>{siteHost}</div>
      </div>
    </div>
  );
}
