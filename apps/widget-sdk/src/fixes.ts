export function applyAccessibilityFixes(): void {
  fixMissingAltText();
  fixMissingAriaLabels();
  fixEmptyLinks();
}

function fixMissingAltText(): void {
  const images = document.querySelectorAll("img");

  images.forEach((image) => {
    if (!image.hasAttribute("alt")) {
      image.setAttribute("alt", "Image");
    }
  });
}

function fixMissingAriaLabels(): void {
  const buttons = document.querySelectorAll("button");

  buttons.forEach((button) => {
    const hasText = button.textContent?.trim();

    if (!hasText && !button.hasAttribute("aria-label")) {
      button.setAttribute("aria-label", "Button");
    }
  });
}

function fixEmptyLinks(): void {
  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    const hasText = link.textContent?.trim();

    if (!hasText) {
      link.textContent = "Link";
    }
  });
}
