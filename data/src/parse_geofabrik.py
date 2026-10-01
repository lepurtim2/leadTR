import requests
from html.parser import HTMLParser

class MyParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for k, v in attrs:
                if k == 'href' and ('pbf' in v or 'osm' in v):
                    print("Found link:", v)

url = "https://download.geofabrik.de/europe/turkey.html"
headers = {"User-Agent": "Mozilla/5.0"}
resp = requests.get(url, headers=headers)
print("Page status:", resp.status_code)
parser = MyParser()
parser.feed(resp.text)
