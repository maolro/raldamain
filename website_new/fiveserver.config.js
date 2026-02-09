// fiveserver.config.js
module.exports = {
  // This middleware intercepts requests in VS Code
  middleware: [
    (req, res, next) => {
      // 0. Handle "/reglas" -> serve "reglas.html"
      if (req.url === '/reglas') {
        req.url = '/reglas.html';
      }
      // 1. Handle "/rango/magia_fuego" -> serve "view-rango.html"
      else if (req.url.startsWith('/rango/') && !req.url.includes('.')) {
        req.url = '/templates/view-rango.html';
      }
      // 2. Handle "/rangos" -> serve "rangos.html"
      else if (req.url === '/rangos') {
        req.url = '/rangos.html';
      }
      // 3. Handle "/criatura/esqueleto" -> serve "view-criatura.html"
      else if (req.url.startsWith('/criatura/') && !req.url.includes('.')) {
        req.url = '/templates/view-criatura.html';
      }
      // 4. Handle "/criaturas" -> serve "criaturas.html"
      else if (req.url === '/criaturas') {
        req.url = '/criaturas.html';
      }
      // 5. Handle "/mundo" -> serve "mundo.html"
      else if (req.url === '/mundo') {
        req.url = '/mundo.html';
      }
      // 6. Handle "/mundo/categoria/naciones" -> serve "view-mundo-categoria.html"
      else if (req.url.startsWith('/mundo/categoria/') && !req.url.includes('.')) {
        req.url = '/templates/view-mundo-categoria.html';
      }
      // 7. Handle "/mundo/articulo/feyn" -> serve "view-mundo-articulo.html"
      else if (req.url.startsWith('/mundo/articulo/') && !req.url.includes('.')) {
        req.url = '/templates/view-mundo-articulo.html';
      }
      // 8. Handle "/equipo/espada_larga" -> serve "view-equipo.html"
      else if (req.url.startsWith('/equipo/') && !req.url.includes('.')) {
        req.url = '/templates/view-equipo.html';
      }
      // 9. Handle "/equipos" -> serve "equipos.html"
      else if (req.url === '/equipos') {
        req.url = '/equipos.html';
      }
      // 10. Handle "/creador" -> serve "creador.html"
      else if (req.url === '/creador') {
        req.url = '/creador.html';
      }
      next();
    }
  ]
};