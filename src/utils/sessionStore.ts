/* --------------------------------------------------------
   In-memory home for everything the login response returns (user, role,
   profile, permissions, location scope, portal context).

   This used to live in localStorage. Now nothing about the signed-in user
   is written to the browser: the data is lost on reload and fetched again
   from /login/me/ with the HttpOnly auth cookie (see restoreAuthSession)
   before the app renders. Same getItem/setItem/removeItem shape as
   localStorage so readers stay synchronous.
-------------------------------------------------------- */
const memory = new Map<string, string>();

export const sessionStore = {
  getItem: (key: string): string | null => memory.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memory.set(key, value);
  },
  removeItem: (key: string): void => {
    memory.delete(key);
  },
};
