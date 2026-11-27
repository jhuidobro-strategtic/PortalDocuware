/** @jest-environment node */
import { readDocumentResponse } from "./document-response";

test("explains an HTML server error without exposing the JSON parser exception", async () => {
  await expect(readDocumentResponse({ status: 500, json: async () => { throw new SyntaxError("Unexpected token '<'"); } }))
    .rejects.toThrow("No fue posible consultar los documentos (HTTP 500)");
});

test("preserves valid paginated responses and structured API errors", async () => {
  const payload = { success: true, data: [], pagination: { count: 0, page: 1 } };
  await expect(readDocumentResponse({ status: 200, json: async () => payload })).resolves.toEqual(payload);
  const error = { success: false, message: "Tu sesión ha vencido" };
  await expect(readDocumentResponse({ status: 401, json: async () => error })).resolves.toEqual(error);
});

test("rejects JSON responses that are not API objects", async () => {
  for (const value of [null, [], "Unavailable"]) {
    await expect(readDocumentResponse({ status: 502, json: async () => value })).rejects.toThrow("HTTP 502");
  }
});
