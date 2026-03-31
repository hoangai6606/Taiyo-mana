// Convert byte array string like "136,245,175,233,49,231,67,66,155,128,216,187,112,144,85,125"
// to proper UUID string
export function convertByteArrayToUuid(byteArrayStr: string): string {
  const bytes = byteArrayStr.split(',').map(b => parseInt(b.trim(), 10));
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// Check if a string looks like a byte array (comma-separated numbers)
export function isByteArrayString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const parts = str.split(',');
  return parts.length === 16 && parts.every(p => !isNaN(parseInt(p.trim(), 10)));
}

// Convert UUID to byte array string if it's a standard UUID
export function convertUuidToByteArray(uuid: string): string {
  const cleanHex = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  return bytes.join(',');
}
