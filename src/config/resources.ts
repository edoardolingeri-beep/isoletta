// Risorse del gioco. L'ordine qui è anche l'ordine di visualizzazione nella HUD.
export const RESOURCE_IDS = ['wood', 'fish', 'shell', 'coin'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

/** Una quantità di risorse (costi, produzione, ricompense...). */
export type Bundle = Partial<Record<ResourceId, number>>;

export interface ResourceDef {
  name: string;
  /** Colore usato per particelle e numeri che salgono. */
  color: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  wood: { name: 'Legna', color: '#c47a3c' },
  fish: { name: 'Pesce', color: '#4aa8ff' },
  shell: { name: 'Conchiglie', color: '#ff7eb6' },
  coin: { name: 'Monete', color: '#ffc21a' },
};
