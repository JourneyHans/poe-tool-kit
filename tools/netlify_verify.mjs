const BASE = 'https://papaya-kitten-5ce2a1.netlify.app';
const PASSWORD = 'My-Drop-Site';

// 1) initial request -> password form?
let r = await fetch(BASE + '/', { redirect: 'manual' });
console.log('GET /', r.status, r.headers.get('set-cookie')?.slice(0, 60));
const html = await r.text();
console.log('form?', /password/i.test(html), 'len', html.length);

// 2) submit the password the way the form does
const body = new URLSearchParams({ password: PASSWORD });
r = await fetch(BASE + '/', { method: 'POST', body, redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
console.log('POST /', r.status, [...r.headers.entries()].filter(([k]) => /cookie|location/i.test(k)));
const cookies = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
console.log('cookies:', cookies.slice(0, 80));

// 3) fetch with cookie
r = await fetch(BASE + '/', { headers: { cookie: cookies } });
const page = await r.text();
console.log('authed GET', r.status, 'len', page.length);
console.log('has app?', page.includes('ATLAS_PRESETS') || page.includes('舆图天赋树'), '| title:', (page.match(/<title>(.*?)<\/title>/) || [])[1]);

// 4) guide page
r = await fetch(BASE + '/guide.html', { headers: { cookie: cookies } });
const guide = await r.text();
console.log('guide', r.status, 'len', guide.length, '| title:', (guide.match(/<title>(.*?)<\/title>/) || [])[1]);
