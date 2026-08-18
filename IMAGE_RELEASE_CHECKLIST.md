# Image Production Release Checklist

This checklist is the release contract for the first production category on ConvertAnyFile.net.

## Automated gates — required before merge

- [ ] `npm ci --no-audit --no-fund`
- [ ] `npm run check`
- [ ] `npm run build`
- [ ] Chromium / Firefox / WebKit Playwright suite
- [ ] generated sitemap, canonicals, unique titles and internal links
- [ ] every live converter route uses `ConverterPageFrame`
- [ ] every dedicated converter keeps the picker in the first 1440×900 viewport
- [ ] homepage picker remains above fold
- [ ] PNG → JPG real WASM conversion and JPEG magic bytes
- [ ] transparent PNG → JPG produces white background pixels
- [ ] 50-file batch cap and internally scrollable queue
- [ ] append-by-drag: 10 initial files + 5 dropped files = 15 jobs
- [ ] PCX → JPG real WASM regression
- [ ] TGA → JPG real WASM regression
- [ ] real multi-size PNG-backed ICO → JPG regression
- [ ] corrupt/unsupported deterministic failure has no Retry / no Convert remaining loop
- [ ] every certified output is present in the runtime-writable UI
- [ ] every certified output encodes from the PNG fixture
- [ ] every generated certified output is admitted again and decodes back to JPG
- [ ] no browser console/page errors in conversion matrix

## Product-certified outputs

1. JPG
2. PNG
3. WebP
4. AVIF
5. TIFF
6. GIF
7. BMP
8. ICO
9. JXL
10. JP2
11. HDR
12. EXR
13. PCX
14. TGA
15. QOI
16. PNM

The runtime scan is authoritative. HEIC/HEIF is intentionally **input-only** in this release because the packaged ImageMagick WASM build does not report a HEIC writer. ConvertAnyFile must not advertise an encoder that the deployed runtime does not actually provide.

## Input policy

The detector recognizes 57 filename extensions, but recognition is not a guarantee that every real-world variant decodes. Admission also requires signature validation and runtime decoder capability.

Camera RAW remains best-effort until representative real-camera fixtures are added model by model.

## Fidelity policy

- One output image is created per input file.
- EXIF orientation is normalized into visible pixels before write.
- Opaque destinations use deterministic white when source transparency cannot be represented.
- Animated GIF/WebP, multi-page TIFF, layered images, and multi-size icon containers are not claimed to preserve every frame/page/layer/size.
- ICO input chooses the best valid PNG-backed frame when possible and retains legacy DIB/BMP fallback.

## Manual real-file acceptance before public launch

Automated fixtures protect engineering behavior, but a final launch smoke should still use ordinary files created by real applications/devices:

### Must pass

- [ ] JPG photo
- [ ] PNG screenshot
- [ ] transparent PNG logo
- [ ] WebP photo
- [ ] transparent WebP graphic
- [ ] AVIF image
- [ ] HEIC photo from iPhone → JPG/PNG/WebP/AVIF (input path only)
- [ ] GIF still
- [ ] animated GIF — verify single-image policy is understandable
- [ ] TIFF from a scanner/editor
- [ ] multi-page TIFF — verify single-image policy is understandable
- [ ] BMP
- [ ] multi-size ICO
- [ ] PCX
- [ ] TGA 24-bit
- [ ] TGA 32-bit alpha
- [ ] JP2

### Advanced

- [ ] JXL
- [ ] QOI
- [ ] PNM/PPM/PGM/PBM/PAM family
- [ ] HDR
- [ ] EXR
- [ ] SVG simple
- [ ] SVG with fonts/filters/embedded image
- [ ] PSD
- [ ] PSB
- [ ] DDS

### RAW — best effort

- [ ] DNG
- [ ] CR2
- [ ] CR3
- [ ] NEF
- [ ] ARW
- [ ] RAF
- [ ] ORF
- [ ] RW2

Do not promote a RAW family from best-effort to certified input without a stable real-camera fixture and browser regression.
