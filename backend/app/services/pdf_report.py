import struct
import zlib
from pathlib import Path
from textwrap import wrap

PAGE_W, PAGE_H = 595, 842
NAVY, BLUE, TEAL, INK, MUTED, PALE, BORDER = '#102d4f', '#1457a6', '#16b8b0', '#132238', '#4b5d73', '#f4f7fb', '#d9e2ee'
SEVERITY = {'critical': ('Critical', '#b42318'), 'serious': ('Serious', '#d97706'), 'moderate': ('Moderate', '#1457a6'), 'minor': ('Minor', '#087443')}


def _pdf_escape(value: str) -> str:
    return str(value).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _rgb(hex_value: str) -> str:
    return ' '.join(str(round(int(hex_value[index:index + 2], 16) / 255, 4)) for index in (1, 3, 5))


def _png_pixels(path: Path) -> tuple[int, int, bytes, bytes | None]:
    raw = path.read_bytes()
    width, height, depth, color_type, _, _, interlace = struct.unpack('>IIBBBBB', raw[16:29])
    if depth != 8 or interlace or color_type not in (2, 6):
        raise ValueError('The report logo must be a non-interlaced RGB/RGBA PNG')
    position, compressed = 8, bytearray()
    while position < len(raw):
        length = struct.unpack('>I', raw[position:position + 4])[0]
        if raw[position + 4:position + 8] == b'IDAT': compressed.extend(raw[position + 8:position + 8 + length])
        position += length + 12
    channels, stride = (4 if color_type == 6 else 3), width * (4 if color_type == 6 else 3)
    decoded, previous, data, offset = bytearray(), bytearray(stride), zlib.decompress(compressed), 0
    for _ in range(height):
        filter_type, scanline = data[offset], bytearray(data[offset + 1:offset + 1 + stride]); offset += stride + 1
        for index in range(stride):
            left = scanline[index - channels] if index >= channels else 0; up = previous[index]; upper_left = previous[index - channels] if index >= channels else 0
            if filter_type == 1: scanline[index] = (scanline[index] + left) & 255
            elif filter_type == 2: scanline[index] = (scanline[index] + up) & 255
            elif filter_type == 3: scanline[index] = (scanline[index] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                estimate = left + up - upper_left; distances = abs(estimate - left), abs(estimate - up), abs(estimate - upper_left)
                scanline[index] = (scanline[index] + (left if distances[0] <= distances[1] and distances[0] <= distances[2] else up if distances[1] <= distances[2] else upper_left)) & 255
        decoded.extend(scanline); previous = scanline
    rgb, alpha = bytearray(), bytearray()
    for index in range(0, len(decoded), channels):
        rgb.extend(decoded[index:index + 3])
        if channels == 4: alpha.append(decoded[index + 3])
    return width, height, zlib.compress(bytes(rgb)), zlib.compress(bytes(alpha)) if channels == 4 else None


class _PdfCanvas:
    def __init__(self, data: dict):
        self.data, self.pages, self.commands, self.y = data, [], [], 0
        self.new_page(cover=True)

    def new_page(self, cover=False):
        if self.commands: self.pages.append(self.commands)
        self.commands, self.y = [], 790 if cover else 766
        if not cover:
            self.commands += [f'{_rgb(NAVY)} rg', '0 810 595 32 re f', f'{_rgb(BLUE)} rg', '50 794 m 545 794 l 1.2 w S']
            self.text(50, 821, 'AccessIQ', 10, 'F2', '#ffffff'); self.text(545, 821, 'ACCESSIBILITY AUDIT', 7, 'F1', '#c6d8e9', 'right')

    def text(self, x, y, value, size=10, font='F1', color=INK, align=None):
        value = _pdf_escape(value).encode('cp1252', errors='replace').decode('latin-1')
        adjustment = f'{-len(value) * size * 0.26:.1f} 0 Td' if align == 'right' else ''
        self.commands += ['BT', f'/{font} {size} Tf', f'{_rgb(color)} rg', f'{x} {y} Td', adjustment, f'({value}) Tj', 'ET']

    def rect(self, x, y, width, height, fill, stroke=None):
        self.commands += [f'{_rgb(fill)} rg', f'{x} {y} {width} {height} re f']
        if stroke: self.commands += [f'{_rgb(stroke)} RG', '0.8 w', f'{x} {y} {width} {height} re S']

    def section(self, title, kicker):
        self.text(50, self.y, kicker.upper(), 8, 'F2', BLUE); self.text(50, self.y - 25, title, 23, 'F2', NAVY); self.y -= 58

    def wrapped(self, x, y, value, width=88, size=10, leading=14, color=MUTED, font='F1'):
        for line in wrap(str(value or 'Not specified'), width) or ['Not specified']:
            self.text(x, y, line, size, font, color); y -= leading
        return y

    def footer(self, number):
        self.commands += [f'{_rgb(BORDER)} RG', '50 38 m 545 38 l 0.7 w S']
        self.text(50, 22, 'AccessIQ  |  Web accessibility platform', 7, 'F1', MUTED)
        self.text(545, 22, f"{self.data['website_url']}  |  {self.data['scan_date'][:10]}  |  Page {number} / {{pages}}", 7, 'F1', MUTED, 'right')

    def build(self):
        self.pages.append(self.commands)
        return self.pages


def build_report_pdf(data: dict) -> bytes:
    """Build a client-ready A4 report without changing scan or scoring logic."""
    canvas, score = _PdfCanvas(data), data.get('score')
    logo_path = Path(__file__).resolve().parents[3] / 'apps' / 'web-dashboard' / 'public' / 'dashboard-logo.png'
    canvas.rect(0, 0, PAGE_W, PAGE_H, NAVY); canvas.rect(50, 680, 126, 126, '#ffffff'); canvas.commands += ['q', '126 0 0 126 50 680 cm', '/Im1 Do', 'Q']
    canvas.text(50, 630, 'AccessIQ', 13, 'F2', '#74d9db'); canvas.text(50, 560, 'Accessibility', 31, 'F2', '#ffffff'); canvas.text(50, 523, 'Audit Report', 31, 'F2', '#ffffff')
    canvas.wrapped(50, 475, 'Analysez l accessibilite de votre site web et obtenez des recommandations claires pour progresser.', 62, 11, 16, '#c6d8e9')
    canvas.rect(50, 220, 495, 1, '#2e668a'); canvas.text(50, 190, 'SITE ANALYSE', 8, 'F2', '#74d9db'); canvas.wrapped(50, 166, data['website_url'], 65, 13, 17, '#ffffff', 'F2')
    canvas.text(50, 112, f"Rapport genere le {data['scan_date'][:10]}", 9, 'F1', '#c6d8e9'); canvas.text(545, 112, f"Scan {data['scan_id']}", 8, 'F1', '#c6d8e9', 'right')
    canvas.new_page(); canvas.section('Executive Summary', 'Client overview')
    canvas.wrapped(50, canvas.y, 'Ce rapport resume les resultats de l audit automatise. Il met en evidence les priorites de correction afin de rendre les parcours essentiels plus inclusifs et conformes aux attentes WCAG.', 92, 10, 14); canvas.y -= 25
    cards = [('Accessibility Score', f"{score if score is not None else 'N/A'}/100", BLUE), ('Total Violations', data['total'], NAVY), ('Critical', data['critical'], '#b42318'), ('Serious', data['serious'], '#d97706'), ('Moderate', data['moderate'], BLUE), ('Minor', data['minor'], '#087443')]
    for index, (label, value, color) in enumerate(cards):
        x, y = 50 + (index % 3) * 167, canvas.y - (index // 3) * 82; canvas.rect(x, y - 62, 150, 66, '#ffffff', BORDER); canvas.rect(x, y - 62, 4, 66, color); canvas.text(x + 14, y - 20, label.upper(), 7, 'F2', MUTED); canvas.text(x + 14, y - 48, str(value), 19 if index == 0 else 16, 'F2', color)
    canvas.y -= 190; canvas.section('Accessibility Score', 'Overall result'); numeric_score = max(0, min(100, score or 0)); canvas.rect(50, canvas.y - 14, 495, 14, BORDER); canvas.rect(50, canvas.y - 14, 495 * numeric_score / 100, 14, TEAL if numeric_score >= 80 else BLUE)
    canvas.text(50, canvas.y - 46, f"{score if score is not None else 'N/A'} / 100", 27, 'F2', NAVY); canvas.wrapped(190, canvas.y - 44, 'Bon niveau de depart' if numeric_score >= 80 else 'Des ameliorations prioritaires sont recommandees', 45, 11, 15, MUTED, 'F2'); canvas.y -= 100
    canvas.wrapped(50, canvas.y, 'Le score donne une vue d ensemble de l etat d accessibilite mesure par ce scan. Consultez les resultats detailles pour comprendre chaque point et planifier les corrections.', 92, 10, 14)
    canvas.new_page(); canvas.section('Violations Overview', 'Priorities at a glance'); totals = [('Critical', data['critical'], '#b42318'), ('Serious', data['serious'], '#d97706'), ('Moderate', data['moderate'], BLUE), ('Minor', data['minor'], '#087443')]; total = max(1, data['total'])
    for index, (label, amount, color) in enumerate(totals):
        y = canvas.y - index * 68; canvas.text(50, y, label, 11, 'F2', NAVY); canvas.text(520, y, str(amount), 11, 'F2', color, 'right'); canvas.rect(50, y - 25, 470, 12, '#e7edf4'); canvas.rect(50, y - 25, 470 * amount / total, 12, color)
    canvas.y -= 310; canvas.wrapped(50, canvas.y, 'Les niveaux Critical et Serious doivent etre traites en premier : ils representent le risque le plus important pour l experience des utilisateurs et la conformite.', 92, 10, 14)
    canvas.new_page(); canvas.section('Detailed Findings', 'Actionable diagnostics')
    for impact in ['critical', 'serious', 'moderate', 'minor']:
        matching = [item for item in data.get('violations', []) if (item.get('impact') or 'minor').lower() == impact]
        if not matching: continue
        label, color = SEVERITY[impact]; canvas.text(50, canvas.y, label, 13, 'F2', color); canvas.y -= 24
        for violation in matching:
            description, recommendation, element = violation.get('message') or 'No description available.', violation.get('recommendation') or 'Review the related WCAG guidance.', violation.get('element') or 'Not specified'; estimate = 100 + len(description) // 75 * 14 + len(recommendation) // 75 * 14
            if canvas.y < estimate + 55: canvas.new_page(); canvas.section('Detailed Findings', 'Actionable diagnostics')
            canvas.rect(50, canvas.y - estimate, 495, estimate, '#ffffff', BORDER); canvas.text(64, canvas.y - 22, violation.get('rule', 'Unknown rule'), 12, 'F2', NAVY); canvas.text(530, canvas.y - 22, label.upper(), 7, 'F2', color, 'right')
            current = canvas.wrapped(64, canvas.y - 45, description, 78, 9, 12, MUTED); canvas.text(64, current - 2, f"WCAG  {violation.get('wcag') or 'Not specified'}", 8, 'F2', BLUE); current = canvas.wrapped(64, current - 18, f"Affected element: {element}", 78, 8, 11, MUTED); canvas.wrapped(64, current - 4, f"Recommended fix: {recommendation}", 78, 9, 12, INK); canvas.y -= estimate + 18
    canvas.new_page(); canvas.section('Recommendations', 'Next steps'); canvas.wrapped(50, canvas.y, 'Priorisez les violations Critical et Serious, puis validez chaque correction sur les parcours concernes. Une nouvelle analyse permettra de mesurer les progres et de confirmer la resolution des points detectes.', 92, 11, 16, INK); canvas.y -= 48
    for index, impact in enumerate(['critical', 'serious', 'moderate']):
        label, color = SEVERITY[impact]; amount = data.get(impact, 0); canvas.rect(50, canvas.y - 48, 495, 48, '#ffffff', BORDER); canvas.rect(50, canvas.y - 48, 6, 48, color); canvas.text(70, canvas.y - 20, f'{index + 1:02d}  {label}', 11, 'F2', NAVY); canvas.text(70, canvas.y - 36, f'{amount} point(s) a traiter dans ce niveau', 9, 'F1', MUTED); canvas.y -= 65
    canvas.section('Conclusion', 'Audit close'); canvas.wrapped(50, canvas.y, f"L audit de {data['website_url']} a identifie {data['total']} violation(s). Ce rapport fournit une feuille de route lisible pour concentrer les efforts sur les corrections a plus fort impact.", 92, 11, 16, INK)
    pages = canvas.build()
    for index, commands in enumerate(pages, 1):
        canvas.commands = commands
        if index > 1: canvas.footer(index)
        for position, command in enumerate(commands):
            if '{pages}' in command: commands[position] = command.replace('{pages}', str(len(pages)))
    objects: list[bytes] = []
    if logo_path.is_file():
        width, height, pixels, alpha = _png_pixels(logo_path); alpha_ref = len(objects) + 2 if alpha else None; image_ref = len(objects) + 1
        objects.append(f'<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode {"/SMask %s 0 R" % alpha_ref if alpha_ref else ""} /Length {len(pixels)} >>\nstream\n'.encode() + pixels + b'\nendstream')
        if alpha: objects.append(f'<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length {len(alpha)} >>\nstream\n'.encode() + alpha + b'\nendstream')
    else: image_ref = None
    content_refs = []
    for commands in pages:
        stream = '\n'.join(commands).encode('cp1252', errors='replace'); objects.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream'); content_refs.append(len(objects))
    page_start = len(objects) + 1; objects.extend([b''] * len(pages)); font_ref = len(objects) + 1; bold_ref, pages_ref, catalog_ref = font_ref + 1, font_ref + 2, font_ref + 3
    xobject = f'/XObject << /Im1 {image_ref} 0 R >>' if image_ref else ''
    for index, content_ref in enumerate(content_refs): objects[page_start - 1 + index] = f'<< /Type /Page /Parent {pages_ref} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources << /Font << /F1 {font_ref} 0 R /F2 {bold_ref} 0 R >> {xobject} >> /Contents {content_ref} 0 R >>'.encode()
    objects.extend([b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>']); kids = ' '.join(f'{page_start + index} 0 R' for index in range(len(pages))); objects.append(f'<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>'.encode()); objects.append(f'<< /Type /Catalog /Pages {pages_ref} 0 R >>'.encode())

    output = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f'{number} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(output)
    output.extend(f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'.encode())
    output.extend(''.join(f'{offset:010d} 00000 n \n' for offset in offsets[1:]).encode())
    output.extend(f'trailer\n<< /Size {len(objects) + 1} /Root {catalog_ref} 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    return bytes(output)


def store_report_pdf(report_id: str, content: bytes) -> str:
    directory = Path(__import__('os').environ.get('REPORT_STORAGE_DIR', 'storage/reports'))
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f'{report_id}.pdf'
    path.write_bytes(content)
    return str(path)