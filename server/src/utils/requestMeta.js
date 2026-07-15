function normalizeIp(ip) {
  return (ip || '').replace('::ffff:', '');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

function getDeviceLabel(req) {
  const userAgent = req.headers['user-agent'] || '';

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    const browser = /CriOS|Chrome/i.test(userAgent)
      ? 'Chrome'
      : /Safari/i.test(userAgent)
        ? 'Safari'
        : 'Mobile Browser';
    return `${browser} · iPhone`;
  }

  if (/Android/i.test(userAgent)) {
    const browser = /Chrome/i.test(userAgent) ? 'Chrome' : 'Android Browser';
    return `${browser} · Android`;
  }

  if (/Windows/i.test(userAgent)) {
    const browser = /Edg/i.test(userAgent)
      ? 'Edge'
      : /Chrome/i.test(userAgent)
        ? 'Chrome'
        : /Firefox/i.test(userAgent)
          ? 'Firefox'
          : 'Browser';
    return `${browser} · Windows`;
  }

  if (/Mac OS X/i.test(userAgent)) {
    const browser = /Chrome/i.test(userAgent)
      ? 'Chrome'
      : /Safari/i.test(userAgent)
        ? 'Safari'
        : 'Browser';
    return `${browser} · Mac`;
  }

  return 'Browser · Unknown device';
}

function getRequestMeta(req) {
  return {
    ip: getClientIp(req),
    deviceLabel: getDeviceLabel(req),
  };
}

module.exports = {
  getClientIp,
  getDeviceLabel,
  getRequestMeta,
};
