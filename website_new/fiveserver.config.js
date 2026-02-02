// fiveserver.config.js
module.exports = {
  // This middleware intercepts requests in VS Code
  middleware: [
    (req, res, next) => {
      // 1. Handle "/rango/magia_fuego" -> serve "rango.html"
      if (req.url.startsWith('/rango/') && !req.url.includes('.')) {
        req.url = '/rango.html';
      }
      // 2. Handle "/rangos" -> serve "rangos.html"
      else if (req.url === '/rangos') {
        req.url = '/rangos.html';
      }
      // 3. Handle "/criatura/esqueleto" -> serve "criatura.html"
      else if (req.url.startsWith('/criatura/') && !req.url.includes('.')) {
        req.url = '/criatura.html';
      }
      // 4. Handle "/criaturas" -> serve "criaturas.html"
      else if (req.url === '/criaturas') {
        req.url = '/criaturas.html';
      }
      // 5. Handle "/mundo" -> serve "mundo.html"
      else if (req.url === '/mundo') {
        req.url = '/mundo.html';
      }
      // 6. Handle "/mundo/categoria/naciones" -> serve "mundo_categoria.html"
      else if (req.url.startsWith('/mundo/categoria/') && !req.url.includes('.')) {
        req.url = '/mundo_categoria.html';
      }
      // 7. Handle "/mundo/articulo/feyn" -> serve "mundo_articulo.html"
      else if (req.url.startsWith('/mundo/articulo/') && !req.url.includes('.')) {
        req.url = '/mundo_articulo.html';
      }
      next();
    }
  ]
};