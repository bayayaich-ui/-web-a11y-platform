import { describe, expect, it } from 'vitest';
import { findHtmlLocation } from './run';

describe('findHtmlLocation', () => {
  it('returns one-based line and column for an HTML snippet', () => {
    const location = findHtmlLocation('<main>\n  <button>Envoyer</button>\n</main>', '<button>Envoyer</button>');

    expect(location).toEqual({ index: 9, line: 2, column: 3 });
  });

  it('returns null when the snippet is not present', () => {
    expect(findHtmlLocation('<main></main>', '<button></button>')).toBeNull();
  });
});