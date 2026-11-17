(function () {
  let cachedDb = null;

  async function ensureDb() {
    if (cachedDb) return cachedDb;
    try {
      if (typeof firebase === "undefined") return null;

      let cfg = window.BACKEND_CONFIG || window.FESTINGER_BACKEND_CONFIG;
      if (!cfg || !cfg.firebaseConfig || !cfg.firebaseConfig.apiKey) {
        try {
          const cached = JSON.parse(sessionStorage.getItem("festinger_backend_config") || "null");
          if (cached && cached.firebaseConfig && cached.firebaseConfig.apiKey) cfg = cached;
        } catch (_) {}
      }
      if ((!cfg || !cfg.firebaseConfig || !cfg.firebaseConfig.apiKey) && typeof window.loadBackendEnv === "function") {
        try {
          cfg = await window.loadBackendEnv("https://api-festinger.vercel.app/.env");
        } catch (_) {}
      }
      if (!cfg || !cfg.firebaseConfig || !cfg.firebaseConfig.apiKey) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch("https://api-festinger.vercel.app/api/config");
            if (res.ok) {
              cfg = await res.json();
              break;
            }
          } catch (_) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }
      if (cfg && cfg.firebaseConfig && cfg.firebaseConfig.apiKey) {
        try {
          sessionStorage.setItem("festinger_backend_config", JSON.stringify(cfg));
        } catch (_) {}
      }

      if (!firebase.apps || firebase.apps.length === 0) {
        if (cfg && cfg.firebaseConfig && cfg.firebaseConfig.apiKey) {
          firebase.initializeApp(cfg.firebaseConfig);
        } else {
          return null;
        }
      }
      cachedDb = firebase.firestore();
      return cachedDb;
    } catch (err) {
      console.error("Firebase DB connection error:", err);
      return null;
    }
  }

  async function loadDoc(docName) {
    const db = await ensureDb();
    if (!db || !docName) return [];
    try {
      const snap = await db.collection("festinger_data").doc(docName).get();
      if (snap.exists) {
        const data = snap.data();
        if (data && Array.isArray(data.items)) {
          return data.items;
        }
      }
      return [];
    } catch (err) {
      console.error(`Firebase loadDoc(${docName}) error:`, err);
      return [];
    }
  }

  async function saveDoc(docName, items) {
    const db = await ensureDb();
    if (!db || !docName || !Array.isArray(items)) return false;
    try {
      await db.collection("festinger_data").doc(docName).set({
        items,
        updatedAt: Date.now()
      });
      return true;
    } catch (err) {
      console.error(`Firebase saveDoc(${docName}) error:`, err);
      return false;
    }
  }

  async function loadAll() {
    const [owners, roles, duties, fests] = await Promise.all([
      loadDoc("owners"),
      loadDoc("roles"),
      loadDoc("duties"),
      loadDoc("fests")
    ]);
    return { owners, roles, duties, fests };
  }

  window.FestingerDB = {
    ensureDb,
    loadDoc,
    saveDoc,
    loadAll
  };
})();
