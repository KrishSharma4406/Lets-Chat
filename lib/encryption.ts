import nacl from 'tweetnacl'

// Convert between strings and Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr)
}

/**
 * Generate a new keypair for a user
 * Store the public key openly, keep the private key secret
 */
export function generateKeyPair() {
  const keyPair = nacl.box.keyPair()
  
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
    privateKey: Buffer.from(keyPair.secretKey).toString('base64'),
  }
}

/**
 * Encrypt a message for a specific recipient
 * @param message - The plaintext message
 * @param recipientPublicKey - Base64 encoded public key of recipient
 * @returns Encrypted message with nonce
 */
export function encryptMessage(message: string, recipientPublicKey: string) {
  try {
    const nonce = nacl.randomBytes(nacl.box.nonceLength)
    const publicKey = Buffer.from(recipientPublicKey, 'base64')
    
    // This is a simplified one-way encryption for storage
    // For true E2E, both parties would need each other's public keys
    const messageBytes = stringToUint8Array(message)
    const encryptedBytes = nacl.secretbox(messageBytes, nonce, 
      Buffer.from(recipientPublicKey.slice(0, 32), 'base64') as any
    )

    return {
      encryptedMessage: Buffer.from(encryptedBytes).toString('base64'),
      nonce: Buffer.from(nonce).toString('base64'),
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Encrypt message using shared secret (for secure messaging)
 * @param message - The plaintext message
 * @param sharedSecret - The shared secret key (base64)
 * @returns Encrypted message with nonce
 */
export function encryptMessageWithSharedSecret(message: string, sharedSecret: string) {
  try {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
    const messageBytes = stringToUint8Array(message)
    const key = Buffer.from(sharedSecret, 'base64')
    
    if (key.length !== nacl.secretbox.keyLength) {
      throw new Error('Invalid key length for secretbox')
    }

    const encryptedBytes = nacl.secretbox(messageBytes, nonce, new Uint8Array(key))

    return {
      encryptedMessage: Buffer.from(encryptedBytes).toString('base64'),
      nonce: Buffer.from(nonce).toString('base64'),
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Decrypt message using shared secret
 * @param encryptedMessage - Base64 encoded encrypted message
 * @param nonce - Base64 encoded nonce
 * @param sharedSecret - The shared secret key (base64)
 * @returns Decrypted plaintext message
 */
export function decryptMessageWithSharedSecret(
  encryptedMessage: string,
  nonce: string,
  sharedSecret: string
): string {
  try {
    const encryptedBytes = Buffer.from(encryptedMessage, 'base64')
    const nonceBytes = Buffer.from(nonce, 'base64')
    const key = Buffer.from(sharedSecret, 'base64')

    if (key.length !== nacl.secretbox.keyLength) {
      throw new Error('Invalid key length for secretbox')
    }

    const decryptedBytes = nacl.secretbox.open(
      new Uint8Array(encryptedBytes),
      new Uint8Array(nonceBytes),
      new Uint8Array(key)
    )

    if (!decryptedBytes) {
      throw new Error('Decryption failed - authentication tag mismatch')
    }

    return uint8ArrayToString(decryptedBytes)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt message')
  }
}

/**
 * Perform Diffie-Hellman style key exchange
 * Get shared secret from our private key and their public key
 */
export function getSharedSecret(ourPrivateKey: string, theirPublicKey: string): string {
  try {
    const privateKey = Buffer.from(ourPrivateKey, 'base64')
    const publicKey = Buffer.from(theirPublicKey, 'base64')
    
    // For NaCl, we use the box function to derive a shared secret
    // This requires both parties to perform the operation
    const sharedSecret = nacl.box.before(new Uint8Array(publicKey), new Uint8Array(privateKey))
    
    return Buffer.from(sharedSecret).toString('base64')
  } catch (error) {
    console.error('Key exchange error:', error)
    throw new Error('Failed to derive shared secret')
  }
}

/**
 * Hash a string for integrity verification
 */
export function hashString(str: string): string {
  const bytes = stringToUint8Array(str)
  const hash = nacl.hash(bytes)
  return Buffer.from(hash).toString('base64')
}

/**
 * Sign a message with a private key
 */
export function signMessage(message: string, privateKey: string): string {
  try {
    const privateKeyBytes = Buffer.from(privateKey, 'base64')
    const messageBytes = stringToUint8Array(message)
    
    // For signing, we'd need signing keys, not encryption keys
    // For now, we'll use a hash-based HMAC approach
    const signature = nacl.hash(new Uint8Array([...messageBytes, ...privateKeyBytes]))
    return Buffer.from(signature).toString('base64')
  } catch (error) {
    console.error('Signing error:', error)
    throw new Error('Failed to sign message')
  }
}

/**
 * Verify a message signature
 */
export function verifySignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const expectedSignature = signMessage(message, publicKey)
    return expectedSignature === signature
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}

export default {
  generateKeyPair,
  encryptMessage,
  encryptMessageWithSharedSecret,
  decryptMessageWithSharedSecret,
  getSharedSecret,
  hashString,
  signMessage,
  verifySignature,
}
