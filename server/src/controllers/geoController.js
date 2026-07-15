const { getClientIp } = require('../utils/requestMeta');
const { isPrivateIp, lookupGeoByIp } = require('../utils/geoLookup');

const MOCK_GEO = {
  KR: { country: 'South Korea', countryCode: 'KR', region: 'Seoul', city: 'Seoul' },
  US: { country: 'United States', countryCode: 'US', region: 'California', city: 'Los Angeles' },
  JP: { country: 'Japan', countryCode: 'JP', region: 'Tokyo', city: 'Tokyo' },
  CN: { country: 'China', countryCode: 'CN', region: 'Beijing', city: 'Beijing' },
  GB: { country: 'United Kingdom', countryCode: 'GB', region: 'England', city: 'London' },
  FR: { country: 'France', countryCode: 'FR', region: 'Île-de-France', city: 'Paris' },
};

const getGeoLocation = async (req, res) => {
  try {
    const mockCode = req.query.country?.trim().toUpperCase();

    if (process.env.NODE_ENV !== 'production' && mockCode && MOCK_GEO[mockCode]) {
      return res.json({
        ...MOCK_GEO[mockCode],
        isMock: true,
        isLocalDev: true,
      });
    }

    const clientIp = getClientIp(req);
    const usePublicFallback = isPrivateIp(clientIp);
    const geo = await lookupGeoByIp(usePublicFallback ? '' : clientIp);

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
