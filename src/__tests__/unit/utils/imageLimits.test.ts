import { MAX_IMAGE_BYTES, imageSizeError } from '@/lib/utils/imageLimits';

function makeFile(sizeBytes: number): File {
  // Minimal File stub: only `size` and `type` matter for imageSizeError.
  return { size: sizeBytes, type: 'image/png', name: 'test.png' } as unknown as File;
}

describe('imageSizeError', () => {
  it('returns null when file is exactly at the limit', () => {
    expect(imageSizeError(makeFile(MAX_IMAGE_BYTES))).toBeNull();
  });

  it('returns null when file is under the limit', () => {
    expect(imageSizeError(makeFile(1_000_000))).toBeNull();
  });

  it('returns a message containing "超過上限" when file exceeds the limit', () => {
    const msg = imageSizeError(makeFile(MAX_IMAGE_BYTES + 1));
    expect(msg).not.toBeNull();
    expect(msg).toContain('超過上限');
  });

  it('includes actual and limit MB values in the message', () => {
    // 4 200 000 bytes → 4.2 MB, limit is 2 MB
    const msg = imageSizeError(makeFile(4_200_000));
    expect(msg).toContain('4.2MB');
    expect(msg).toContain('2MB');
  });

  it('returns null for a zero-byte file', () => {
    expect(imageSizeError(makeFile(0))).toBeNull();
  });
});
