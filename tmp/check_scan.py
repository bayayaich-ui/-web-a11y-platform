import urllib.request, urllib.error, json
scan_id = '7348ab5e-7194-486c-ab13-35d739cd7c0d'
for path in [f'http://localhost:8002/api/scans/{scan_id}', f'http://localhost:8002/api/scans/{scan_id}/violations']:
    print('\nCHECK', path)
    req = urllib.request.Request(path, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print('status', r.status)
            print(r.read().decode())
    except urllib.error.HTTPError as e:
        print('HTTPError', e.code)
        print(e.read().decode())
    except Exception as e:
        print('ERR', type(e).__name__, e)
