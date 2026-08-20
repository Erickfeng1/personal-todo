const VERSION = 'v1'

export class InvalidSyncCursorError extends Error {
  constructor() {
    super('Invalid sync cursor')
    this.name = 'InvalidSyncCursorError'
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function signatureInput(
  userId: string,
  sequence: number
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${VERSION}:${userId}:${String(sequence)}`)
}

export async function encodeSyncCursor(
  sequence: number,
  userId: string,
  secret: string
): Promise<string> {
  const payload = new TextEncoder().encode(`${VERSION}:${String(sequence)}`)
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importKey(secret),
    signatureInput(userId, sequence)
  )

  return `${encodeBase64Url(payload)}.${encodeBase64Url(new Uint8Array(signature))}`
}

export async function decodeSyncCursor(
  cursor: string,
  userId: string,
  secret: string
): Promise<number> {
  try {
    const [payloadPart, signaturePart, extra] = cursor.split('.')
    if (!payloadPart || !signaturePart || extra)
      throw new InvalidSyncCursorError()

    const payload = new TextDecoder().decode(decodeBase64Url(payloadPart))
    const [version, sequencePart, payloadExtra] = payload.split(':')
    const sequence = Number(sequencePart)
    if (
      version !== VERSION ||
      payloadExtra !== undefined ||
      !Number.isSafeInteger(sequence) ||
      sequence < 0
    ) {
      throw new InvalidSyncCursorError()
    }

    const valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(secret),
      decodeBase64Url(signaturePart),
      signatureInput(userId, sequence)
    )
    if (!valid) throw new InvalidSyncCursorError()
    return sequence
  } catch (cause) {
    if (cause instanceof InvalidSyncCursorError) throw cause
    throw new InvalidSyncCursorError()
  }
}
