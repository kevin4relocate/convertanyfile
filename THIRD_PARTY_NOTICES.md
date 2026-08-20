# Third-Party Notices

## libarchive-wasm compatibility layer

ConvertAnyFile's Archive Preview uses the `ofk/libarchive-wasm` wrapper only for 7Z and RAR input decoding.

- Wrapper project: `ofk/libarchive-wasm`
- Pinned upstream commit: `1d04437e404ffad8b3a490abb36234dbdff59afa`
- Wrapper license: MIT
- Wrapper copyright: Copyright (c) 2021 ofk

The generated WebAssembly runtime contains libarchive and codec functionality compiled by the upstream project. The MIT notice above describes the JavaScript/WASM wrapper project; it should not be treated as a statement that every component compiled into the runtime has the same license. A production release must complete a dependency/license notice review for the compiled runtime and retain any required upstream notices.

For Preview builds, the build downloads the generated JavaScript runtime, WebAssembly binary, and wrapper MIT license from the pinned commit. Every downloaded asset is verified against its expected Git blob SHA before it is copied into the static site output. The deployed wrapper license is available beside the runtime at `/vendor/libarchive-wasm/LICENSE.txt`.

The runtime is not used for normal ZIP, TAR, TAR.GZ, or GZIP input. It is lazy-loaded in the Archive Web Worker only for 7Z/RAR decoding.
