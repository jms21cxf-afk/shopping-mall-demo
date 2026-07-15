const { getClientIp } = require('./requestMeta');

function isPrivateIp(ip) {
  const normalized = (ip || '').replace('::ffff:', '');

  if (!normalized) return true;
  if (normalized === '127.0.0.1' || normalized === '::1') return true;
  if (normalized.startsWith('10.')) return true;
  if (normalized.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;

  return false;
}

async function fetchGeoFromIpApi(ip) {
  const url = ip
    ? `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city`
    : 'http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Location lookup failed');
  }

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.message || 'Location lookup failed');
  }

  return {
    country: data.country,
    countryCode: data.countryCode,
    region: data.regionName || '',
    city: data.city || '',
  };
}

async function lookupGeoByIp(ip) {
  const usePublicFallback = isPrivateIp(ip);
  return fetchGeoFromIpApi(usePublicFallback ? null : ip);
}

async function lookupGeoFromRequest(req) {
  const clientIp = getClientIp(req);
  return lookupGeoByIp(clientIp);
}

module.exports = {
  lookupGeoByIp,
  lookupGeoFromRequest,
  isPrivateIp,
};
