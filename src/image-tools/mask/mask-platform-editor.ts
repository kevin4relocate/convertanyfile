import type { ImageEditScope } from '../../platform/image-tools/types';
import { mountAdvancedCanvasController } from '../canvas/advanced-canvas-controller';
import { resolveScopedSettings } from '../core/batch-state';
import { mountBatchMaskEditor } from '../shared/batch-mask-editor';

const VALID_SCOPES = new Set<ImageEditScope>(['shared', 'individual']);

export function resolveMaskScopeSettings<TSettings>(mode:ImageEditScope,sharedSettings:TSettings,individualSettings?:TSettings):TSettings {
  return resolveScopedSettings(mode,sharedSettings,individualSettings);
}

function syncPlatformScope(root:HTMLElement,mode:ImageEditScope):void {
  root.dataset.platformScope=mode;
  const shell=root.querySelector<HTMLElement>('[data-role="image-batch-shell"]');
  if(shell)shell.dataset.platformScope=mode;
}

function readScopeFromUi(root:HTMLElement):ImageEditScope|undefined {
  const selected=[...root.querySelectorAll<HTMLElement>('[data-edit-mode]')].find(button=>button.getAttribute('aria-checked')==='true');
  const mode=selected?.dataset.editMode as ImageEditScope|undefined;
  return mode&&VALID_SCOPES.has(mode)?mode:undefined;
}

function mountRepairPreviewFeedback(root:HTMLElement):void {
  const list=root.querySelector<HTMLElement>('[data-role="batch-list"]');
  const empty=root.querySelector<HTMLElement>('[data-role="result-empty"]');
  const label=root.querySelector<HTMLElement>('[data-role="result-label"]');
  if(!list||!empty||!label)return;
  const title=empty.querySelector<HTMLElement>('span');
  const copy=empty.querySelector<HTMLElement>('small');
  const sync=():void=>{
    const activeError=list.querySelector<HTMLElement>('.gemini-file-card.is-sample.has-error .gemini-file-copy small');
    if(activeError?.textContent){
      empty.hidden=false;
      label.textContent='Repair failed';
      if(title)title.textContent='Unable to create preview';
      if(copy)copy.textContent=activeError.textContent;
      return;
    }
    if(!empty.hidden){
      if(label.textContent==='Repair failed')label.textContent='Run repair to preview';
      if(title)title.textContent='Result preview';
      if(copy)copy.textContent='The selected image result appears here after repair.';
    }
  };
  new MutationObserver(sync).observe(list,{childList:true,subtree:true,characterData:true});
  sync();
}

export function mountMaskBatchPlatformEditor(root:HTMLElement):void {
  if(root.dataset.platformMigration!=='phase-2')throw new Error('Mask batch platform shell is missing its Phase 2 migration marker.');
  if(!root.querySelector('[data-platform-shell="batch-v1"]'))throw new Error('Mask batch platform shell is unavailable.');
  root.dataset.platformRuntime='batch-v1';syncPlatformScope(root,'shared');

  const scopeButtons=[...root.querySelectorAll<HTMLElement>('[data-edit-mode]')];
  const observer=new MutationObserver(()=>{const mode=readScopeFromUi(root);if(mode)syncPlatformScope(root,mode);});
  scopeButtons.forEach(button=>observer.observe(button,{attributes:true,attributeFilter:['aria-checked']}));
  root.addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLElement>('[data-edit-mode]'),requested=button?.dataset.editMode as ImageEditScope|undefined;if(requested&&VALID_SCOPES.has(requested))syncPlatformScope(root,requested);});

  mountBatchMaskEditor(root);
  mountRepairPreviewFeedback(root);
  if(root.dataset.advancedCanvas==='true')mountAdvancedCanvasController(root);
  const mountedScope=readScopeFromUi(root);if(mountedScope)syncPlatformScope(root,mountedScope);
}
