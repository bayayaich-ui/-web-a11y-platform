import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class BrowserPoolManager {
  private browser: Browser | null = null;
  private readonly maxContexts: number;
  private activeContexts: number = 0;

  constructor(maxContexts: number = 3) {
    this.maxContexts = maxContexts;
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

    if (this.activeContexts >= this.maxContexts) {
      throw new Error(`Limite de ${this.maxContexts} contextes simultanés atteinte.`);
    }

    // Un "context" isole les cookies/sessions entre deux scans différents,
    // même si le navigateur physique est partagé
    const context = await this.browser.newContext();
    const page = await context.newPage();
    this.activeContexts++;

    return { page, context };
  }

  // Libère une page après usage, sans fermer le navigateur entier
  async releasePage(context: BrowserContext): Promise<void> {
    await context.close();
    this.activeContexts--;
  }

  // Ferme complètement le navigateur (à la fin de tous les scans)
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}