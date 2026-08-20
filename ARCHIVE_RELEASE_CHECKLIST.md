# Archive Release Checklist

Use this checklist before promoting the Archive category from Preview to production.

## Product contract

- [ ] Shared `ConverterShell` and `converter-app.ts` remain the only batch queue, progress, cancel, retry, download, and ZIP-packaging implementation.
- [ ] Archive behavior is exposed only through the `archive` `EngineAdapter`.
- [ ] Every public pair route performs a real conversion and renders through `ConverterPageFrame`.
- [ ] 7Z and RAR remain input-only until a separately certified writer path exists.
- [ ] No BZIP2, XZ, encrypted-archive, multi-volume, or other format claim is published without a tested runtime path.

## Certified Preview inputs

- [ ] ZIP signature validation and CRC verification.
- [ ] 7Z signature validation before WASM decode.
- [ ] 7Z regular-file/directory decode through pinned libarchive WASM.
- [ ] RAR4 and RAR5 signature validation before WASM decode.
- [ ] RAR4 and RAR5 regular-file/directory decode through pinned libarchive WASM.
- [ ] Encrypted/password-protected 7Z/RAR input is rejected permanently.
- [ ] TAR header checksum validation.
- [ ] TAR PAX extended-path compatibility.
- [ ] GNU TAR long-name compatibility.
- [ ] TAR.GZ / TGZ gzip stream + TAR validation.
- [ ] Single-file GZIP / GZ stream handling with deterministic recovered filename.

## V4 production-hardening gates

- [ ] TAR hard links, symbolic links, device entries, FIFOs, and unknown special entry types are rejected instead of silently disappearing.
- [ ] Duplicate NFC-normalized archive paths are rejected before any output writer runs.
- [ ] Archive paths containing ASCII control characters are rejected.
- [ ] Archive paths over the 4,096-byte browser safety ceiling are rejected before output.
- [ ] Truncated real 7Z input passes signature admission but fails conversion permanently as corrupt/incomplete.
- [ ] Truncated real RAR input passes signature admission but fails conversion permanently as corrupt/incomplete.
- [ ] Password-protected 7Z/RAR failures classify as `unsupported-input`, not `corrupt-input`.
- [ ] Missing/failed libarchive runtime classifies as retryable `engine-crash` and exposes Retry.
- [ ] Unicode filenames and zero-byte regular files survive certified native repacking.
- [ ] The main Archive dropzone visibly lists 7Z and RAR in addition to native formats.
- [ ] The WASM path independently enforces the 75 MB source-file ceiling before copying bytes into WASM memory.
- [ ] Do not lower the 7Z/RAR source limit below the shared 75 MB policy without measured browser-memory evidence from Preview testing.

## WASM supply chain

- [ ] libarchive-wasm source is pinned to an immutable upstream commit.
- [ ] JavaScript, WASM, and MIT license files are verified against expected Git blob SHA values during build.
- [ ] Generated vendor assets are not committed to the repository.
- [ ] Deployed libarchive JavaScript/WASM is served as a same-origin static ConvertAnyFile asset.
- [ ] The 7Z/RAR runtime is lazy-loaded only when those input formats are converted.
- [ ] A missing or failed WASM runtime is a recoverable engine failure and exposes Retry.
- [ ] Normal ZIP/TAR/GZIP conversion does not require libarchive initialization.

## Certified Preview outputs

- [ ] ZIP output opens with CRC verification after conversion.
- [ ] ZIP Store profile produces a valid STORE archive.
- [ ] ZIP Balanced profile produces valid DEFLATE output.
- [ ] ZIP Maximum profile produces valid DEFLATE output.
- [ ] TAR output passes header checksum validation and ends with the required zero blocks.
- [ ] TAR.GZ output decompresses to a valid TAR archive.

## Fidelity

- [ ] Nested safe paths survive native ZIP ↔ TAR-family repacking.
- [ ] Empty directory entries survive where the source decoder and target represent them.
- [ ] File modification times survive within target-format precision.
- [ ] Basic Unix permission bits survive native ZIP/TAR paths where compatible metadata is available.
- [ ] 7Z/RAR entries receive deterministic safe target permissions when portable mode metadata is not exposed.
- [ ] File payload bytes remain byte-identical after supported repacking paths.
- [ ] Unicode filenames survive supported repacking without mojibake.
- [ ] Zero-byte regular files remain zero-byte regular files.
- [ ] Product copy does not promise preservation of symlinks, hard links, UID/GID ownership, ACLs, xattrs, sparse-file metadata, or vendor-specific metadata.
- [ ] Unsupported links and special entries are rejected instead of silently disappearing.

## Archive safety

- [ ] Reject `../` parent traversal.
- [ ] Reject absolute POSIX paths.
- [ ] Reject Windows drive-root paths.
- [ ] Reject null-containing paths and other ASCII control characters.
- [ ] Reject duplicate normalized paths.
- [ ] Reject corrupt ZIP CRCs.
- [ ] Reject invalid TAR checksums.
- [ ] Reject encrypted or unsupported ZIP input with a permanent error.
- [ ] Reject encrypted/password-protected 7Z/RAR input with a permanent error.
- [ ] Reject symlink, hard-link, device-node, socket, pipe, FIFO, and unsupported special entries on every parser path that can expose them.
- [ ] Maximum 2,000 archive entries.
- [ ] Maximum 100 MB expanded size for one file entry.
- [ ] Maximum 250 MB total expanded content per source archive.
- [ ] Maximum 75 MB source archive.
- [ ] Maximum 250 MB source batch and 20 source files.
- [ ] Expansion limits are enforced while decoding, including the WASM path, not only from compressed-size metadata.

## Browser lifecycle

- [ ] Archive parsing and repacking run in a Web Worker.
- [ ] Worker startup timeout is recoverable.
- [ ] Worker conversion timeout is recoverable.
- [ ] Cancel terminates the active worker and invalidates stale completion results.
- [ ] A later conversion creates a fresh worker after reset/crash/timeout.
- [ ] TGZ/GZIP input and TGZ output are hidden when native gzip streams are unavailable.
- [ ] 7Z/RAR input is hidden when WebAssembly is unavailable.

## UX and SEO

- [ ] Main Archive page identifies itself as `Archive Converter`, not generic `File Converter`.
- [ ] Archive selection and visible dropzone copy accurately list 7Z, RAR, ZIP, TAR, TAR.GZ/TGZ and GZIP/GZ.
- [ ] Pair pages display TAR.GZ and GZIP labels instead of internal `tgz` / `gz` IDs.
- [ ] `/7z-to-zip/`, `/7z-to-tar/`, `/7z-to-tar-gz/` are real converter routes.
- [ ] `/rar-to-zip/`, `/rar-to-tar/`, `/rar-to-tar-gz/` are real converter routes.
- [ ] 7Z/RAR pages clearly describe those formats as input-only.
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
- [ ] Real 7Z input converts through the WASM path.
- [ ] Real RAR4 input converts through the WASM path.
- [ ] Real RAR5 input converts through the WASM path.
- [ ] Real encrypted RAR input is rejected.
- [ ] Corrupt/truncated 7Z and RAR fail safely without a Retry action.
- [ ] A blocked WASM runtime fails temporarily and exposes Retry.
- [ ] Test fixtures are pinned and Git-blob verified before Playwright execution.

## Next-tier format admission

Before adding another archive family such as BZIP2, TAR.BZ2, XZ, or TAR.XZ:

1. define whether the format is a compression stream, archive container, or combined family;
2. reuse the pinned libarchive runtime only when its codec behavior is verified for that family;
3. define readable vs writable capability separately;
4. add signature detection before runtime initialization when practical;
5. enforce the same path and expanded-memory safety policy at the runtime boundary;
6. test corrupt, unsupported-codec, oversized, and metadata edge cases explicitly;
7. add pair routes only after real conversion tests pass in Chromium, Firefox, and WebKit;
8. do not assume an input-capable format is also safe or useful as a public output.
