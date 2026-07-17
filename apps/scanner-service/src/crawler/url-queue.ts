export interface QueuedUrl {
    url: string;
    depth: number;
  }
  
  export class UrlQueue {
    private queue: QueuedUrl[] = [];
    private visited = new Set<string>();
    private readonly maxDepth: number;
    private readonly maxPages: number;
  
    constructor(maxDepth: number = 3, maxPages: number = 50) {
      this.maxDepth = maxDepth;
      this.maxPages = maxPages;
    }
  
    add(url: string, depth: number): void {
      const normalized = url.replace(/\/$/, '');
  
      if (this.visited.has(normalized)) return;      // déduplication
      if (depth > this.maxDepth) return;               // limite de profondeur
      if (this.visited.size >= this.maxPages) return;  // limite globale de pages
  
      this.visited.add(normalized);
      this.queue.push({ url: normalized, depth });
    }
  
    next(): QueuedUrl | undefined {
      return this.queue.shift();
    }
  
    get isEmpty(): boolean {
      return this.queue.length === 0;
    }
  
    get visitedCount(): number {
      return this.visited.size;
    }
  }
  