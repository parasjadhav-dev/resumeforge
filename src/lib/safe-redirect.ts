/** Only allow same-site relative paths, to prevent open redirects. */
export function safeRedirect(path: unknown) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/dashboard";
}
