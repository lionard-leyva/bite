import {
  parseSharedText,
  parseGoogleMapsUrl,
  mergeResolvedMapsUrl,
  detectSource,
  extractUrls,
  nameHintFromText,
  cleanUrl,
  isShortMapsUrl,
} from '../utils/shareParser';

describe('extractUrls', () => {
  it('finds URLs and strips trailing punctuation', () => {
    expect(extractUrls('Mira esto (https://vm.tiktok.com/ZMabc/). Bueno!')).toEqual([
      'https://vm.tiktok.com/ZMabc/',
    ]);
  });

  it('returns [] without URLs', () => {
    expect(extractUrls('Ramen Kagura')).toEqual([]);
  });
});

describe('detectSource', () => {
  it.each([
    ['https://maps.app.goo.gl/AbC123', 'google_maps'],
    ['https://goo.gl/maps/AbC123', 'google_maps'],
    ['https://www.google.com/maps/place/X/@40,-3,17z', 'google_maps'],
    ['https://www.google.es/maps?q=40.4,-3.7', 'google_maps'],
    ['https://maps.google.com/?q=Ramen', 'google_maps'],
    ['https://www.instagram.com/reel/C9xYz/?igsh=abc', 'instagram'],
    ['https://instagram.com/p/C9xYz/', 'instagram'],
    ['https://vm.tiktok.com/ZMabc/', 'tiktok'],
    ['https://www.tiktok.com/@foodie/video/123', 'tiktok'],
    ['https://www.google.com/search?q=ramen', 'other'],
    ['https://goo.gl/abc', 'other'],
    ['https://evilgoogle.com/maps/x', 'other'],
  ])('%s -> %s', (url, source) => {
    expect(detectSource(url)).toBe(source);
  });
});

describe('isShortMapsUrl', () => {
  it('only short Maps hosts', () => {
    expect(isShortMapsUrl('https://maps.app.goo.gl/AbC')).toBe(true);
    expect(isShortMapsUrl('https://goo.gl/maps/AbC')).toBe(true);
    expect(isShortMapsUrl('https://www.google.com/maps/place/X')).toBe(false);
  });
});

describe('parseGoogleMapsUrl', () => {
  it('reads name and pin coords from a place URL, preferring !3d!4d over @', () => {
    const url =
      'https://www.google.com/maps/place/Ramen+Kagura/@40.4183,-3.7100,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d40.4189262!4d-3.7095617!16s%2Fg%2F1';
    expect(parseGoogleMapsUrl(url)).toEqual({
      name: 'Ramen Kagura',
      latitude: 40.4189262,
      longitude: -3.7095617,
    });
  });

  it('decodes accents and drops the address after the comma', () => {
    const url =
      'https://www.google.es/maps/place/Casa+Lucio,+C.+de+la+Cava+Baja,+35,+Madrid/@40.41,-3.71,17z';
    expect(parseGoogleMapsUrl(url).name).toBe('Casa Lucio');
    expect(parseGoogleMapsUrl('https://www.google.com/maps/place/Caf%C3%A9+Comercial/@40.42,-3.70,17z').name).toBe(
      'Café Comercial',
    );
  });

  it('falls back to the @ viewport centre', () => {
    const info = parseGoogleMapsUrl('https://www.google.com/maps/place/Sitio/@40.5,-3.6,15z');
    expect(info).toEqual({ name: 'Sitio', latitude: 40.5, longitude: -3.6 });
  });

  it('reads coords from ?q=lat,lng without inventing a name', () => {
    expect(parseGoogleMapsUrl('https://maps.google.com/?q=40.4168,-3.7038')).toEqual({
      name: null,
      latitude: 40.4168,
      longitude: -3.7038,
    });
  });

  it('reads a name from ?q= text and api=1 query=', () => {
    expect(parseGoogleMapsUrl('https://maps.google.com/maps?q=Ramen+Kagura,+Madrid&ftid=0x1').name).toBe(
      'Ramen Kagura',
    );
    expect(
      parseGoogleMapsUrl('https://www.google.com/maps/search/?api=1&query=Sala+de+Despiece').name,
    ).toBe('Sala de Despiece');
  });

  it('reads /maps/search/<query>', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/maps/search/Bar+Pepe/@40.4,-3.7,14z').name).toBe('Bar Pepe');
  });

  it('ignores out-of-range or 0,0 coords', () => {
    expect(parseGoogleMapsUrl('https://maps.google.com/?q=95,10').latitude).toBeNull();
    expect(parseGoogleMapsUrl('https://www.google.com/maps/@0,0,3z').latitude).toBeNull();
  });

  it('survives malformed percent-encoding', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/maps/place/Bar%E0%A4/@40,-3,15z').name).toBe('Bar%E0%A4');
  });
});

describe('nameHintFromText', () => {
  it('takes the first meaningful line', () => {
    expect(nameHintFromText('Ramen Kagura\nhttps://maps.app.goo.gl/x')).toBe('Ramen Kagura');
  });

  it('cuts at " · " (Maps name · address)', () => {
    expect(nameHintFromText('Ramen Kagura · C. de las Fuentes, 1, Madrid https://maps.app.goo.gl/x')).toBe(
      'Ramen Kagura',
    );
  });

  it('drops hashtags, mentions and share boilerplate', () => {
    expect(nameHintFromText("Check out @foodie's video! #TikTok https://vm.tiktok.com/ZM/")).toBeNull();
    expect(nameHintFromText('Taberna La Concha #madrid #tapas @tabernalaconcha')).toBe('Taberna La Concha');
  });

  it('returns null for long captions, bare URLs or symbols only', () => {
    expect(
      nameHintFromText(
        'El mejor ramen que he probado en mi vida, tenéis que ir sí o sí este finde con amigos https://x.com',
      ),
    ).toBeNull();
    expect(nameHintFromText('https://www.instagram.com/reel/abc/')).toBeNull();
    expect(nameHintFromText('🔥🔥 123')).toBeNull();
  });
});

describe('cleanUrl', () => {
  it('removes tracking params and fragments', () => {
    expect(cleanUrl('https://www.instagram.com/reel/C9xYz/?igsh=abc#x')).toBe('https://www.instagram.com/reel/C9xYz/');
  });
});

describe('parseSharedText', () => {
  it('returns null for empty input', () => {
    expect(parseSharedText('')).toBeNull();
    expect(parseSharedText('   ')).toBeNull();
  });

  it('Google Maps short link: name from text, needs resolve', () => {
    expect(parseSharedText('Ramen Kagura\nhttps://maps.app.goo.gl/AbC123')).toEqual({
      source: 'google_maps',
      url: 'https://maps.app.goo.gl/AbC123',
      name: 'Ramen Kagura',
      latitude: null,
      longitude: null,
      needsResolve: true,
    });
  });

  it('Google Maps long link: everything from the URL, no resolve', () => {
    const parsed = parseSharedText(
      'https://www.google.com/maps/place/Ramen+Kagura/@40.41,-3.70,17z/data=!3d40.4189!4d-3.7095',
    );
    expect(parsed).toMatchObject({
      source: 'google_maps',
      name: 'Ramen Kagura',
      latitude: 40.4189,
      longitude: -3.7095,
      needsResolve: false,
    });
  });

  it('Instagram reel with only the link: no name', () => {
    expect(parseSharedText('https://www.instagram.com/reel/C9xYz/?igsh=MWQ1')).toEqual({
      source: 'instagram',
      url: 'https://www.instagram.com/reel/C9xYz/?igsh=MWQ1',
      name: null,
      latitude: null,
      longitude: null,
      needsResolve: false,
    });
  });

  it('TikTok with a short caption: name from caption', () => {
    expect(parseSharedText('Sala de Despiece 🔪 #madrid https://vm.tiktok.com/ZMabc/')).toMatchObject({
      source: 'tiktok',
      url: 'https://vm.tiktok.com/ZMabc/',
      name: 'Sala de Despiece 🔪',
    });
  });

  it('prefers a known source URL over other links', () => {
    expect(parseSharedText('https://bit.ly/x https://www.instagram.com/p/abc/')?.source).toBe('instagram');
  });

  it('plain text without URL becomes a name', () => {
    expect(parseSharedText('Casa Mono')).toMatchObject({ source: 'other', url: null, name: 'Casa Mono' });
  });
});

describe('mergeResolvedMapsUrl', () => {
  const base = parseSharedText('Ramen Kagura\nhttps://maps.app.goo.gl/AbC123')!;

  it('adds coords and prefers the URL name', () => {
    const merged = mergeResolvedMapsUrl(
      base,
      'https://www.google.com/maps/place/Ramen+Kagura+Madrid/@40.41,-3.70,17z/data=!3d40.4189!4d-3.7095',
    );
    expect(merged).toMatchObject({ name: 'Ramen Kagura Madrid', latitude: 40.4189, longitude: -3.7095, needsResolve: false });
  });

  it('keeps the text name when the resolved URL has none', () => {
    const merged = mergeResolvedMapsUrl(base, 'https://maps.google.com/?q=40.4168,-3.7038');
    expect(merged).toMatchObject({ name: 'Ramen Kagura', latitude: 40.4168, longitude: -3.7038 });
  });
});
