// Cloudflare Workers runtime API used by the Express adapter.
// https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/#handleasnoderequest
declare module 'cloudflare:node' {
  export function handleAsNodeRequest(port: number, request: Request): Promise<Response>;
}
