export type DeterministicToolId =
  | 'resize-image'
  | 'compress-image'
  | 'rotate-flip-image'
  | 'crop-image'
  | 'blur-image'
  | 'remove-image-metadata';

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
  shape: 'rect' | 'circle';
  aspect: 'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlurSettings = {
  scope: 'whole' | 'region';
  radius: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DeterministicSettings =
  | ResizeSettings
  | CompressSettings
  | MetadataSettings
  | RotateFlipSettings
  | CropSettings
  | BlurSettings;

export function defaultSettingsFor(toolId: DeterministicToolId): DeterministicSettings {
  switch (toolId) {
    case 'resize-image':
      return { mode: 'pixels', width: 1920, height: 1080, percent: 50, lockAspect: true, pixelAnchor: 'width', fitWidth: 1920, fitHeight: 1080 };
    case 'compress-image':
      return { format: 'webp', quality: 82 };
    case 'remove-image-metadata':
      return { format: 'source', quality: 92 };
    case 'rotate-flip-image':
      return { rotation: 0, flipHorizontal: false, flipVertical: false };
    case 'crop-image':
      return { shape: 'rect', aspect: 'free', x: 8, y: 8, width: 84, height: 84 };
    case 'blur-image':
      return { scope: 'whole', radius: 12, x: 25, y: 25, width: 50, height: 50 };
  }
}
