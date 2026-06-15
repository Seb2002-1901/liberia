/**
 * Loading skeleton V3 pour les routes /design-match/*-v3. Affiché
 * pendant le RSC fetch (getFinanceData + getOrSealDrawerData + i18n)
 * qui peut prendre 0.5-1.5s sur réseau lent. Évite l'écran figé.
 */

const C = {
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  shimmer1: "#F1F5F9",
  shimmer2: "#E5E9F0",
};

export default function V3DesignMatchLoading() {
  return (
    <>
      <style>{`
        @keyframes v3-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @media (max-width: 999px) {
          [data-skel-sidebar] { display: none !important; }
          [data-skel-content] { margin-left: 0 !important; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <aside
          data-skel-sidebar
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 280,
            backgroundColor: C.cardBg,
            borderRight: `1px solid ${C.borderGhost}`,
            padding: "20px 16px",
          }}
        >
          <Skeleton w={130} h={26} mb={28} />
          {[...Array(11)].map((_, i) => (
            <Skeleton key={i} w={210} h={36} mb={8} radius={8} />
          ))}
        </aside>
        <div data-skel-content style={{ marginLeft: 280, flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <Skeleton w={240} h={28} mb={8} />
              <Skeleton w={320} h={14} />
            </div>
            <Skeleton w={180} h={40} radius={999} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 18 }}>
            <Skeleton h={178} radius={18} />
            <Skeleton h={178} radius={18} />
            <Skeleton h={178} radius={18} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} h={102} radius={14} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Skeleton h={204} radius={18} />
            <Skeleton h={204} radius={18} />
            <Skeleton h={204} radius={18} />
          </div>
        </div>
      </div>
    </>
  );
}

function Skeleton({
  w,
  h,
  mb,
  radius = 6,
}: {
  w?: number | string;
  h: number;
  mb?: number;
  radius?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        width: w ?? "100%",
        height: h,
        borderRadius: radius,
        marginBottom: mb ?? 0,
        background: `linear-gradient(90deg, ${C.shimmer1} 25%, ${C.shimmer2} 50%, ${C.shimmer1} 75%)`,
        backgroundSize: "800px 100%",
        animation: "v3-shimmer 1.4s linear infinite",
      }}
    />
  );
}
