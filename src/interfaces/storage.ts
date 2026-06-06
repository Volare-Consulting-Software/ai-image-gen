// Object storage contract for image blobs (S3 in prod, MinIO in local dev).
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  // Remove an object. Idempotent — deleting a missing key is not an error.
  delete(key: string): Promise<void>;
  // A time-limited URL the browser can load the object from directly.
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const StorageToken = Symbol.for("Storage");
