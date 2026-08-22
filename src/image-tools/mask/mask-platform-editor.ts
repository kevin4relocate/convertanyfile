import type { ImageEditScope } from '../../platform/image-tools/types';
import { mountBatchMaskEditor } from '../shared/batch-mask-editor';

const VALID_SCOPES = new Set<ImageEditScope>(['shared', 'individual']);

function syncPlatformScope(root: HTMLElement, mode: ImageEditScope): void {
  root.dataset.platformScope = mode;
  const shell = root.querySelector<HTMLElement>('[data-role="image-batch-shell"]');
  if (shell) shell.dataset.platformScope = mode;
}

export function mountMaskBatchPlatformEditor(root: HTMLElement): void {
  if (root.dataset.platformMigration !== 'phase-2') {
    throw new Error('Mask batch platform shell is missing its Phase 2 migration marker.');
  }
  if (!root.querySelector('[data-platform-shell="batch-v1"]')) {
    throw new Error('Mask batch platform shell is unavailable.');
  }

  root.dataset.platformRuntime = 'batch-v1';
  syncPlatformScope(root, 'shared');

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('[data-edit-mode]');
    const requested = button?.dataset.editMode as ImageEditScope | undefined;
    if (requested && VALID_SCOPES.has(requested)) syncPlatformScope(root, requested);
  });

  mountBatchMaskEditor(root);
}
