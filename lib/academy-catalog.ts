export interface AcademyCatalogEntry {
  code: string;
  title: string;
  level: string;
  path: string;
  domain: string;
}

const rows = [
  "A1-01|Comprendre les marchés financiers|Débutant",
  "A1-02|Les sessions de trading|Débutant",
  "A1-03|Courtiers, plateformes et sécurité|Débutant",
  "A1-04|Le vocabulaire du trader|Débutant",
  "B1-01|Lire les graphiques|Débutant",
  "B1-02|Figures et configurations|Débutant",
  "B1-03|Indicateurs techniques|Intermédiaire",
  "B1-04|Price action et structure de marché|Intermédiaire",
  "B1-05|Outils avancés|Avancé",
  "B1-06|Multi-unités de temps et timing|Intermédiaire",
  "C1-01|Macroéconomie pour traders|Intermédiaire",
  "C1-02|Banques centrales et taux|Intermédiaire",
  "C1-03|Calendrier économique et news|Intermédiaire",
  "C1-04|Corrélations et sentiment|Avancé",
  "D1-01|Les bases du risque|Débutant",
  "D1-02|Taille de position et levier|Intermédiaire",
  "D1-03|Statistiques du trader|Intermédiaire",
  "D1-04|Portefeuille et corrélation|Avancé",
  "D1-05|Scénarios de crise|Avancé",
  "E1-01|Biais et émotions|Débutant",
  "E1-02|Discipline et routines|Intermédiaire",
  "E1-03|Le journal de trading|Intermédiaire",
  "E1-04|Résilience|Avancé",
  "F1-01|Construire son plan de trading|Intermédiaire",
  "F1-02|Styles de trading|Intermédiaire",
  "F1-03|Backtesting et forward testing|Avancé",
  "F1-04|Métriques et optimisation|Avancé",
  "F1-05|Automatisation|Avancé",
  "G1-01|Les bases du Forex|Débutant",
  "G1-02|Sessions et liquidité sur le Forex|Débutant",
  "G1-03|Fondamentaux des devises|Intermédiaire",
  "G1-04|Stratégies Forex|Intermédiaire",
  "G1-05|Forex avancé|Avancé",
  "G2-01|Comprendre les indices|Débutant",
  "G2-02|Les grands indices du monde|Débutant",
  "G2-03|Trader les indices|Intermédiaire",
  "G2-04|Volatilité et VIX|Intermédiaire",
  "G2-05|Stratégies sur indices|Avancé",
  "G3-01|Les bases des matières premières|Débutant",
  "G3-02|Marchés à terme et courbes|Intermédiaire",
  "G3-03|Énergie|Intermédiaire",
  "G3-04|Métaux|Intermédiaire",
  "G3-05|Agricoles|Intermédiaire",
  "G3-06|Stratégies sur matières premières|Avancé",
  "G4-01|Les bases de la bourse|Débutant",
  "G4-02|Analyser une entreprise|Intermédiaire",
  "G4-03|Valorisation et résultats|Intermédiaire",
  "G4-04|Trader les actions|Intermédiaire",
  "G4-05|Bourses régionales et Bourse de Tunis|Intermédiaire",
  "G5-01|Blockchain et Bitcoin|Débutant",
  "G5-02|L’écosystème crypto|Débutant",
  "G5-03|Plateformes, wallets et sécurité|Débutant",
  "G5-04|Analyse on-chain et tokenomics|Intermédiaire",
  "G5-05|Trader les cryptos|Intermédiaire",
  "G5-06|Risques et réglementation|Intermédiaire",
  "G6-01|Comprendre les ETF|Débutant",
  "G6-02|Les familles d’ETF|Débutant",
  "G6-03|ETF à effet de levier et inversés|Avancé",
  "G6-04|Trader les ETF|Intermédiaire",
  "G6-05|Construire une allocation|Intermédiaire",
  "G7-01|Les bases des contrats à terme|Débutant",
  "G7-02|Futures sur indices, devises et taux|Intermédiaire",
  "G7-03|Futures sur matières premières|Intermédiaire",
  "G7-04|Expiration, roll et micro-contrats|Avancé",
  "G7-05|COT, volume et order flow|Avancé",
  "H1-01|Options et produits dérivés (introduction)|Avancé",
  "H1-02|Trading algorithmique et données|Expert",
  "H1-03|Allocation d’actifs et portefeuille|Avancé",
  "H1-04|Cadre juridique et fiscal|Intermédiaire",
  "H1-05|Prop firms et financement|Avancé",
  "H1-06|Le trading comme activité professionnelle|Expert",
];

export const ACADEMY_CATALOG: AcademyCatalogEntry[] = rows.map((row) => {
  const [code, title, level] = row.split("|");
  const path = code.slice(0, code.indexOf("-"));
  return { code, title, level, path, domain: path[0] };
});

export function academyCatalogEntry(code: string): AcademyCatalogEntry | undefined {
  return ACADEMY_CATALOG.find((course) => course.code === code);
}
