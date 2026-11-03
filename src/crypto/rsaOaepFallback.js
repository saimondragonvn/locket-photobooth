/**
 * Pure-JS RSA-OAEP (SHA-256, MGF1-SHA-256) encryption fallback.
 *
 * Why: `window.crypto.subtle` only exists in secure contexts (HTTPS / localhost).
 * When the app is opened over plain HTTP on a LAN IP (e.g. http://192.168.1.x:3000
 * from a phone), WebCrypto is missing and login used to fail with
 * "Trang phải mở bằng HTTPS (hoặc localhost) mới mã hoá được mật khẩu".
 *
 * This module produces byte-for-byte RFC 8017 compatible OAEP ciphertext, so the
 * upstream server decrypts it exactly like a WebCrypto-produced ciphertext.
 * `crypto.getRandomValues` (available in insecure contexts) supplies the OAEP seed.
 */

// ---------- SHA-256 (FIPS 180-4) ----------
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(bytes) {
  const msgLen = bytes.length;
  const totalLen = (((msgLen + 9 + 63) >> 6) << 6);
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[msgLen] = 0x80;
  const bitLen = msgLen * 8;
  const view = new DataView(buf.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(totalLen - 4, bitLen >>> 0);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < totalLen; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i]);
  return out;
}

// ---------- Minimal DER reader for SubjectPublicKeyInfo(RSA) ----------
function readTlv(bytes, pos) {
  const tag = bytes[pos++];
  let len = bytes[pos++];
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + bytes[pos++];
  }
  return { tag, start: pos, end: pos + len };
}

function bytesToBigInt(bytes) {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex ? BigInt(`0x${hex}`) : 0n;
}

/** Parses DER SPKI bytes into { n, e, k } (modulus, exponent, modulus length in bytes). */
export function parseSpkiRsaPublicKey(spkiBytes) {
  const der = spkiBytes instanceof Uint8Array ? spkiBytes : new Uint8Array(spkiBytes);
  const outer = readTlv(der, 0); // SEQUENCE
  const algo = readTlv(der, outer.start); // SEQUENCE AlgorithmIdentifier
  const bitStr = readTlv(der, algo.end); // BIT STRING
  if (bitStr.tag !== 0x03) throw new Error('SPKI không hợp lệ (thiếu BIT STRING)');
  const rsaSeq = readTlv(der, bitStr.start + 1); // skip unused-bits byte
  const nTlv = readTlv(der, rsaSeq.start);
  const eTlv = readTlv(der, nTlv.end);
  let nBytes = der.subarray(nTlv.start, nTlv.end);
  while (nBytes.length > 1 && nBytes[0] === 0) nBytes = nBytes.subarray(1);
  return {
    n: bytesToBigInt(nBytes),
    e: bytesToBigInt(der.subarray(eTlv.start, eTlv.end)),
    k: nBytes.length,
  };
}

// ---------- OAEP ----------
function mgf1(seed, length) {
  const out = new Uint8Array(length);
  const block = new Uint8Array(seed.length + 4);
  block.set(seed);
  for (let counter = 0, pos = 0; pos < length; counter++) {
    block[seed.length] = (counter >>> 24) & 0xff;
    block[seed.length + 1] = (counter >>> 16) & 0xff;
    block[seed.length + 2] = (counter >>> 8) & 0xff;
    block[seed.length + 3] = counter & 0xff;
    const digest = sha256(block);
    const take = Math.min(digest.length, length - pos);
    out.set(digest.subarray(0, take), pos);
    pos += take;
  }
  return out;
}

function modPow(base, exp, mod) {
  let result = 1n;
  let b = base % mod;
  let x = exp;
  while (x > 0n) {
    if (x & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    x >>= 1n;
  }
  return result;
}

/** RSAES-OAEP-ENCRYPT with SHA-256 / MGF1-SHA-256 and empty label. Returns ciphertext bytes. */
export function rsaOaepSha256Encrypt({ n, e, k }, message) {
  const hLen = 32;
  const mLen = message.length;
  if (mLen > k - 2 * hLen - 2) throw new Error('Email hoặc mật khẩu quá dài');

  const lHash = sha256(new Uint8Array(0));
  const db = new Uint8Array(k - hLen - 1);
  db.set(lHash, 0);
  db[db.length - mLen - 1] = 0x01;
  db.set(message, db.length - mLen);

  const seed = new Uint8Array(hLen);
  crypto.getRandomValues(seed);

  const dbMask = mgf1(seed, db.length);
  for (let i = 0; i < db.length; i++) db[i] ^= dbMask[i];
  const seedMask = mgf1(db, hLen);
  for (let i = 0; i < hLen; i++) seed[i] ^= seedMask[i];

  const em = new Uint8Array(k);
  em.set(seed, 1);
  em.set(db, 1 + hLen);

  const c = modPow(bytesToBigInt(em), e, n);
  const hex = c.toString(16).padStart(k * 2, '0');
  const out = new Uint8Array(k);
  for (let i = 0; i < k; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

