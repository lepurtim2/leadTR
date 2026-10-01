import urllib.request
import ssl
import json

ctx = ssl._create_unverified_context()

def check_ibb_health():
    url = 'https://data.ibb.gov.tr/api/3/action/package_show?id=istanbul-saglik-kurum-ve-kuruluslari-verisi'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        res = json.loads(resp.read())
        for r in res.get('result', {}).get('resources', []):
            print("IBB Resource:", r.get('name'), r.get('format'), r.get('url'))

def check_izmir_eczane():
    url = 'https://acikveri.bizizmir.com/api/3/action/package_show?id=izmir-il-sinirlari-icerisindeki-eczaneler'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read())
            for r in res.get('result', {}).get('resources', []):
                print("Izmir Resource:", r.get('name'), r.get('format'), r.get('url'))
    except Exception as e:
        print("Izmir err:", e)

if __name__ == '__main__':
    check_ibb_health()
    check_izmir_eczane()
