// Small fetch wrapper that attaches the JWT and throws on errors.
export const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
export const setSession = (token, user) => { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user)); };
export const clearSession = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); };

export async function api(path, method = "GET", body) {
  const res = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + (localStorage.getItem("token") || "") },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}
