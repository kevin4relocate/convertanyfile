import { DEFAULT_JPEG_QUALITY, DEFAULT_WEBP_QUALITY } from '../core/output-quality';

export type DeterministicToolId =
  | 'resize-image'
  | 'compress-image'
  | 'rotate-flip-image'
  | 'crop-image'
  | 'blur-image'
  | 'fade-image-edges'
  | 'remove-image-metadata'
  | 'grayscale-image'
  | 'sepia-image'
  | 'invert-image';

export type ColorEffectSettings = { intensity: number };

export type OutputChoice = 'source' | 'png' | 'jpg' | 'webp';

export type ResizeSettings = {
  mode: 'pixels' | 'percent' | 'fit';
  width: number;
  height: number;
  percent: number;
  lockAspect: boolean;
  pixelAnchor: 'width' | 'height';
  fitWidth: number;
  fitHeight: number;
};

export type CompressSettings = {
  format: OutputChoice;
  quality: number;
};

export type MetadataSettings = {
  format: OutputChoice;
  quality: number;
};

export type RotateFlipSettings = {
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
};

export type CropSettings = {
  shape: 'rect' | 'square' | 'circle' | 'triangle';
  aspect: 'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlurSettings = {
  scope: 'whole' | 'region';
  shape: 'rect' | 'circle';
  radius: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EdgeFadeSettings = {
  effectMode: 'subtitle-safe' | 'natural-fade';
  preset: 'subtitle-soft' | 'subtitle-strong' | 'paper-wash' | 'natural' | 'custom';
  direction: 'bottom' | 'top' | 'left' | 'right' | 'all';
  style: 'smooth' | 'organic';
  depth: number;
  radius: number;
  wash: number;
  softness: number;
  contrast: number;
  texture: number;
  washColor: 'dark' | 'light';
  showGuide: boolean;
};

export type DeterministicSettings =
  | ResizeSettings
  | CompressSettings
  | MetadataSettings
  | RotateFlipSettings
  | CropSettings
  | BlurSettings
  | EdgeFadeSettings
  | ColorEffectSettings;

export function defaultSettingsFor(toolId: DeterministicToolId): DeterministicSettings {
  switch (toolId) {
    case 'resize-image':
      return { mode: 'pixels', width: 1920, height: 1080, percent: 50, lockAspect: true, pixelAnchor: 'width', fitWidth: 1920, fitHeight: 1080 };
    case 'compress-image':
      return { format: 'webp', quality: DEFAULT_WEBP_QUALITY };
    case 'remove-image-metadata':
      return { format: 'source', quality: DEFAULT_JPEG_QUALITY };
    case 'rotate-flip-image':
      return { rotation: 0, flipHorizontal: false, flipVertical: false };
    case 'crop-image':
      return { shape: 'rect', aspect: 'free', x: 0, y: 0, width: 100, height: 100 };
    case 'blur-image':
      return { scope: 'whole', shape: 'rect', radius: 12, x: 25, y: 25, width: 50, height: 50 };
    case 'grayscale-image':
    case 'sepia-image':
    case 'invert-image':
      return { intensity: 100 };
    case 'fade-image-edges':
      return {
        effectMode: 'subtitle-safe',
        preset: 'subtitle-strong',
        direction: 'bottom',
        style: 'smooth',
        depth: 55,
        radius: 85,
        wash: 35,
        softness: 50,
        contrast: 45,
        texture: 0,
        washColor: 'dark',
        showGuide: true,
      };
  }
}
