import { File } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { detectImage } from '../src/engines/image/detect';

const JPEG_2X2 = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCpRRRX4ef0gf/Z', 'base64');
const PNG_2X2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==', 'base64');
const GIF_1X1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
const WEBP_SIGNATURE = Buffer.from([0x52,0x49,0x46,0x46,0x16,0x00,0x00,0x00,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x20,0x0a,0x00,0x00,0x00]);

const makeFile = (name: string, bytes: Buffer): globalThis.File => new File([bytes], name) as unknown as globalThis.File;

test('common image signatures win over misleading filename extensions', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Pure detection regression only needs one project');

  const cases = [
    { name: 'generated-image.png', bytes: JPEG_2X2, extension: 'jpg', label: 'JPEG image' },
    { name: 'camera-export.jpg', bytes: PNG_2X2, extension: 'png', label: 'PNG image' },
    { name: 'animation.webp', bytes: GIF_1X1, extension: 'gif', label: 'GIF image' },
    { name: 'delivery.gif', bytes: WEBP_SIGNATURE, extension: 'webp', label: 'WebP image' },
  ] as const;

  for (const item of cases) {
    const detected = await detectImage(makeFile(item.name, item.bytes));
    expect(detected, item.name).toMatchObject({ extension: item.extension, label: item.label, confidence: 'signature' });
  }
});
