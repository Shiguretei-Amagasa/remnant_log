import { useState, useEffect, useRef } from "react";
import {
  getUserUID,
  haversineDistance,
  loadNearbyRemnants,
  postRemnant,
  loadTrailByUID,
  deleteRemnant,
} from "./firebase.js";

const BASE = import.meta.env.BASE_URL;
const DURATION_OPTIONS = [
  { value: "week",    main: "1週間", sub: "7日後に消える" },
  { value: "forever", main: "永遠",  sub: "その場所に戻って消す" },
];

export default function RemnantLog() {
  const uid = getUserUID(); // 起動時に一度だけ取得
  const [view, setView]                 = useState("home");
  const [tab, setTab]                   = useState("nearby");
  const [remnants, setRemnants]         = useState([]);
  const [trailUID, setTrailUID]         = useState(null);
  const [trailItems, setTrailItems]     = useState([]);
  const [draft, setDraft]               = useState({ text: "", expires: null });
  const [charCount, setCharCount]       = useState(0);
  const [posted, setPosted]             = useState(false);
  const [notification, setNotification] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [gpsError, setGpsError]         = useState(null);
  const [currentPos, setCurrentPos]     = useState(null);
  const notifiedIds = useRef(new Set());

  const myRemnants    = remnants.filter(r => r.uid === uid);
  const otherRemnants = remnants.filter(r => r.uid !== uid);

  // 初回GPS + データ取得
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("このブラウザはGPSに対応していません");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setCurrentPos({ lat: latitude, lng: longitude });
        try {
          const data = await loadNearbyRemnants(latitude, longitude);
          setRemnants(data);
        } catch(e) { console.error('Firestore error:', e); }
        setLoading(false);
      },
      () => { setGpsError("位置情報の取得に失敗しました"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // 継続GPS監視（通知用）
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      async ({ coords: { latitude, longitude } }) => {
        setCurrentPos({ lat: latitude, lng: longitude });
        try {
          const data = await loadNearbyRemnants(latitude, longitude);
          setRemnants(data);
          // 自分以外の痕跡のみ通知
          for (const r of data) {
            if (r.uid === uid) continue;
            if (notifiedIds.current.has(r.id)) continue;
            if (r.distance <= 20) {
              notifiedIds.current.add(r.id);
              setNotification(r);
              break;
            }
          }
        } catch(e) { console.error(e); }
      },
      null,
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [uid]);

  // ARカメラを開く
  const openARCamera = () => {
    sessionStorage.setItem('remnant_nearby', JSON.stringify(remnants));
    sessionStorage.setItem('remnant_own_uid', uid);
    window.location.href = `${BASE}ar-view.html`;
  };

  const openTrail = async (targetUID) => {
    setTrailUID(targetUID);
    setTrailItems([]);
    setView("trail");
    const items = await loadTrailByUID(targetUID);
    setTrailItems(items);
  };

  const handlePost = async () => {
    if (!draft.text.trim() || !draft.expires || !currentPos) return;
    setPosted(true);
    try {
      await postRemnant({
        text: draft.text, expires: draft.expires,
        lat: currentPos.lat, lng: currentPos.lng, uid,
      });
      // 投稿後に再取得
      const data = await loadNearbyRemnants(currentPos.lat, currentPos.lng);
      setRemnants(data);
    } catch(e) { console.error('Post error:', e); }
    setTimeout(() => {
      setPosted(false);
      setDraft({ text: "", expires: null });
      setCharCount(0);
      setView("home");
      setTab("mine");
    }, 2200);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    // 「永遠」の場合は場所チェック
    if (deleteTarget.expires === "forever" && currentPos) {
      const dist = haversineDistance(
        currentPos.lat, currentPos.lng,
        deleteTarget.lat, deleteTarget.lng
      );
      if (dist > 30) {
        setDeleteError(`削除するにはその場所に戻る必要があります（現在${Math.round(dist)}m離れています）`);
        return;
      }
    }
    try {
      await deleteRemnant(deleteTarget.id);
      if (currentPos) {
        const data = await loadNearbyRemnants(currentPos.lat, currentPos.lng);
        setRemnants(data);
      }
    } catch(e) { console.error('Delete error:', e); }
    setDeleteTarget(null);
    setDeleteError(null);
    setView("home");
    setTab("mine");
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* 通知（他者の痕跡のみ） */}
      {notification && view === "home" && (
        <div style={S.notif} className="slide-down">
          <div style={S.notifPulse} className="pulse-ring" />
          <div style={{ flex: 1 }}>
            <div style={S.notifTitle}>{notification.distance}m先に、誰かの痕跡があります</div>
            <div style={S.notifMeta}>{notification.uid} · {notification.timestamp}</div>
          </div>
          <button style={S.notifOpen} onClick={() => { openARCamera(); setNotification(null); }}>開く</button>
          <button style={S.notifDismiss} onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* ══ HOME ══ */}
      {view === "home" && (
        <div style={S.screen}>
          <div style={S.header}>
            <img src={`${BASE}remnant_log_logo_wh.png`} alt="remnant log" style={S.logoImg} />
            <div style={S.locBadge}>
              <span style={{
                ...S.locDot,
                background: gpsError ? "#8a4a4a" : currentPos ? "#5a8a5a" : "#8a7a4a"
              }} className="loc-pulse" />
              <span style={S.locText}>
                {gpsError ? "GPS不可" : currentPos ? "GPS取得済" : "GPS取得中"}
              </span>
            </div>
          </div>

          <div style={S.tabBar}>
            {[["nearby","近くの痕跡"],["mine","自分の痕跡"]].map(([t,label]) => (
              <button key={t}
                style={{ ...S.tabBtn, ...(tab === t ? S.tabActive : {}) }}
                onClick={() => setTab(t)}>
                {label}
                {t === "mine" && myRemnants.length > 0 && (
                  <span style={S.tabCount}>{myRemnants.length}</span>
                )}
              </button>
            ))}
          </div>

          {loading && <div style={S.stateMsg}>位置情報を取得しています...</div>}
          {gpsError && <div style={S.errorMsg}>{gpsError}</div>}

          {/* 近くの痕跡タブ */}
          {tab === "nearby" && !loading && (
            <div style={S.list}>
              <div style={S.arBanner}>
                <div>
                  <div style={S.arBannerMain}>
                    {remnants.length > 0
                      ? `${remnants.length}件の痕跡が近くにあります`
                      : "近くに痕跡はありません"}
                  </div>
                  <div style={S.arBannerSub}>ARカメラで現実空間に表示します</div>
                </div>
                <button
                  style={{ ...S.arBtn, opacity: remnants.length > 0 && currentPos ? 1 : 0.3 }}
                  disabled={remnants.length === 0 || !currentPos}
                  onClick={openARCamera}>
                  ARカメラ
                </button>
              </div>

              {otherRemnants.length === 0 && (
                <div style={S.stateMsg}>近くに他の人の痕跡はありません</div>
              )}
              {otherRemnants.map((item, i) => (
                <div key={item.id}
                  style={{ ...S.card, animationDelay: `${i*60}ms` }}
                  className="fade-up">
                  <div style={S.cardMeta}>
                    <button style={S.uidBtn} onClick={() => openTrail(item.uid)}>
                      {item.uid}
                    </button>
                    <span style={S.cardDist}>{item.distance}m</span>
                    <span style={{
                      ...S.expiryBadge,
                      ...(item.expires === "forever" ? S.forever : S.week)
                    }}>
                      {item.expires === "forever" ? "永遠" : "1週間"}
                    </span>
                  </div>
                  <div style={S.cardTs}>{item.timestamp}</div>
                </div>
              ))}
            </div>
          )}

          {/* 自分の痕跡タブ */}
          {tab === "mine" && !loading && (
            <div style={S.list}>
              {myRemnants.length === 0 && (
                <div style={S.stateMsg}>まだ何も残していません</div>
              )}
              {myRemnants.map((item, i) => (
                <div key={item.id}
                  style={{ ...S.card, animationDelay: `${i*60}ms` }}
                  className="fade-up">
                  <div style={S.cardMeta}>
                    <span style={S.myTag}>自分</span>
                    <span style={S.cardDist}>
                      {item.distance === 0 ? "現在地" : `${item.distance}m`}
                    </span>
                    <span style={{
                      ...S.expiryBadge,
                      ...(item.expires === "forever" ? S.forever : S.week)
                    }}>
                      {item.expires === "forever" ? "永遠" : "1週間"}
                    </span>
                    <button style={S.deleteBtn} onClick={() => {
                      setDeleteTarget(item);
                      setDeleteError(null);
                      setView("delete_confirm");
                    }}>削除</button>
                  </div>
                  <div style={S.myCardText}>{item.text}</div>
                  <div style={S.cardTs}>{item.timestamp}</div>
                </div>
              ))}
              <div style={S.deleteNote}>永遠の痕跡は、その場所に戻ることで削除できます</div>
            </div>
          )}

          <button style={S.fab} onClick={() => setView("write")}>
            <span style={S.fabPlus}>＋</span>
          </button>
        </div>
      )}

      {/* ══ WRITE ══ */}
      {view === "write" && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => {
            setView("home");
            setDraft({ text: "", expires: null });
            setCharCount(0);
          }}>← 戻る</button>

          {posted ? (
            <div style={S.postedWrap} className="fade-in">
              <div style={S.postedMain}>残されました。</div>
              <div style={S.postedSub}>この場所に、あなたの想いが残ります。</div>
            </div>
          ) : (
            <div style={S.writeWrap}>
              <div style={S.writeLocLabel}>📍 現在地に残す</div>
              <div style={S.textareaWrap}>
                <textarea style={S.textarea}
                  placeholder={"今、ここで感じていることを残してください。"}
                  value={draft.text}
                  maxLength={100}
                  onChange={e => {
                    setDraft({ ...draft, text: e.target.value });
                    setCharCount(e.target.value.length);
                  }} />
                <div style={S.charBar}>
                  <div style={{ ...S.charFill, width: `${charCount}%` }} />
                </div>
                <div style={S.charNum}>{charCount} / 100</div>
              </div>

              <div style={S.expiryLabel}>この想いは、いつまで残しますか</div>
              <div style={S.expiryOptions}>
                {DURATION_OPTIONS.map(opt => (
                  <button key={opt.value}
                    style={{ ...S.expiryOpt, ...(draft.expires === opt.value ? S.expiryOptActive : {}) }}
                    onClick={() => setDraft({ ...draft, expires: opt.value })}>
                    <div style={S.expiryMain}>{opt.main}</div>
                    <div style={S.expirySub}>{opt.sub}</div>
                  </button>
                ))}
              </div>

              {!currentPos && (
                <div style={S.errorMsg}>GPS取得中です。しばらくお待ちください。</div>
              )}
              <button
                style={{ ...S.postBtn, opacity: draft.text.trim() && draft.expires && currentPos ? 1 : 0.25 }}
                disabled={!draft.text.trim() || !draft.expires || !currentPos}
                onClick={handlePost}>
                この場所に残す
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ TRAIL ══ */}
      {view === "trail" && trailUID && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => setView("home")}>← 戻る</button>
          <div style={S.trailHeader}>
            <div style={S.trailUID}>{trailUID}</div>
            <div style={S.trailSub}>の足跡 · {trailItems.length}地点</div>
          </div>
          <div style={S.trailList}>
            {trailItems.length === 0 && <div style={S.stateMsg}>読み込み中...</div>}
            {trailItems.map((item, i) => (
              <div key={item.id} style={S.trailRow} className="fade-up">
                <div style={S.trailLeft}>
                  <div style={S.trailDot} />
                  {i < trailItems.length - 1 && <div style={S.trailLine} />}
                </div>
                <div style={S.trailRight}>
                  <div style={S.trailRowMeta}>
                    <span style={S.trailTs}>{item.timestamp}</span>
                    <span style={{
                      ...S.expiryBadge,
                      ...(item.expires === "forever" ? S.forever : S.week),
                      fontSize: 9
                    }}>
                      {item.expires === "forever" ? "永遠" : "1週間"}
                    </span>
                  </div>
                  <div style={S.trailText}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {view === "delete_confirm" && deleteTarget && (
        <div style={S.screen}>
          <button style={S.backBtn} onClick={() => {
            setDeleteTarget(null);
            setDeleteError(null);
            setView("home");
          }}>← 戻る</button>
          <div style={S.deleteWrap}>
            <div style={S.deleteTitle}>本当に消しますか</div>
            <div style={S.deleteDesc}>
              {deleteTarget.expires === "forever"
                ? "「永遠」として残した痕跡です。\n削除するには、その場所に戻る必要があります。\n\n本当に消しますか。"
                : "この痕跡を削除します。\n元に戻すことはできません。"}
            </div>
            <div style={S.deletePreview}>{deleteTarget.text}</div>
            <div style={S.deleteMeta}>{deleteTarget.timestamp}</div>
            {deleteError && <div style={S.errorMsg}>{deleteError}</div>}
            <button style={S.deleteConfirmBtn} onClick={handleDeleteConfirm}>消す</button>
            <button style={S.deleteCancelBtn} onClick={() => {
              setDeleteTarget(null);
              setDeleteError(null);
              setView("home");
            }}>やっぱり残す</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  root: { background:"#0a0908", minHeight:"100vh", fontFamily:"'DM Mono','Courier New',monospace", color:"#ccc8c0", maxWidth:430, margin:"0 auto", position:"relative", overflowX:"hidden" },
  screen: { minHeight:"100vh", display:"flex", flexDirection:"column", paddingBottom:100 },
  header: { padding:"24px 22px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #151310" },
  logoImg: { height:28, width:"auto", objectFit:"contain" },
  locBadge: { display:"flex", alignItems:"center", gap:7, padding:"6px 10px", border:"1px solid #1c1a16", borderRadius:20 },
  locDot: { width:6, height:6, borderRadius:"50%", display:"block" },
  locText: { fontSize:9, color:"#3a3830", letterSpacing:"0.1em" },
  tabBar: { display:"flex", borderBottom:"1px solid #111" },
  tabBtn: { flex:1, padding:"13px", background:"none", border:"none", color:"#383530", fontSize:11, letterSpacing:"0.12em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  tabActive: { color:"#c8b88a", borderBottom:"1px solid #c8b88a", marginBottom:-1 },
  tabCount: { fontSize:9, background:"#2a2418", color:"#c8b88a", padding:"1px 5px", borderRadius:8, border:"1px solid #3a3020" },
  list: { flex:1 },
  arBanner: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 22px", borderBottom:"1px solid #151310", background:"#0e0c0a" },
  arBannerMain: { fontSize:12, color:"#d4d0c8", letterSpacing:"0.04em", marginBottom:4 },
  arBannerSub: { fontSize:9, color:"#2e2c28", letterSpacing:"0.08em" },
  arBtn: { background:"#1a1612", border:"1px solid #c8b88a", color:"#c8b88a", fontSize:11, letterSpacing:"0.15em", padding:"10px 16px", borderRadius:3, cursor:"pointer", flexShrink:0 },
  card: { padding:"16px 22px", borderBottom:"1px solid #0f0e0c" },
  cardMeta: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  uidBtn: { fontFamily:"'DM Mono',monospace", fontSize:10, color:"#c8b88a", background:"none", border:"1px solid #2e2a1e", borderRadius:3, padding:"2px 7px", cursor:"pointer", letterSpacing:"0.08em" },
  cardDist: { fontSize:10, color:"#353230", letterSpacing:"0.06em" },
  expiryBadge: { fontSize:9, padding:"2px 7px", borderRadius:3, letterSpacing:"0.08em" },
  forever: { color:"#b0a888", border:"1px solid #2e2a1e" },
  week: { color:"#6a7a6a", border:"1px solid #1e2a1e" },
  myTag: { fontSize:9, color:"#4a6a7a", border:"1px solid #1e2a30", padding:"2px 7px", borderRadius:3 },
  deleteBtn: { marginLeft:"auto", fontSize:9, color:"#6a3a3a", border:"1px solid #2a1a1a", background:"none", padding:"2px 8px", borderRadius:3, cursor:"pointer" },
  myCardText: { fontSize:13, lineHeight:1.9, color:"#b0aca4", marginTop:10 },
  cardTs: { fontSize:9, color:"#252220", marginTop:8, letterSpacing:"0.06em" },
  stateMsg: { padding:"48px 22px", fontSize:11, color:"#2e2c28", textAlign:"center", letterSpacing:"0.1em" },
  errorMsg: { margin:"16px 22px", fontSize:10, color:"#8a5a5a", letterSpacing:"0.06em", lineHeight:1.8 },
  deleteNote: { padding:"20px 22px", fontSize:9, color:"#1e1c18", letterSpacing:"0.08em", lineHeight:1.8 },
  fab: { position:"fixed", bottom:30, right:22, width:50, height:50, borderRadius:"50%", background:"#141210", border:"1px solid #2a2620", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  fabPlus: { fontSize:24, color:"#c8b88a", lineHeight:1 },
  notif: { position:"fixed", top:14, left:14, right:14, zIndex:200, background:"#121008", border:"1px solid #2a2620", borderRadius:6, padding:"13px 14px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.7)" },
  notifPulse: { width:8, height:8, borderRadius:"50%", background:"#c8b88a", flexShrink:0 },
  notifTitle: { fontSize:12, color:"#d4d0c8", letterSpacing:"0.04em" },
  notifMeta: { fontSize:9, color:"#3a3830", marginTop:3 },
  notifOpen: { fontSize:10, background:"#1e1a12", border:"1px solid #2a2620", color:"#c8b88a", padding:"5px 12px", borderRadius:3, cursor:"pointer", whiteSpace:"nowrap" },
  notifDismiss: { fontSize:11, background:"none", border:"none", color:"#2e2c28", cursor:"pointer", padding:"4px" },
  backBtn: { background:"none", border:"none", color:"#383530", fontSize:11, padding:"22px 22px 14px", cursor:"pointer", letterSpacing:"0.08em", textAlign:"left" },
  writeWrap: { flex:1, padding:"0 22px" },
  writeLocLabel: { fontSize:10, color:"#383530", letterSpacing:"0.1em", marginBottom:20 },
  textareaWrap: { borderTop:"1px solid #1a1816", borderBottom:"1px solid #1a1816", marginBottom:28 },
  textarea: { width:"100%", background:"transparent", border:"none", color:"#a8a49c", fontFamily:"'DM Mono',monospace", fontSize:14, lineHeight:1.9, padding:"18px 0 8px", resize:"none", minHeight:150, outline:"none" },
  charBar: { height:1, background:"#1a1816", marginBottom:6 },
  charFill: { height:"100%", background:"#c8b88a", transition:"width 0.3s ease" },
  charNum: { textAlign:"right", fontSize:9, color:"#282420", paddingBottom:10 },
  expiryLabel: { fontSize:10, color:"#383530", letterSpacing:"0.12em", marginBottom:14 },
  expiryOptions: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 },
  expiryOpt: { background:"#0e0c0a", border:"1px solid #1a1816", borderRadius:4, padding:"16px 14px", cursor:"pointer", textAlign:"left" },
  expiryOptActive: { borderColor:"#c8b88a", background:"#14120e" },
  expiryMain: { fontSize:16, color:"#d4d0c8", marginBottom:5 },
  expirySub: { fontSize:9, color:"#383530", letterSpacing:"0.08em" },
  postBtn: { width:"100%", padding:"15px", background:"#14120e", border:"1px solid #2a2620", color:"#c8b88a", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.2em", cursor:"pointer", borderRadius:4 },
  postedWrap: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 },
  postedMain: { fontSize:20, color:"#e8e4dc", letterSpacing:"0.2em" },
  postedSub: { fontSize:10, color:"#383530", letterSpacing:"0.12em" },
  trailHeader: { padding:"24px 22px 20px", borderBottom:"1px solid #111" },
  trailUID: { fontSize:18, color:"#c8b88a", letterSpacing:"0.08em" },
  trailSub: { fontSize:10, color:"#2e2c28", marginTop:4 },
  trailList: { padding:"20px 22px 0" },
  trailRow: { display:"flex", gap:16 },
  trailLeft: { display:"flex", flexDirection:"column", alignItems:"center", width:10 },
  trailDot: { width:9, height:9, borderRadius:"50%", background:"#c8b88a", flexShrink:0, marginTop:5, boxShadow:"0 0 6px #c8b88a55" },
  trailLine: { width:1, flex:1, background:"#2a2620", minHeight:28, margin:"4px 0" },
  trailRight: { flex:1, paddingBottom:24 },
  trailRowMeta: { display:"flex", justifyContent:"space-between", marginBottom:7, alignItems:"center" },
  trailTs: { fontSize:9, color:"#2e2c28", letterSpacing:"0.06em" },
  trailText: { fontSize:12, lineHeight:1.9, color:"#7a7870" },
  deleteWrap: { flex:1, padding:"20px 22px", display:"flex", flexDirection:"column" },
  deleteTitle: { fontSize:18, color:"#c8a898", letterSpacing:"0.08em", marginBottom:20 },
  deleteDesc: { fontSize:11, lineHeight:2, color:"#3a3830", letterSpacing:"0.06em", whiteSpace:"pre-line", marginBottom:28 },
  deletePreview: { fontSize:13, lineHeight:1.9, color:"#7a7870", padding:"16px 0", borderTop:"1px solid #1a1816", borderBottom:"1px solid #1a1816", marginBottom:8 },
  deleteMeta: { fontSize:9, color:"#252220", letterSpacing:"0.06em", marginBottom:36 },
  deleteConfirmBtn: { width:"100%", padding:"14px", background:"#1a0e0e", border:"1px solid #3a1e1e", color:"#c88888", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.2em", cursor:"pointer", borderRadius:4, marginBottom:12 },
  deleteCancelBtn: { width:"100%", padding:"14px", background:"transparent", border:"1px solid #1a1816", color:"#383530", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.2em", cursor:"pointer", borderRadius:4 },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { width:0; }
  textarea { caret-color:#c8b88a; }
  textarea::placeholder { color:#252220; font-family:'DM Mono',monospace; }
  textarea:focus { outline:none; }
  button:focus { outline:none; }
  .fade-up { animation:fadeUp 0.45s ease both; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
  .fade-in { animation:fadeIn 0.6s ease both; }
  @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
  .slide-down { animation:slideDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes slideDown { from{transform:translateY(-70px);opacity:0;}to{transform:translateY(0);opacity:1;} }
  .pulse-ring { animation:pulseRing 2s ease infinite; }
  @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(200,184,138,0.4);}50%{box-shadow:0 0 0 6px rgba(200,184,138,0);} }
  .loc-pulse { animation:locPulse 2s ease infinite; }
  @keyframes locPulse { 0%,100%{opacity:1;}50%{opacity:0.3;} }
`;
