import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class BrowserPoolManager {
  private browser: Browser | null = null;
  private readonly maxContexts: number;
  private activeContexts: number = 0;

  constructor(maxContexts: number = 3) {
    this.maxContexts = maxContexts;
  }

  get concurrency(): number {
    return this.maxContexts;
  }

  // Démarre l'instance de navigateur partagée (une seule pour tout le pool)
  async initialize(): Promise<void> {
    if (this.browser) return; // déjà démarré, on ne relance pas

    this.browser = await chromium.launch({
      headless: true,
    });
  }

  // Fournit une page prête à l'emploi, réutilisant le navigateur déjà lancé
  async acquirePage(): Promise<{ page: Page; context: BrowserContext }> {
    if (!this.browser) {
      throw new Error('Le pool n\'est pas initialisé. Appelle initialize() d\'abord.');
    }

    // Jobs de pages sont lancés par lots; attendre ici évite de transformer
    // une saturation normale du pool en échec de page.
    while (this.activeContexts >= this.maxContexts) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Un "context" isole les cookies/sessions entre deux scans différents,
    // même si le navigateur physique est partagé
    const context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    // augmenter le timeout par défaut pour les navigations
    page.setDefaultNavigationTimeout(30000);
    this.activeContexts++;

    return { page, context };
  }

  // Libère une page après usage, sans fermer le navigateur entier
  async releasePage(context: BrowserContext): Promise<void> {
    await context.close();
    this.activeContexts = Math.max(0, this.activeContexts - 1);
  }

  // Ferme complètement le navigateur (à la fin de tous les scans)
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}