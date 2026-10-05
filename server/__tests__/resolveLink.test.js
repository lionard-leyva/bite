const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveLink, isAllowedUrl } = require('../resolveLink');

function fakeFetch(map) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const location = map[url];
    return {
      status: location ? 302 : 200,
      headers: { get: (h) => (h.toLowerCase() === 'location' ? location ?? null : null) },
    };
  };
  impl.calls = calls;
  return impl;
}

const LONG = 'https://www.google.com/maps/place/Ramen+Kagura/@40.41,-3.70,17z/data=!3d40.4189!4d-3.7095';

describe('isAllowedUrl', () => {
  it('allows Google Maps hosts only', () => {
    assert.equal(isAllowedUrl(new URL('https://maps.app.goo.gl/AbC')), true);
    assert.equal(isAllowedUrl(new URL('https://goo.gl/maps/AbC')), true);
    assert.equal(isAllowedUrl(new URL(LONG)), true);
    assert.equal(isAllowedUrl(new URL('https://maps.google.es/?q=1,2')), true);
    assert.equal(isAllowedUrl(new URL('https://goo.gl/other')), false);
    assert.equal(isAllowedUrl(new URL('https://www.google.com/search?q=x')), false);
    assert.equal(isAllowedUrl(new URL('https://evilgoogle.com/maps')), false);
    assert.equal(isAllowedUrl(new URL('http://169.254.169.254/maps')), false);
  });
});

describe('resolveLink', () => {
  it('follows a short link to the long Maps URL', async () => {
    const f = fakeFetch({ 'https://maps.app.goo.gl/AbC': LONG });
    assert.equal(await resolveLink('https://maps.app.goo.gl/AbC', f), LONG);
    assert.deepEqual(f.calls, ['https://maps.app.goo.gl/AbC']);
  });

  it('returns a long Maps URL without fetching', async () => {
    const f = fakeFetch({});
    assert.equal(await resolveLink(LONG, f), LONG);
    assert.equal(f.calls.length, 0);
  });

  it('unwraps the EU consent redirect', async () => {
    const consent = `https://consent.google.com/m?continue=${encodeURIComponent(LONG)}&gl=ES`;
    const f = fakeFetch({ 'https://maps.app.goo.gl/AbC': consent });
    assert.equal(await resolveLink('https://maps.app.goo.gl/AbC', f), LONG);
  });

  it('rejects non-Maps input', async () => {
    await assert.rejects(resolveLink('https://example.com/x', fakeFetch({})), { status: 400 });
    await assert.rejects(resolveLink('not a url', fakeFetch({})), { status: 400 });
  });

  it('does not follow redirects off Google Maps', async () => {
    const f = fakeFetch({ 'https://maps.app.goo.gl/AbC': 'https://evil.example/steal' });
    await assert.rejects(resolveLink('https://maps.app.goo.gl/AbC', f), { status: 422 });
  });

  it('stops on redirect loops', async () => {
    const f = fakeFetch({
      'https://maps.app.goo.gl/A': 'https://maps.app.goo.gl/B',
      'https://maps.app.goo.gl/B': 'https://maps.app.goo.gl/A',
    });
    await assert.rejects(resolveLink('https://maps.app.goo.gl/A', f), { status: 422 });
    assert.ok(f.calls.length <= 6);
  });
});
