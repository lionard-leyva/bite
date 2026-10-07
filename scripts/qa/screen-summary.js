// Resume lo que hay en pantalla para los mensajes de error del QA (el log de CI no lleva capturas).
const MAX_TEXT = 60;
const MAX_FOREIGN = 5;

function summarize(nodes, pkg, max = 30) {
  const ours = [];
  const foreign = [];
  for (const n of nodes) {
    const label = (n.text || n.desc || '').trim().slice(0, MAX_TEXT);
    if (!label) continue;
    const bucket = n.pkg === pkg ? ours : foreign;
    const entry = n.pkg === pkg ? label : `[${n.pkg}] ${label}`;
    if (!bucket.includes(entry)) bucket.push(entry);
  }
  return [...ours.slice(0, max), ...foreign.slice(0, MAX_FOREIGN)];
}

function missingMessage(label, nodes, pkg) {
  const seen = summarize(nodes, pkg);
  return `No aparece "${label}". En pantalla: ${seen.length ? seen.join(' | ') : '(nada legible)'}`;
}

module.exports = { summarize, missingMessage };
