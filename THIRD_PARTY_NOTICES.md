# Third-Party Notices

## libarchive-wasm compatibility layer

ConvertAnyFile's live Archive converter uses the `ofk/libarchive-wasm` wrapper only for 7Z and RAR input decoding.

- Wrapper project: `ofk/libarchive-wasm`
- Pinned upstream commit: `1d04437e404ffad8b3a490abb36234dbdff59afa`
- Wrapper license: MIT
- Wrapper copyright: Copyright (c) 2021 ofk

The generated WebAssembly runtime contains libarchive and codec functionality compiled by the upstream project. The MIT notice above describes the JavaScript/WASM wrapper project; it should not be treated as a statement that every component compiled into the runtime has the same license. Required upstream notices must be retained according to the licenses of the components included by the pinned runtime, and the dependency/license review should be repeated whenever the runtime pin or build composition changes.

Production builds download the generated JavaScript runtime, WebAssembly binary, and wrapper MIT license from the pinned commit. Every downloaded asset is verified against its expected Git blob SHA before it is copied into the static site output. The deployed wrapper license is available beside the runtime at `/vendor/libarchive-wasm/LICENSE.txt`.

The runtime is not used for normal ZIP, TAR, TAR.GZ, or GZIP input. It is lazy-loaded in the Archive Web Worker only for 7Z/RAR decoding.

## U²-Net / U²-NetP

The Remove Background preview uses the compact U²-NetP salient-object segmentation model originally published with U²-Net by Xuebin Qin, Zichen Zhang, Chenyang Huang, Masood Dehghan, Osmar R. Zaiane, and Martin Jagersand.

- Upstream project: `xuebinqin/U-2-Net`
- License: Apache License 2.0
- Runtime model mirror: `edgetools/u2netp`
- Model file: `u2netp.onnx`
- Pinned SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`

The model is copied into the site runtime during build and served from the same origin. Source images are not sent to the model mirror.

## ONNX Runtime Web

The Remove Background preview uses ONNX Runtime Web 1.27.0 from Microsoft for browser-side WASM inference.

- Upstream project: `microsoft/onnxruntime`
- Package: `onnxruntime-web@1.27.0`
- License: MIT

The WASM-only runtime files are copied into the site runtime during build and served from the same origin. The image tool sets the WASM runtime to one thread to avoid requiring cross-origin-isolation headers.
