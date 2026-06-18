if (typeof window !== "undefined" && !window.storage) {
  const useApi = import.meta.env.PROD;

  async function apiGet(key) {
    const r = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if (r.status === 503) return null;
    if (!r.ok) throw new Error(`Storage GET failed: ${r.status}`);
    const data = await r.json();
    if (data.value == null) return null;
    return {
      value: typeof data.value === "string" ? data.value : JSON.stringify(data.value),
    };
  }

  async function apiSet(key, value) {
    const r = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) throw new Error(`Storage PUT failed: ${r.status}`);
  }

  window.storage = useApi
    ? {
        async get(key) {
          try {
            return await apiGet(key);
          } catch (err) {
            console.error("[storage]", err);
            return null;
          }
        },
        async set(key, value) {
          await apiSet(key, value);
        },
      }
    : {
        async get(key) {
          const value = localStorage.getItem(`canticos:${key}`);
          return value != null ? { value } : null;
        },
        async set(key, value) {
          localStorage.setItem(`canticos:${key}`, value);
        },
      };
}
