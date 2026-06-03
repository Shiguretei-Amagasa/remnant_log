import { useState, useEffect, useRef } from "react";

// ── Mock Data ──────────────────────────────────────────────
const MOCK_REMNANTS = [
  {
    id: 1, uid: "#2847",
    text: "2021年の冬、ここで私は泣いた。理由は今でも言えない。",
    distance: 12, expires: "forever", timestamp: "2021.12.03", read: false,
  },
  {
    id: 2, uid: "#0412",
    text: "彼女と最後に話したのはこの角だった。彼女は振り返らなかった。",
    distance: 34, expires: "week", timestamp: "2026.05.24", read: false,
  },
  {
    id: 3, uid: "#2847",
    text: "ここで転職を決めた。誰にも言わなかった。",
    distance: 67, expires: "forever", timestamp: "2019.11.14", read: true,
  },
  {
    id: 4, uid: "#7731",
    text: "午前3時。誰もいない。それがこんなに美しいとは知らなかった。",
    distance: 89, expires: "week", timestamp: "2026.05.29", read: false,
  },
  {
    id: 5, uid: "#0412",
    text: "父が死んだ日、私はここで立ち止まれなかった。今日、やっと立ち止まれた。",
    distance: 143, expires: "forever", timestamp: "2025.03.07", read: false,
  },
];

const TRAIL_MAP = {
  "#2847": [
    { id: 1, text: "2021年の冬、ここで私は泣いた。理由は今でも言えない。", timestamp: "2021.12.03", distance: 12 },
    { id: 3, text: "ここで転職を決めた。誰にも言わなかった。", timestamp: "2019.11.14", distance: 67 },
    { id: 6, text: "朝、ここで煙草を吸った。辞めようとしていた。辞められなかった。", timestamp: "2019.04.22", distance: 234 },
  ],
  "#0412": [
    { id: 2, text: "彼女と最後に話したのはこの角だった。彼女は振り返らなかった。", timestamp: "2026.05.24", distance: 34 },
    { id: 5, text: "父が死んだ日、私はここで立ち止まれなかった。今日、やっと立ち止まれた。", timestamp: "2025.03.07", distance: 143 },
  ],
};

// ── App ────────────────────────────────────────────────────
export default function RemnantLog() {
  const [view, setView] = useState("home"); // home | write | ar | trail | delete_confirm
  const [tab, setTab] = useState("nearby");
  const [selected, setSelected] = useState(null);
  const [trailUID, setTrailUID] = useState(null);
  const [arPhase, setArPhase] = useState(0);
  const [draft, setDraft] = useState({ text: "", expires: null });
  const [charCount, setCharCount] = useState(0);
  const [posted, setPosted] = useState(false);
  const [notification, setNotification] = useState(null);
  const [myRemnants, setMyRemnants] = useState([
    { id: 10, text: "ここで初めて、生きていていいと思った。", timestamp: "2026.04.11", expires: "forever", distance: 320 },
  ]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [floatOffset, setFloatOffset] = useState(0);

  // floating animation
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.03;
      setFloatOffset(Math.sin(t) * 6);
    }, 50);
    return () => clearInterval(id);
  }, []);

  // notification trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotification(MOCK_REMNANTS[1]);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // AR phase
  useEffect(() => {
    if (view === "ar") {
      setArPhase(0);
      const t1 = setTimeout(() => setArPhase(1), 600);
      const t2 = setTimeout(() => setArPhase(2), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [view, selected]);

  const openAR = (item) => { setSelected(item); setView("ar"); };
  const openTrail = (uid) => { setTrailUID(uid); setView("trail"); };

  const handlePost = () => {
    if (!draft.text.trim() || !draft.expires) return;
    setPosted(true);
    setMyRemnants(prev => [...prev, {
      id: Date.now(), text: draft.text,
      timestamp: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      expires: draft.expires, distance: 0,
    }]);
    setTimeout(() => {
      setPosted(false); setDraft({ text: "", expires: null }); setCharCount(0); setView("home");
    }, 2400);
  };

  const handleDeleteConfirm = () => {
    setMyRemnants(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null); setView("home"); setTab("mine");
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Notification ── */}
      {notification && view === "home" && (
        <div style={S.notif} className="slide-down">
          <div style={S.notifPulse} className="pulse-ring" />
          <div style={{ flex: 1 }}>
            <div style={S.notifTitle}>{notification.distance}m先に残滓があります</div>
            <div style={S.notifMeta}>{notification.uid} · {notification.timestamp}</div>
          </div>
          <button style={S.notifOpen} onClick={() => { openAR(notification); setNotification(null); }}>開く</button>
          <button style={S.notifDismiss} onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* ══════════ HOME ══════════ */}
      {view === "home" && (
        <div style={S.screen}>
          {/* header */}
          <div style={S.header}>
            <div>
              <div style={S.logoEn}>remnant log</div>
              <div style={S.logoJa}>感情の痕跡を、場所に刻む</div>
            </div>
            <div style={S.locBadge}>
              <span style={S.locDot} className="loc-pulse" />
              <span style={S.locText}>GPS取得中</span>
            </div>
          </div>

          {/* tabs */}
          <div style={S.tabBar}>
            {["nearby", "mine"].map(t => (
              <button key={t} style={{ ...S.tabBtn, ...(tab === t ? S.tabActive : {}) }}
                onClick={() => setTab(t)}>
                {t === "nearby" ? "近くの残滓" : "自分の残滓"}
              </button>
            ))}
          </div>

          {/* nearby */}
          {tab === "nearby" && (
            <div style={S.list}>
              {MOCK_REMNANTS.map((item, i) => (
                <div key={item.id} style={{ ...S.card, animationDelay: `${i * 60}ms` }}
                  className="fade-up" onClick={() => openAR(item)}>
                  <div style={S.cardMeta}>
                    <button style={S.uidBtn} onClick={e => { e.stopPropagation(); openTrail(item.uid); }}>
                      {item.uid}
                    </button>
                    <span style={S.cardDist}>{item.distance}m</span>
                    <span style={{ ...S.expiryBadge, ...(item.expires === "forever" ? S.forever : S.week) }}>
                      {item.expires === "forever" ? "永遠" : "1週間"}
                    </span>
                    {!item.read && <span style={S.unreadDot} />}
                  </div>
                  <div style={S.cardText}>{item.text}</div>
                  <div style={S.cardTs}>{item.timestamp}</div>
                </div>
              ))}
            </div>
          )}

          {/* mine */}
          {tab === "mine" && (
            <div style={S.list}>
              {myRemnants.length === 0 && (
                <div style={S.empty}>まだ何も残していません</div>
              )}
              {myRemnants.map((item, i) => (
                <div key={item.id} style={{ ...S.card, animationDelay: `${i * 60}ms` }}
                  className="fade-up">
                  <div style={S.cardMeta}>
                    <span style={S.myTag}>自分</span>
                    <span style={S.cardDist}>{item.distance === 0 ? "現在地" : `${item.distance}m`}</span>
                    <span style={{ ...S.expiryBadge, ...(item.expires === "forever" ? S.forever : S.week) }}>
                      {item.expires === "forever" ? "永遠" : "1週間"}
                    </span>
                    {item.expires === "forever" && (
                      <button style={S.deleteBtn}
                        onClick={() => { setDeleteTarget(item); setView("delete_confirm"); }}>
                        削除
                      </button>
                    )}
                  </div>
                  <div style={S.cardText}>{item.text}</div>
                  <div style={S.cardTs}>{item.timestamp}</div>
                </div>
              ))}
              <div style={S.deleteNote}>永遠の残滓は、その場所に戻ることで削除できます</div>
            </div>
          )}

          <button style={S.fab} onClick={() => setView("write")}>
            <span style={S.fabPlus}>＋</span>
          </button>
        </div>
      )}

      {/* ══════════ WRITE ══════════ */}
      {view === "write" && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => { setView("home"); setDraft({ text: "", expires: null }); setCharCount(0); }}>
            ← 戻る
          </button>
          {posted ? (
            <div style={S.postedWrap} className="fade-in">
              <div style={S.postedMain}>刻まれました。</div>
              <div style={S.postedSub}>この場所に、あなたの想いが残ります。</div>
            </div>
          ) : (
            <div style={S.writeWrap}>
              <div style={S.writeLocLabel}>📍 現在地に残す</div>
              <div style={S.textareaWrap}>
                <textarea style={S.textarea}
                  placeholder={"今、ここで感じていることを残してください。"}
                  value={draft.text} maxLength={100}
                  onChange={e => { setDraft({ ...draft, text: e.target.value }); setCharCount(e.target.value.length); }} />
                <div style={{ ...S.charBar }}>
                  <div style={{ ...S.charFill, width: `${charCount}%` }} />
                </div>
                <div style={S.charNum}>{charCount} / 100</div>
              </div>

              <div style={S.expiryLabel}>この想いは、いつまで残りますか</div>
              <div style={S.expiryOptions}>
                {[
                  { value: "week", main: "1週間", sub: "7日後に消える" },
                  { value: "forever", main: "永遠", sub: "その場所に戻って消す" },
                ].map(opt => (
                  <button key={opt.value}
                    style={{ ...S.expiryOpt, ...(draft.expires === opt.value ? S.expiryOptActive : {}) }}
                    onClick={() => setDraft({ ...draft, expires: opt.value })}>
                    <div style={S.expiryMain}>{opt.main}</div>
                    <div style={S.expirySub}>{opt.sub}</div>
                  </button>
                ))}
              </div>

              <button style={{ ...S.postBtn, opacity: draft.text.trim() && draft.expires ? 1 : 0.25 }}
                disabled={!draft.text.trim() || !draft.expires} onClick={handlePost}>
                この場所に刻む
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ AR ══════════ */}
      {view === "ar" && selected && (
        <div style={S.arRoot}>
          {/* simulated camera bg */}
          <div style={{
            ...S.arBg,
            filter: arPhase >= 1 ? "saturate(0.08) brightness(0.78)" : "saturate(1) brightness(1)",
            transition: "filter 2s ease",
          }}>
            <div style={S.arGrid} />
            <div style={S.arVignette} />
            {/* scan line */}
            {arPhase === 1 && <div style={S.scanLine} className="scan" />}
          </div>

          {/* floating text box */}
          {arPhase >= 2 && (
            <div style={{ ...S.arFloat, transform: `translateX(-50%) translateY(${floatOffset}px)` }}
              className="ar-emerge">
              <div style={S.arBoxTop}>
                <span style={S.arUID}>{selected.uid}</span>
                <span style={S.arTs}>{selected.timestamp}</span>
              </div>
              <div style={S.arDivider} />
              <div style={S.arBodyText}>{selected.text}</div>
              <div style={S.arDivider} />
              <div style={S.arBoxBot}>
                <span style={{ ...S.arExpiry, ...(selected.expires === "forever" ? S.forever : S.week) }}>
                  {selected.expires === "forever" ? "永遠に残る" : "1週間で消える"}
                </span>
                <button style={S.arTrailBtn} onClick={() => openTrail(selected.uid)}>
                  足跡を辿る →
                </button>
              </div>
            </div>
          )}

          <button style={S.arClose} onClick={() => setView("home")}>✕</button>
          {arPhase >= 2 && (
            <div style={S.arDistBadge}>
              <span style={S.arDistPulse} className="pulse-ring" />
              <span>{selected.distance}m</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TRAIL ══════════ */}
      {view === "trail" && trailUID && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => setView("home")}>← 戻る</button>
          <div style={S.trailHeader}>
            <div style={S.trailUID}>{trailUID}</div>
            <div style={S.trailSub}>の足跡 · {(TRAIL_MAP[trailUID] || []).length}地点</div>
          </div>
          <div style={S.trailList}>
            {(TRAIL_MAP[trailUID] || []).map((item, i) => (
              <div key={item.id} style={S.trailRow} className="fade-up"
                onClick={() => openAR({ ...item, uid: trailUID, expires: "forever", read: true })}>
                <div style={S.trailLeft}>
                  <div style={S.trailDot} />
                  {i < (TRAIL_MAP[trailUID].length - 1) && <div style={S.trailLine} />}
                </div>
                <div style={S.trailRight}>
                  <div style={S.trailRowMeta}>
                    <span style={S.trailTs}>{item.timestamp}</span>
                    <span style={S.trailDist}>{item.distance}m</span>
                  </div>
                  <div style={S.trailText}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ DELETE CONFIRM ══════════ */}
      {view === "delete_confirm" && deleteTarget && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => { setDeleteTarget(null); setView("home"); }}>← 戻る</button>
          <div style={S.deleteWrap}>
            <div style={S.deleteTitle}>本当に消しますか</div>
            <div style={S.deleteDesc}>
              「永遠」として刻んだ残滓です。{"\n"}
              削除は、その場所に戻って行う行為のはずです。{"\n\n"}
              今ここで消すことができますが、{"\n"}
              本当にいいですか。
            </div>
            <div style={S.deletePreview}>{deleteTarget.text}</div>
            <div style={S.deleteMeta}>{deleteTarget.timestamp}</div>
            <button style={S.deleteConfirmBtn} onClick={handleDeleteConfirm}>
              消す
            </button>
            <button style={S.deleteCancelBtn} onClick={() => { setDeleteTarget(null); setView("home"); }}>
              やっぱり残す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  root: {
    background: "#0a0908",
    minHeight: "100vh",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    color: "#ccc8c0",
    maxWidth: 430,
    margin: "0 auto",
    position: "relative",
    overflowX: "hidden",
  },
  screen: { minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 100 },

  // Header
  header: { padding: "32px 22px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #151310" },
  logoEn: { fontFamily: "'DM Mono', monospace", fontSize: 22, letterSpacing: "0.05em", color: "#e8e4dc", fontWeight: 400 },
  logoJa: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#2e2c28", letterSpacing: "0.1em", marginTop: 5 },
  locBadge: { display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", border: "1px solid #1c1a16", borderRadius: 20 },
  locDot: { width: 6, height: 6, borderRadius: "50%", background: "#5a8a5a", display: "block" },
  locText: { fontSize: 9, color: "#3a3830", letterSpacing: "0.1em" },

  // Tabs
  tabBar: { display: "flex", borderBottom: "1px solid #111" },
  tabBtn: { flex: 1, padding: "13px", background: "none", border: "none", color: "#383530", fontSize: 11, letterSpacing: "0.12em", cursor: "pointer", transition: "color 0.2s" },
  tabActive: { color: "#c8b88a", borderBottom: "1px solid #c8b88a", marginBottom: -1 },

  // List
  list: { flex: 1 },
  card: { padding: "18px 22px", borderBottom: "1px solid #0f0e0c", cursor: "pointer" },
  cardMeta: { display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" },
  uidBtn: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c8b88a", background: "none", border: "1px solid #2e2a1e", borderRadius: 3, padding: "2px 7px", cursor: "pointer", letterSpacing: "0.08em" },
  cardDist: { fontSize: 10, color: "#353230", letterSpacing: "0.06em" },
  expiryBadge: { fontSize: 9, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" },
  forever: { color: "#b0a888", border: "1px solid #2e2a1e", background: "transparent" },
  week: { color: "#6a7a6a", border: "1px solid #1e2a1e", background: "transparent" },
  unreadDot: { width: 5, height: 5, borderRadius: "50%", background: "#c8b88a", marginLeft: "auto" },
  myTag: { fontSize: 9, color: "#4a6a7a", border: "1px solid #1e2a30", padding: "2px 7px", borderRadius: 3 },
  deleteBtn: { marginLeft: "auto", fontSize: 9, color: "#6a3a3a", border: "1px solid #2a1a1a", background: "none", padding: "2px 8px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.06em" },
  cardText: { fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.9, color: "#9a9590" },
  cardTs: { fontSize: 9, color: "#252220", marginTop: 8, letterSpacing: "0.06em" },
  empty: { padding: "48px 22px", fontSize: 12, color: "#252220", textAlign: "center", letterSpacing: "0.1em" },
  deleteNote: { padding: "20px 22px", fontSize: 9, color: "#1e1c18", letterSpacing: "0.08em", lineHeight: 1.8 },

  // FAB
  fab: { position: "fixed", bottom: 30, right: 22, width: 50, height: 50, borderRadius: "50%", background: "#141210", border: "1px solid #2a2620", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" },
  fabPlus: { fontSize: 24, color: "#c8b88a", lineHeight: 1 },

  // Write
  writeWrap: { flex: 1, padding: "0 22px" },
  writeLocLabel: { fontSize: 10, color: "#383530", letterSpacing: "0.1em", marginBottom: 20 },
  textareaWrap: { borderTop: "1px solid #1a1816", borderBottom: "1px solid #1a1816", marginBottom: 28 },
  textarea: { width: "100%", background: "transparent", border: "none", color: "#a8a49c", fontFamily: "'DM Mono', monospace", fontSize: 14, lineHeight: 1.9, padding: "18px 0 8px", resize: "none", minHeight: 150, outline: "none" },
  charBar: { height: 1, background: "#1a1816", marginBottom: 6 },
  charFill: { height: "100%", background: "#c8b88a", transition: "width 0.3s ease" },
  charNum: { textAlign: "right", fontSize: 9, color: "#282420", paddingBottom: 10, letterSpacing: "0.06em" },
  expiryLabel: { fontSize: 10, color: "#383530", letterSpacing: "0.12em", marginBottom: 14 },
  expiryOptions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 },
  expiryOpt: { background: "#0e0c0a", border: "1px solid #1a1816", borderRadius: 4, padding: "16px 14px", cursor: "pointer", textAlign: "left", transition: "border-color 0.2s, background 0.2s" },
  expiryOptActive: { borderColor: "#c8b88a", background: "#14120e" },
  expiryMain: { fontFamily: "'DM Mono', monospace", fontSize: 16, color: "#d4d0c8", marginBottom: 5, fontWeight: 400 },
  expirySub: { fontSize: 9, color: "#383530", letterSpacing: "0.08em" },
  postBtn: { width: "100%", padding: "15px", background: "#14120e", border: "1px solid #2a2620", color: "#c8b88a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4, transition: "opacity 0.2s" },
  postedWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 },
  postedMain: { fontSize: 20, color: "#e8e4dc", letterSpacing: "0.2em" },
  postedSub: { fontSize: 10, color: "#383530", letterSpacing: "0.12em" },

  // AR
  arRoot: { position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#0a0908" },
  arBg: { position: "absolute", inset: 0, transition: "filter 2s ease" },
  arGrid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a1816 1px, transparent 1px), linear-gradient(90deg, #1a1816 1px, transparent 1px)", backgroundSize: "48px 48px", opacity: 0.3 },
  arVignette: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 30%, #0a0908 90%)" },
  scanLine: { position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #c8b88a44, transparent)", boxShadow: "0 0 12px #c8b88a22" },
  arFloat: { position: "absolute", bottom: "22%", left: "50%", width: "82%", background: "rgba(10,9,8,0.88)", border: "1px solid #2a2620", borderRadius: 4, padding: "18px 20px", backdropFilter: "blur(8px)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,184,138,0.08)" },
  arBoxTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  arUID: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c8b88a", letterSpacing: "0.1em" },
  arTs: { fontSize: 9, color: "#2e2c28", letterSpacing: "0.06em" },
  arDivider: { height: 1, background: "linear-gradient(90deg, transparent, #2a2620, transparent)", margin: "12px 0" },
  arBodyText: { fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.95, color: "#d8d4cc", letterSpacing: "0.02em" },
  arBoxBot: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  arExpiry: { fontSize: 9, letterSpacing: "0.08em" },
  arTrailBtn: { fontSize: 9, color: "#c8b88a", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" },
  arClose: { position: "absolute", top: 20, right: 20, background: "rgba(10,9,8,0.7)", border: "1px solid #2a2620", color: "#383530", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  arDistBadge: { position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#383530", letterSpacing: "0.1em" },
  arDistPulse: { width: 6, height: 6, borderRadius: "50%", background: "#c8b88a", display: "block" },

  // Trail
  trailHeader: { padding: "24px 22px 20px", borderBottom: "1px solid #111" },
  trailUID: { fontFamily: "'DM Mono', monospace", fontSize: 18, color: "#c8b88a", letterSpacing: "0.08em" },
  trailSub: { fontSize: 10, color: "#2e2c28", marginTop: 4, letterSpacing: "0.08em" },
  trailList: { padding: "20px 22px 0" },
  trailRow: { display: "flex", gap: 16, cursor: "pointer" },
  trailLeft: { display: "flex", flexDirection: "column", alignItems: "center", width: 10 },
  trailDot: { width: 9, height: 9, borderRadius: "50%", background: "#c8b88a", flexShrink: 0, marginTop: 5, boxShadow: "0 0 6px #c8b88a55" },
  trailLine: { width: 1, flex: 1, background: "#2a2620", minHeight: 28, margin: "4px 0" },
  trailRight: { flex: 1, paddingBottom: 24 },
  trailRowMeta: { display: "flex", justifyContent: "space-between", marginBottom: 7 },
  trailTs: { fontSize: 9, color: "#2e2c28", letterSpacing: "0.06em" },
  trailDist: { fontSize: 9, color: "#383530" },
  trailText: { fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.9, color: "#7a7870" },

  // Delete
  deleteWrap: { flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column" },
  deleteTitle: { fontFamily: "'DM Mono', monospace", fontSize: 18, color: "#c8a898", letterSpacing: "0.08em", marginBottom: 20 },
  deleteDesc: { fontSize: 11, lineHeight: 2, color: "#3a3830", letterSpacing: "0.06em", whiteSpace: "pre-line", marginBottom: 28 },
  deletePreview: { fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.9, color: "#7a7870", padding: "16px 0", borderTop: "1px solid #1a1816", borderBottom: "1px solid #1a1816", marginBottom: 8 },
  deleteMeta: { fontSize: 9, color: "#252220", letterSpacing: "0.06em", marginBottom: 36 },
  deleteConfirmBtn: { width: "100%", padding: "14px", background: "#1a0e0e", border: "1px solid #3a1e1e", color: "#c88888", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4, marginBottom: 12 },
  deleteCancelBtn: { width: "100%", padding: "14px", background: "transparent", border: "1px solid #1a1816", color: "#383530", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 },

  // Notification
  notif: { position: "fixed", top: 14, left: 14, right: 14, zIndex: 200, background: "#121008", border: "1px solid #2a2620", borderRadius: 6, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.7)" },
  notifPulse: { width: 8, height: 8, borderRadius: "50%", background: "#c8b88a", flexShrink: 0 },
  notifTitle: { fontSize: 12, color: "#d4d0c8", letterSpacing: "0.04em" },
  notifMeta: { fontSize: 9, color: "#3a3830", marginTop: 3, letterSpacing: "0.06em" },
  notifOpen: { fontSize: 10, background: "#1e1a12", border: "1px solid #2a2620", color: "#c8b88a", padding: "5px 12px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.08em", whiteSpace: "nowrap" },
  notifDismiss: { fontSize: 11, background: "none", border: "none", color: "#2e2c28", cursor: "pointer", padding: "4px" },

  backBtn: { background: "none", border: "none", color: "#383530", fontSize: 11, padding: "22px 22px 14px", cursor: "pointer", letterSpacing: "0.08em", textAlign: "left" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 0; }
  textarea { caret-color: #c8b88a; }
  textarea::placeholder { color: #252220; font-family: 'DM Mono', monospace; }
  textarea:focus { outline: none; }
  button:focus { outline: none; }

  .fade-up { animation: fadeUp 0.45s ease both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

  .fade-in { animation: fadeIn 0.6s ease both; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

  .slide-down { animation: slideDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes slideDown { from { transform:translateY(-70px); opacity:0; } to { transform:translateY(0); opacity:1; } }

  .ar-emerge { animation: arEmerge 1s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes arEmerge { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0px); } }

  .scan { animation: scanMove 1.2s ease forwards; }
  @keyframes scanMove { from { top: 0; } to { top: 100%; } }

  .pulse-ring { animation: pulseRing 2s ease infinite; }
  @keyframes pulseRing { 0%,100% { box-shadow: 0 0 0 0 rgba(200,184,138,0.4); } 50% { box-shadow: 0 0 0 6px rgba(200,184,138,0); } }

  .loc-pulse { animation: locPulse 2s ease infinite; }
  @keyframes locPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;
