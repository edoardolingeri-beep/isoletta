// Numeri "globali" di bilanciamento e ritmo del gioco.
export const BALANCE = {
  /** Monete al minuto prodotte da ogni abitante (lavoro). */
  coinPerInhabitantPerMinute: 1,
  /** Ogni punto bellezza aumenta la produzione di monete di questa frazione. */
  beautyCoinBonus: 0.03,
  /** Guadagni offline: massimo di ore conteggiate e frazione della produzione (gli isolani lavorano più piano senza di te). */
  offlineMaxHours: 6,
  offlineRate: 0.6,
  /** Popup "bentornato" solo dopo almeno questi secondi di assenza. */
  offlineMinSeconds: 60,
  /** Ogni quanti secondi gli edifici "consegnano" la produzione (con numerino che sale). */
  deliverEverySec: 4,
  /** Durata di un giorno completo (giorno + notte) in secondi. */
  dayLengthSec: 360,
  /** Barche di turisti: intervallo base e minimo fra un passaggio e l'altro. */
  boatIntervalSec: 30,
  boatIntervalMinSec: 10,
  /** Mancia quando si tocca una barca: base + per punto bellezza. */
  boatTipBase: 8,
  boatTipPerBeauty: 3,
  /** Pioggia: probabilità per minuto e durata. */
  rainChancePerMinute: 0.18,
  rainDurationSec: 45,
  /** Massimo abitanti mostrati che camminano (per prestazioni). */
  maxVisibleVillagers: 12,
};
