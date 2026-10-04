import app from '../server/index.js';

// Vercel's Node runtime supplies Node request/response objects, which Express
// handles directly as a request listener.
export default function apiHandler(request, response) {
  return app(request, response);
}
