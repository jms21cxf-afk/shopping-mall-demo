function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

function normalizeIp(ip) {
  return ip.replace('::ffff:', '');
}

function isPrivateIp(ip) {
  const normalized = normalizeIp(ip);

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

const getGeoLocation = async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const usePublicFallback = isPrivateIp(clientIp);

    const geo = await fetchGeoFromIpApi(usePublicFallback ? null : clientIp);

    res.json({
      ...geo,
      isLocalDev: usePublicFallback,
    });
  } catch (error) {
    res.status(502).json({
      message: error.message || 'Unable to detect location',
    });
  }
};

module.exports = {
  getGeoLocation,
};
