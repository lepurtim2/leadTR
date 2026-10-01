async function testOsm() {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="hospital"]["name"](36.5, 26.5, 41.5, 44.0);
      node["amenity"="pharmacy"]["name"](36.5, 26.5, 41.5, 44.0);
      node["amenity"="dentist"]["name"](36.5, 26.5, 41.5, 44.0);
    );
    out 50;
  `;
  console.log('Querying Overpass API for real Turkish businesses...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LeadTR-DataPipeline/1.0 (https://leadtr.com; contact: engineering@leadtr.com)'
    }
  });
  const text = await res.text();
  console.log('HTTP Status:', res.status);
  console.log('Raw text preview:\n', text.slice(0, 500));
}

testOsm().catch(console.error);
