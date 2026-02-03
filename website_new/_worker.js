// Cloudflare Worker para manejar clean URLs
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Map clean URLs to .html files
    const routes = {
      '/reglas': '/reglas.html',
      '/rangos': '/rangos.html',
      '/criaturas': '/criaturas.html',
      '/equipos': '/equipos.html',
      '/mundo': '/mundo.html'
    };

    // Check if path matches a route
    if (routes[path]) {
      url.pathname = routes[path];
      return fetch(url.toString(), request);
    }

    // Handle dynamic routes
    if (path.startsWith('/rango/')) {
      url.pathname = '/_rango.html';
      return fetch(url.toString(), request);
    }
    if (path.startsWith('/criatura/')) {
      url.pathname = '/_criatura.html';
      return fetch(url.toString(), request);
    }
    if (path.startsWith('/equipo/')) {
      url.pathname = '/_equipo.html';
      return fetch(url.toString(), request);
    }
    if (path.startsWith('/mundo/categoria/')) {
      url.pathname = '/_mundo_categoria.html';
      return fetch(url.toString(), request);
    }
    if (path.startsWith('/mundo/articulo/')) {
      url.pathname = '/_mundo_articulo.html';
      return fetch(url.toString(), request);
    }

    // Default: pass through
    return fetch(request);
  }
};
