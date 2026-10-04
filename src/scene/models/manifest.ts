// Sostituzione dei modelli procedurali con file .glb.
//
// Per usare un modello fatto in Blender (o scaricato), mettilo in
// `public/models/` e aggiungi qui una riga con la stessa chiave del modello
// procedurale. Esempio:
//
//   'building.hut.1': 'models/capanna-1.glb',
//
// Convenzioni da rispettare nel file .glb:
// - origine alla base dell'oggetto (y = 0 è il terreno)
// - "davanti" verso +Z (il molo si allunga verso +X)
// - 1 unità = 1 metro circa (un omino è alto ~1)
// Le chiavi disponibili sono elencate in `procedural.ts` (oggetto PROCEDURAL).
export const GLB_MANIFEST: Record<string, string> = {
  // 'building.hut.1': 'models/capanna-1.glb',
};
