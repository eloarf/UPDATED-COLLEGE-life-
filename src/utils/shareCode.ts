import LZString from 'lz-string';

export function encodeShareCode<T>(data: T): string {
  try {
    const json = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
  } catch (e) {
    console.error('Failed to encode share code', e);
    return '';
  }
}

export function decodeShareCode<T>(code: string): T | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(code);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('Failed to decode share code', e);
    return null;
  }
}
