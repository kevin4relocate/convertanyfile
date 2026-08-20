# Archive Release Checklist

Use this checklist before promoting the Archive category from Preview to production.

## Product contract

- [ ] Shared `ConverterShell` and `converter-app.ts` remain the only batch queue, progress, cancel, retry, download, and ZIP-packaging implementation.
- [ ] Archive behavior is exposed only through the `archive` `EngineAdapter`.
- [ ] Every public pair route performs a real conversion and renders through `ConverterPageFrame`.
- [ ] No RAR, 7Z, BZIP2, XZ, encrypted-archive, multi-volume, or other format claim is published without a tested runtime path.

## Certified Preview inputs

- [ ] ZIP signature validation and CRC verification.
- [ ] TAR header checksum validation.
- [ ] TAR PAX extended-path compatibility.
- [ ] GNU TAR long-name compatibility.
- [ ] TAR.GZ / TGZ gzip stream + TAR validation.
- [ ] Single-file GZIP / GZ stream handling with deterministic recovered filename.

## Certified Preview outputs

- [ ] ZIP output opens with CRC verification after conversion.
- [ ] ZIP Store profile produces a valid STORE archive.
- [ ] ZIP Balanced profile produces valid DEFLATE output.
- [ ] ZIP Maximum profile produces valid DEFLATE output.
- [ ] TAR output passes header checksum validation and ends with the required zero blocks.
- [ ] TAR.GZ output decompresses to a valid TAR archive.

## Fidelity

- [ ] Nested safe paths survive ZIP ↔ TAR-family repacking.
- [ ] Empty directory entries survive where both source and target represent them.
- [ ] File modification times survive within target-format precision.
- [ ] Basic Unix permission bits survive where source and target expose compatible metadata.
- [ ] File payload bytes remain byte-identical after a round trip through each certified path.
- [ ] Product copy does not promise preservation of symlinks, hard links, UID/GID ownership, ACLs, xattrs, sparse-file metadata, or vendor-specific metadata.

## Archive safety

- [ ] Reject `../` parent traversal.
- [ ] Reject absolute POSIX paths.
- [ ] Reject Windows drive-root paths.
- [ ] Reject null-containing paths.
- [ ] Reject corrupt ZIP CRCs.
- [ ] Reject invalid TAR checksums.
- [ ] Reject encrypted or unsupported ZIP input with a permanent error.
- [ ] Maximum 2,000 archive entries.
- [ ] Maximum 100 MB expanded size for one file entry.
- [ ] Maximum 250 MB total expanded content per source archive.
- [ ] Maximum 75 MB source archive.
- [ ] Maximum 250 MB source batch and 20 source files.
- [ ] Expansion limits are enforced while decoding, not only from compressed-size metadata.

## Browser lifecycle

- [ ] Archive parsing and repacking run in a Web Worker.
- [ ] Worker startup timeout is recoverable.
- [ ] Worker conversion timeout is recoverable.
- [ ] Cancel terminates the active worker and invalidates stale completion results.
- [ ] A later conversion creates a fresh worker after reset/crash/timeout.
- [ ] TGZ/GZIP input and TGZ output are hidden when native gzip streams are unavailable.

## UX and SEO

- [ ] Main Archive page identifies itself as `Archive Converter`, not generic `File Converter`.
- [ ] Dropzone lists ZIP, TAR, TAR.GZ/TGZ and GZIP/GZ accurately.
- [ ] Pair pages display TAR.GZ and GZIP labels instead of internal `tgz` / `gz` IDs.
- [ ] Archive pair pages use archive-specific explanatory content and FAQ.
- [ ] Archive pages appear in generated sitemap and use canonical `https://convertanyfile.net` URLs.
- [ ] Pair pages remain within the shared first-viewport converter-frame contract.
- [ ] Desktop and mobile layout regressions stay green.

## Browser matrix

- [ ] Chromium desktop.
- [ ] Chromium mobile emulation.
- [ ] Firefox desktop.
- [ ] WebKit desktop.
- [ ] GZIP/TAR.GZ capability behavior is verified independently in every browser project.

## Next-tier format admission

Before adding a new archive family such as 7Z or RAR:

1. pin a browser-compatible WASM runtime and review its license;
2. keep the runtime lazy-loaded behind the Archive engine;
3. define readable vs writable capability separately;
4. add signature detection before runtime initialization when practical;
5. enforce the same path and expanded-memory safety policy at the runtime boundary;
6. test encrypted, multi-volume, corrupt, unsupported-codec, and oversized archives explicitly;
7. add pair routes only after real conversion tests pass in Chromium, Firefox, and WebKit;
8. do not assume an input-capable format is also safe or useful as a public output.
