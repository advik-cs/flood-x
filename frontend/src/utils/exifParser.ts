/**
 * exifParser.ts
 * Lightweight binary EXIF reader for JPEG image files.
 * Extracts embedded GPS coordinates (latitude, longitude, altitude) without external dependencies.
 */

export interface ExifGpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export async function extractExifGps(file: File): Promise<ExifGpsData | null> {
  try {
    const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    if (!isJpeg) return null;

    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 2) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        const app1Length = view.getUint16(offset, false);
        offset += 2;

        if (
          view.getUint8(offset) === 0x45 &&
          view.getUint8(offset + 1) === 0x78 &&
          view.getUint8(offset + 2) === 0x69 &&
          view.getUint8(offset + 3) === 0x66 &&
          view.getUint8(offset + 4) === 0x00 &&
          view.getUint8(offset + 5) === 0x00
        ) {
          const tiffStart = offset + 6;
          return parseTiffGps(view, tiffStart);
        }
        offset += app1Length - 2;
      } else if ((marker & 0xff00) === 0xff00) {
        const sectionLength = view.getUint16(offset, false);
        offset += sectionLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.debug('EXIF GPS parse encountered non-critical error:', err);
  }

  return null;
}

function parseTiffGps(view: DataView, tiffStart: number): ExifGpsData | null {
  const byteOrder = view.getUint16(tiffStart, false);
  const littleEndian = byteOrder === 0x4949;

  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
    return null;
  }

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  let currentOffset = tiffStart + ifd0Offset;

  if (currentOffset + 2 > view.byteLength) return null;
  const numEntries = view.getUint16(currentOffset, littleEndian);
  currentOffset += 2;

  let gpsOffset: number | null = null;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = currentOffset + i * 12;
    if (entryOffset + 12 > view.byteLength) break;
    const tag = view.getUint16(entryOffset, littleEndian);
    if (tag === 0x8825) {
      gpsOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
      break;
    }
  }

  if (!gpsOffset || gpsOffset + 2 > view.byteLength) return null;

  const numGpsEntries = view.getUint16(gpsOffset, littleEndian);
  gpsOffset += 2;

  let latRef: string | null = null;
  let latCoords: number[] | null = null;
  let lngRef: string | null = null;
  let lngCoords: number[] | null = null;
  let altitude: number | undefined = undefined;

  for (let i = 0; i < numGpsEntries; i++) {
    const entryOffset = gpsOffset + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);

    if (tag === 0x0001) {
      latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 0x0002) {
      latCoords = readRationals(view, valueOffset, 3, littleEndian);
    } else if (tag === 0x0003) {
      lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 0x0004) {
      lngCoords = readRationals(view, valueOffset, 3, littleEndian);
    } else if (tag === 0x0006) {
      const altArr = readRationals(view, valueOffset, 1, littleEndian);
      if (altArr.length > 0) altitude = altArr[0];
    }
  }

  if (latCoords && latCoords.length === 3 && lngCoords && lngCoords.length === 3) {
    let lat = latCoords[0] + latCoords[1] / 60 + latCoords[2] / 3600;
    if (latRef === 'S') lat = -lat;

    let lng = lngCoords[0] + lngCoords[1] / 60 + lngCoords[2] / 3600;
    if (lngRef === 'W') lng = -lng;

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        altitude: altitude !== undefined ? parseFloat(altitude.toFixed(1)) : undefined
      };
    }
  }

  return null;
}

function readRationals(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    const entryOffset = offset + i * 8;
    if (entryOffset + 8 > view.byteLength) break;
    const numerator = view.getUint32(entryOffset, littleEndian);
    const denominator = view.getUint32(entryOffset + 4, littleEndian);
    if (denominator !== 0) {
      results.push(numerator / denominator);
    } else {
      results.push(0);
    }
  }
  return results;
}
