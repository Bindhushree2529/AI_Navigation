// In-memory Redis replacement — no Redis required
const store = new Map<string, { value: string; expiresAt?: number }>();
const listeners = new Map<string, Set<(channel: string, message: string) => void>>();

function isExpired(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return true;
  }
  return false;
}

function makeClient() {
  const patternListeners = new Map<string, Set<(pattern: string, channel: string, message: string) => void>>();

  return {
    get: async (key: string) => (isExpired(key) ? null : store.get(key)?.value ?? null),
    set: async (key: string, value: string) => { store.set(key, { value }); return "OK"; },
    setex: async (key: string, ttl: number, value: string) => {
      store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
      return "OK";
    },
    del: async (key: string) => { store.delete(key); return 1; },
    publish: async (channel: string, message: string) => {
      // notify exact listeners
      listeners.get(channel)?.forEach((fn) => fn(channel, message));
      // notify pattern listeners
      patternListeners.forEach((fns, pattern) => {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        if (regex.test(channel)) fns.forEach((fn) => fn(pattern, channel, message));
      });
      return 1;
    },
    subscribe: async (channel: string, fn: (ch: string, msg: string) => void) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel)!.add(fn);
    },
    psubscribe: async (...patterns: string[]) => {
      // stored on instance, used via on("pmessage")
      (makeClient as any)._patterns = patterns;
    },
    on: (event: string, fn: (...args: any[]) => void) => {
      if (event === "pmessage") {
        // register fn as pattern listener for all patterns
        ["location:*", "sos:*", "user:*:session"].forEach((pattern) => {
          if (!patternListeners.has(pattern)) patternListeners.set(pattern, new Set());
          patternListeners.get(pattern)!.add(fn);
        });
      }
    },
    lazyConnect: true,
  };
}

export const redis = makeClient();
export const redisSub = makeClient();
export const redisPub = makeClient();
