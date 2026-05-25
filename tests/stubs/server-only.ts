// Vitest stub for the Next.js `server-only` guard package. Empty on
// purpose — its only job in production is to fail the Next bundler if
// a server-only module ends up in a client bundle. At test time there
// is no bundler to fail, so a no-op satisfies the import.
export {};
