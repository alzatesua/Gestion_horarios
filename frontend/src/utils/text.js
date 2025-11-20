  // utils/text.js
export function twoInitials(name = '') {
  const clean = String(name).trim();
  if (!clean) return '??';

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    // Un solo nombre: toma las dos primeras letras
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Dos o más palabras: primera letra de las dos primeras
  return (parts[0][0] + parts[1][0]).toUpperCase();
}