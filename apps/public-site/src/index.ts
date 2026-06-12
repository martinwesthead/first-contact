export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response("Hello from 1stcontact.io", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
} satisfies ExportedHandler;
