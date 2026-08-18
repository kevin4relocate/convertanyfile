# Homepage Converter Interaction Contract

The homepage exposes Image and Data as equal first-class converter choices without merging their engine contracts.

- Images is the default homepage category.
- Images and Data are available as accessible tabs above the converter.
- Each category keeps its own independent queue and lazy-loaded engine state.
- Dropping or pasting a batch containing only recognized Data extensions routes the batch to Data automatically.
- Dropping or pasting a batch containing only recognized Image extensions routes the batch to Images automatically.
- Mixed or unknown batches stay on the currently selected category so unsupported files are handled by that converter's normal validation path instead of being silently split.
- Dedicated `/image-converter/`, `/data-converter/`, and format-pair routes remain unchanged.
