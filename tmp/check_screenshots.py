import psycopg2
from psycopg2.extras import RealDictCursor
import json

conn = psycopg2.connect('postgresql://a11y_user:a11y_password@localhost:5432/a11y_platform')
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute('SELECT id FROM sites WHERE url=%s', ('https://isims.ieee.tn/',))
site = cur.fetchone()
if not site:
    print('NO_SITE')
else:
    cur.execute('SELECT id FROM scans WHERE site_id=%s ORDER BY started_at DESC LIMIT 1', (site['id'],))
    scan = cur.fetchone()
    if not scan:
        print(json.dumps({'site': site, 'scan': None}, default=str))
    else:
        scan_id = scan['id']
        cur.execute('SELECT COUNT(*) AS total_pages FROM pages WHERE scan_id=%s', (scan_id,))
        total_pages = cur.fetchone()['total_pages']
        cur.execute("SELECT COUNT(*) AS with_screenshot FROM pages WHERE scan_id=%s AND screenshot_url IS NOT NULL", (scan_id,))
        with_screenshot = cur.fetchone()['with_screenshot']
        cur.execute("SELECT COUNT(*) AS violations FROM violations v JOIN pages p ON v.page_id=p.id WHERE p.scan_id=%s", (scan_id,))
        violations = cur.fetchone()['violations']
        print(json.dumps({'scan_id': scan_id, 'total_pages': total_pages, 'with_screenshot': with_screenshot, 'violations': violations}, default=str))
cur.close()
conn.close()
