import { expect, test } from '@playwright/test';
import { createImageFileAdmission, extensionOfFile, imageDimensionsWithinLimits } from '../src/image-tools/core/file-admission';
import { runSequentialBatch } from '../src/image-tools/core/batch-execution';

const MB = 1024 * 1024;
const policy = {
  maxFiles: 2,
  maxFileBytes: 5 * MB,
  maxTotalBytes: 8 * MB,
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
};

const file = (name: string, size: number) => ({ name, size });

test('admission reserves capacity only after a valid image has been accepted', () => {
  const session = createImageFileAdmission([], policy);
  expect(session.check(file('damaged.png', 2 * MB))).toBeUndefined();
  // If the image decoder fails, no accept() call is made.
  expect(session.count).toBe(0);
  expect(session.totalBytes).toBe(0);

  const first = file('first.png', 4 * MB);
  session.accept(first);
  expect(session.count).toBe(1);
  expect(session.totalBytes).toBe(4 * MB);

  expect(session.check(file('oversized.jpg', 5 * MB))).toBe('total-size');
  const second = file('second.webp', 4 * MB);
  session.accept(second);
  expect(session.count).toBe(2);
  expect(session.check(file('third.jpg', 1))).toBe('file-count');
});

test('admission rejects incompatible formats and oversize files, including malformed size values', () => {
  const session = createImageFileAdmission([], policy);
  expect(session.check(file('photo.svg', 12))).toBe('format');
  expect(session.check(file('photo.jpg', 5 * MB + 1))).toBe('file-size');
  expect(session.check(file('photo.JPG', 3))).toBeUndefined();
  expect(session.check(file('photo', 3))).toBe('format');
  expect(session.check(file('photo.png', Number.NaN))).toBe('file-size');
  expect(session.check(file('photo.png', -1))).toBe('file-size');
  expect(() => session.accept(file('bad.svg', 10))).toThrow(/format/);
  expect(session.count).toBe(0);
});

test('admission starts with existing batch usage and handles remaining budget', () => {
  const session = createImageFileAdmission([
    { file: file('original.jpg', 3 * MB) as File },
  ], policy);
  expect(session.count).toBe(1);
  expect(session.totalBytes).toBe(3 * MB);
  expect(session.check(file('too-large.png', 6 * MB))).toBe('total-size');
  expect(session.check(file('good.png', 5 * MB))).toBeUndefined();
  session.accept(file('good.png', 5 * MB));
  expect(session.check(file('another.png', 1))).toBe('file-count');
});

test('image dimension checks reject non-positive, non-finite and oversized decoded images', () => {
  const limits = { maxDimension: 12000, maxPixels: 20_000_000 };
  expect(imageDimensionsWithinLimits(4000, 5000, limits)).toBeTruthy();
  expect(imageDimensionsWithinLimits(5000, 5000, limits)).toBeFalsy();
  expect(imageDimensionsWithinLimits(12001, 100, limits)).toBeFalsy();
  expect(imageDimensionsWithinLimits(0, 500, limits)).toBeFalsy();
  expect(imageDimensionsWithinLimits(Number.NaN, 100, limits)).toBeFalsy();
  expect(imageDimensionsWithinLimits(100.5, 100, limits)).toBeFalsy();
  expect(extensionOfFile('CAPTURE.PNG')).toBe('png');
});

test('sequential batch runs one job at a time and reports progress in order', async () => {
  const started: number[] = [];
  const finished: number[] = [];
  const progress: number[] = [];
  const summary = await runSequentialBatch([1, 2, 3], {
    process: async (value) => {
      started.push(value);
      await Promise.resolve();
      finished.push(value);
    },
    progress: (state) => progress.push(state.finished),
  });
  expect(started).toEqual([1, 2, 3]);
  expect(finished).toEqual([1, 2, 3]);
  expect(progress).toEqual([1, 2, 3]);
  expect(summary).toEqual({ completed: 3, failed: 0, finished: 3, total: 3, cancelled: false });
});

test('sequential batch preserves successes and reports per-item failures', async () => {
  const failures: Array<{ value: string; reason: string }> = [];
  const summary = await runSequentialBatch(['first', 'bad', 'last'], {
    process: async (value) => {
      if (value === 'bad') throw new Error('invalid image');
    },
    failed: (value, error) => failures.push({
      value, reason: error instanceof Error ? error.message : String(error),
    }),
  });
  expect(failures).toEqual([{ value: 'bad', reason: 'invalid image' }]);
  expect(summary).toEqual({ completed: 2, failed: 1, finished: 3, total: 3, cancelled: false });
});

test('sequential batch respects cancellation at the next item boundary', async () => {
  const visited: number[] = [];
  let stop = false;
  const summary = await runSequentialBatch([1, 2, 3, 4], {
    cancelled: () => stop,
    process: async (value) => {
      visited.push(value);
      if (value === 2) stop = true;
    },
  });
  expect(visited).toEqual([1, 2]);
  expect(summary).toEqual({ completed: 2, failed: 0, finished: 2, total: 4, cancelled: true });
});

test('sequential batch handles empty input without invoking callbacks', async () => {
  let called = false;
  const summary = await runSequentialBatch([], {
    process: () => { called = true; },
    progress: () => { called = true; },
  });
  expect(called).toBeFalsy();
  expect(summary).toEqual({ completed: 0, failed: 0, finished: 0, total: 0, cancelled: false });
});
