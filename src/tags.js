// What a song file says about itself: its title, its artist and its cover, read from its tags (ID3v2 in an mp3, the
// iTunes atoms in an m4a, Vorbis comments and a PICTURE block in a flac or an ogg). Nothing is fetched: the bytes the
// player gave are all there is. `readTags(buffer)`: { title, artist, pic: { mime, bytes } } with whatever was found.
const latin1 = b => String.fromCharCode(...b);
function text(b, enc) {
  // (ID3 encodings: 0 latin-1, 1 UTF-16 with a BOM, 2 UTF-16BE, 3 UTF-8)
  if (enc === 1 || enc === 2) {
    let le = enc === 1;
    let i = 0;
    if (enc === 1 && b.length >= 2) {
      le = !(b[0] === 0xfe && b[1] === 0xff);
      if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) i = 2;
    }
    return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(b.subarray(i, i + ((b.length - i) & ~1)));
  }
  return enc === 3 ? new TextDecoder().decode(b) : latin1(b);
}
const clean = s => (s ?? '').replace(/\0+$/g, '').split('\0')[0].trim() || null;

// ---- ID3v2 (2.2, 2.3, 2.4) at the start of an mp3
function id3(u) {
  if (u.length < 10 || latin1(u.subarray(0, 3)) !== 'ID3') return null;
  const ver = u[3],
    flags = u[5],
    syncsafe = (a, i) => (a[i] << 21) | (a[i + 1] << 14) | (a[i + 2] << 7) | a[i + 3],
    size = syncsafe(u, 6);
  let tag = u.subarray(10, 10 + size);
  // (the whole tag unsynchronised: every 0xFF 0x00 back to 0xFF)
  if (flags & 0x80 && ver < 4) {
    const out = [];
    for (let i = 0; i < tag.length; i++) if (!(tag[i] === 0 && tag[i - 1] === 0xff)) out.push(tag[i]);
    tag = Uint8Array.from(out);
  }
  let i = 0;
  // (an extended header skipped)
  if (flags & 0x40) i += ver === 4 ? syncsafe(tag, 0) : 4 + ((tag[0] << 24) | (tag[1] << 16) | (tag[2] << 8) | tag[3]);
  const out = {},
    idLen = ver === 2 ? 3 : 4,
    headLen = ver === 2 ? 6 : 10;
  while (i + headLen <= tag.length) {
    const id = latin1(tag.subarray(i, i + idLen));
    if (!/^[A-Z0-9]+$/.test(id)) break;
    const len = ver === 2 ? (tag[i + 3] << 16) | (tag[i + 4] << 8) | tag[i + 5] : ver === 4 ? syncsafe(tag, i + 4) : ((tag[i + 4] << 24) | (tag[i + 5] << 16) | (tag[i + 6] << 8) | tag[i + 7]) >>> 0,
      body = tag.subarray(i + headLen, i + headLen + len);
    i += headLen + len;
    if (!len) continue;
    if (id === 'TIT2' || id === 'TT2') out.title ??= clean(text(body.subarray(1), body[0]));
    else if (id === 'TPE1' || id === 'TP1') out.artist ??= clean(text(body.subarray(1), body[0]));
    else if ((id === 'APIC' || id === 'PIC') && !out.pic) {
      const enc = body[0];
      let j = 1,
        mime;
      if (id === 'PIC') {
        mime = `image/${latin1(body.subarray(1, 4)).toLowerCase().replace('jpg', 'jpeg')}`;
        j = 4;
      } else {
        const e = body.indexOf(0, 1);
        mime = latin1(body.subarray(1, e)) || 'image/jpeg';
        j = e + 1;
      }
      // (the picture type, then its description, ended by a zero of its encoding's width)
      j++;
      if (enc === 1 || enc === 2) {
        while (j + 1 < body.length && (body[j] || body[j + 1])) j += 2;
        j += 2;
      } else {
        while (j < body.length && body[j]) j++;
        j++;
      }
      out.pic = { mime: mime.includes('/') ? mime : `image/${mime}`, bytes: body.slice(j) };
    }
  }
  return out;
}

// ---- MP4 / M4A: moov > udta > meta > ilst, the ©nam, ©ART and covr atoms
function mp4(u) {
  if (u.length < 12 || latin1(u.subarray(4, 8)) !== 'ftyp') return null;
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength),
    out = {};
  function walk(from, to, depth) {
    let i = from;
    while (i + 8 <= to) {
      let len = dv.getUint32(i);
      const type = latin1(u.subarray(i + 4, i + 8));
      let head = 8;
      if (len === 1) (len = Number(dv.getBigUint64(i + 8))), (head = 16);
      else if (len === 0) len = to - i;
      if (len < head || i + len > to) return;
      const s = i + head,
        e = i + len;
      if (type === 'moov' || type === 'udta' || type === 'ilst') walk(s, e, depth + 1);
      // (meta is a full atom: four bytes of version and flags before its children)
      else if (type === 'meta') walk(s + 4, e, depth + 1);
      // (its value in a 'data' child: type flags, a locale, then the bytes)
      else if ((type === '\xa9nam' || type === '\xa9ART' || type === 'covr') && latin1(u.subarray(s + 4, s + 8)) === 'data') {
        const kind = dv.getUint32(s + 8) & 0xffffff,
          v = u.subarray(s + 16, s + dv.getUint32(s));
        if (type === 'covr') out.pic ??= { mime: kind === 14 ? 'image/png' : 'image/jpeg', bytes: v.slice() };
        else if (type.endsWith('nam')) out.title ??= clean(new TextDecoder().decode(v));
        else out.artist ??= clean(new TextDecoder().decode(v));
      }
      i += len;
    }
  }
  walk(0, u.length, 0);
  return out;
}

// ---- Vorbis comments (a flac's block, an ogg's second packet) and a PICTURE block
function vorbisComments(u, i, out) {
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  i += 4 + dv.getUint32(i, true);
  const n = dv.getUint32(i, true);
  i += 4;
  for (let k = 0; k < n && i + 4 <= u.length; k++) {
    const len = dv.getUint32(i, true),
      s = new TextDecoder().decode(u.subarray(i + 4, i + 4 + len)),
      eq = s.indexOf('='),
      key = s.slice(0, eq).toUpperCase(),
      val = s.slice(eq + 1);
    i += 4 + len;
    if (key === 'TITLE') out.title ??= clean(val);
    else if (key === 'ARTIST') out.artist ??= clean(val);
    else if (key === 'METADATA_BLOCK_PICTURE' && !out.pic)
      try {
        out.pic = picture(Uint8Array.from(atob(val), c => c.charCodeAt(0)));
      } catch {}
  }
}
function picture(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 4;
  const ml = dv.getUint32(i),
    mime = latin1(b.subarray(i + 4, i + 4 + ml));
  i += 4 + ml;
  i += 4 + dv.getUint32(i) + 16;
  const len = dv.getUint32(i);
  return { mime: mime || 'image/jpeg', bytes: b.slice(i + 4, i + 4 + len) };
}
function flac(u) {
  if (latin1(u.subarray(0, 4)) !== 'fLaC') return null;
  const out = {};
  let i = 4;
  for (;;) {
    if (i + 4 > u.length) break;
    const last = u[i] & 0x80,
      type = u[i] & 0x7f,
      len = (u[i + 1] << 16) | (u[i + 2] << 8) | u[i + 3];
    if (type === 4) vorbisComments(u, i + 4, out);
    else if (type === 6 && !out.pic) out.pic = picture(u.subarray(i + 4, i + 4 + len));
    i += 4 + len;
    if (last) break;
  }
  return out;
}
function ogg(u) {
  if (latin1(u.subarray(0, 4)) !== 'OggS') return null;
  // (the comment header found by its signature in the first pages: enough for the words; a big cover spanning pages
  // is cut, and then left out)
  const head = u.subarray(0, Math.min(u.length, 1 << 20)),
    s = latin1(head.subarray(0, Math.min(head.length, 65536))),
    at = s.indexOf('\x03vorbis'),
    op = s.indexOf('OpusTags'),
    out = {};
  try {
    if (at >= 0) vorbisComments(head, at + 7, out);
    else if (op >= 0) vorbisComments(head, op + 8, out);
  } catch {}
  return out;
}

export function readTags(buffer) {
  const u = new Uint8Array(buffer);
  for (const f of [id3, mp4, flac, ogg])
    try {
      const t = f(u);
      if (t) return t;
    } catch {}
  return {};
}

// a cover made small enough to keep on the device: a square JPEG `size` px wide, as a data URL (null if it will not
// decode)
export async function coverURL(pic, size = 192) {
  if (!pic?.bytes?.length) return null;
  try {
    const bmp = await createImageBitmap(new Blob([pic.bytes], { type: pic.mime })),
      cv = document.createElement('canvas'),
      s = Math.min(bmp.width, bmp.height);
    cv.width = cv.height = size;
    cv.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
    bmp.close?.();
    return cv.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}
