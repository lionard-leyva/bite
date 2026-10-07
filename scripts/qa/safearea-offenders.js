// Regla de SAF-01: elementos de Bite que se solapan con la status bar o la barra de navegacion/gestos.
const q = require('./adb');

// Tolerancia en px: bordes/sombras de 1-5 px bajo el inset no son contenido tapado (falso positivo).
const TOL = 6;

function offenders(xml, top, bottom, screenH) {
  return q.parseNodes(xml).filter((n) => {
    if (n.pkg !== q.PKG || n.y2 <= n.y1) return false;
    if (!(n.clickable || n.text || n.desc)) return false;
    // Cortado por el borde inferior: el contenido sigue fuera de pantalla y se alcanza con scroll.
    if (n.y2 >= screenH) return false;
    if ((n.y2 - n.y1) > screenH * 0.6) return false; // contenedores y el mapa a pantalla completa
    // Contenedor clicable sin texto ni descripcion (fondo de pantalla/scroll): no es contenido visible.
    if (!n.text && !n.desc && (n.y2 - n.y1) > screenH * 0.3) return false;
    return n.y1 < top - TOL || n.y2 > screenH - bottom + TOL;
  });
}

module.exports = { offenders };
