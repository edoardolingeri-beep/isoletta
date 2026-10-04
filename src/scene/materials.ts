import * as THREE from 'three';

// Palette "caramella": colori saturi e allegri, ispirati ai casual game.
export const COLORS = {
  sand: '#ffd88e',
  sandDark: '#f0b867',
  grass: '#86dc4f',
  grassDark: '#5cc23f',
  wood: '#c47a3c',
  woodLight: '#e0a466',
  woodDark: '#8b4e28',
  leaf: '#39c75c',
  leafLight: '#7be36a',
  leafDark: '#22a24a',
  red: '#ff4d6d',
  pink: '#ff86c0',
  yellow: '#ffd23f',
  straw: '#ffd06a',
  orange: '#ff9a3c',
  purple: '#8e5cff',
  violet: '#b07cff',
  blue: '#4aa8ff',
  mint: '#6fe3c8',
  white: '#fffaf2',
  rock: '#b9b6cc',
  rockDark: '#8f8ba8',
  skin: '#ffcfa0',
  dark: '#3a2e4f',
  soil: '#9a5b34',
  glass: '#bff3ff',
} as const;

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Materiale "plastica giocattolo" condiviso per colore. */
export function mat(color: string, opts: { rough?: number; emissive?: string; ei?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.rough ?? ''}|${opts.emissive ?? ''}|${opts.ei ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.55,
      metalness: 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.ei ?? 1,
    });
    cache.set(key, m);
  }
  return m;
}

/**
 * Materiale delle finestre/lanterne: si accende di notte.
 * È uno solo e condiviso, così il ciclo giorno/notte aggiorna un unico valore.
 */
export const glowMat = new THREE.MeshStandardMaterial({
  color: '#ffe8a6',
  emissive: '#ffbf3a',
  emissiveIntensity: 0.15,
  roughness: 0.4,
});

export function setNightGlow(night: number): void {
  glowMat.emissiveIntensity = 0.15 + night * 1.6;
}
