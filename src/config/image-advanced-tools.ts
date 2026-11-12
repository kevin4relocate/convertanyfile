import type { ImageToolDefinition, ImageToolManifestEntry } from '../platform/image-tools/types';

export type AdvancedControl = {
  key: string;
  label: string;
  type: 'number' | 'text' | 'color' | 'select';
  initial: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly {value:string;label:string}[];
};
export type AdvancedImageTool = ImageToolDefinition & {
  controls: readonly AdvancedControl[];
  hints: readonly string[];
  summary: string;
  navigationHint: string;
  maxOutputs: number;
};
const number=(key:string,label:string,initial:number,min:number,max:number,step=1):AdvancedControl=>({key,label,type:'number',initial:String(initial),min,max,step});
const color=(key:string,label:string,initial:string):AdvancedControl=>({key,label,type:'color',initial});
const text=(key:string,label:string,initial:string):AdvancedControl=>({key,label,type:'text',initial});
const select=(key:string,label:string,initial:string,options:readonly string[]):AdvancedControl=>({
  key,label,type:'select',initial,options:options.map(value=>({value,label:value.replaceAll('-',' ')})),
});
const common = {
  acceptedExtensions: ['jpg','jpeg','png','webp'] as const,
  acceptedMimeTypes: ['image/jpeg','image/png','image/webp'] as const,
  maxFileBytes: 10*1024*1024,
  maxPixels: 8_000_000,
  maxDimension: 8000,
  maxFiles: 1,
  status:'live' as const,
  eyebrow:'Advanced Image Editing · Browser Only',
  category:'transform' as const,
  maxOutputs:1,
};
type AdvancedDefinition = Omit<AdvancedImageTool,'title'|'policyNote'|'id'|'downloadSuffix'|'eyebrow'|'status'|'acceptedExtensions'|'acceptedMimeTypes'|'maxFileBytes'|'maxFiles'|'maxPixels'|'maxDimension'|'category'|'maxOutputs'> &
 Partial<Pick<AdvancedImageTool,'maxFileBytes'|'maxFiles'|'maxPixels'|'maxDimension'|'category'|'maxOutputs'>> &
 {policy:string};
const definitions: readonly AdvancedDefinition[]=[
  { slug:'image-collage-maker',displayName:'Image Collage Maker',h1:'Create a photo collage online.',category:'geometry',maxFiles:12,
    description:'Arrange 2–12 JPG, PNG or WebP photos in a customizable collage grid, with adjustable gaps and background color. Fully local.',
    intro:'Build a tiled image collage from multiple photos, with even grid cells, consistent margins and preserved proportions.',
    controls:[number('columns','Columns',3,1,4),number('tileSize','Tile size (px)',320,120,800,20),number('gap','Tile spacing (px)',12,0,60),color('background','Background color','#FFFFFF')],
    hints:['Upload 2–12 images.','Set columns, tile size, spacing and background color.','Generate a full PNG collage and save it.'],
    summary:'Create a customizable, gap-spaced photo grid.',navigationHint:'Grid · spacing · color',
    policy:'Original images are scaled to fit within fixed tiles. Empty tile areas use the chosen background. Outputs are flattened PNGs.' },
  { slug:'split-image-into-grid',displayName:'Split Image into Grid',h1:'Cut one image into equal grid tiles.',category:'geometry',maxOutputs:64,
    description:'Split one image into up to 64 PNG image tiles using a chosen number of rows and columns, then download as ZIP.',
    intro:'Divide a poster or photo into regular rows and columns without changing the underlying pixels.',
    controls:[number('columns','Columns',3,1,8),number('rows','Rows',3,1,8)],
    hints:['Upload one photo or graphic.','Choose rows and columns, from 1 to 8 each.','Download a ZIP containing individually numbered PNG grid tiles.'],
    summary:'Export up to 64 numbered PNG grid tiles.',navigationHint:'Rows × columns · ZIP',
    policy:'Remainder pixels are assigned to the last tiles so no original pixels are discarded. The output is a ZIP of PNG images.' },
  { slug:'image-strip-slicer',displayName:'Image Strip Slicer',h1:'Slice a long image into image strips.',category:'geometry',maxOutputs:20,
    description:'Slice an image into 2–20 equally sized horizontal or vertical PNG strips, packaged in one ZIP.',
    intro:'Separate long screenshots, social banners and design strips into consistent horizontal or vertical segments.',
    controls:[select('direction','Strip direction','horizontal',['horizontal','vertical']),number('count','Strip count',4,2,20)],
    hints:['Upload one screenshot or image.','Choose horizontal slices (top-to-bottom) or vertical slices (left-to-right).','Download individual PNG segments in a ZIP.'],
    summary:'Slice screenshots into 2–20 strips.',navigationHint:'Horizontal · vertical · ZIP',
    policy:'Each strip retains the image pixel density. Remainder pixels are preserved in the final strip. Very narrow images cannot be divided into more strips than pixels.' },
  { slug:'add-text-to-image',displayName:'Add Text to Image',h1:'Add a readable caption to your image.',maxOutputs:1,
    description:'Write customizable caption text on a JPG, PNG or WebP image. Adjust font size, position and color without uploads.',
    intro:'Overlay a permanent text caption on an image with color, size and placement controls, then export a PNG.',
    controls:[text('text','Caption text','Hello world!'),number('fontSize','Font size (px)',48,12,180),color('color','Text color','#FFFFFF'),select('position','Position','bottom',['top','center','bottom']),color('outline','Outline color','#161616')],
    hints:['Upload one image.','Enter your caption and choose placement, font size and colors.','Generate a flattened PNG with the text embedded in its pixels.'],
    summary:'Embed captions with adjustable type and placement.',navigationHint:'Caption · font · position',
    policy:'Captions use the browser system sans-serif font and are wrapped within the image width. This is a flattened image, not an editable text layer.' },
  { slug:'speech-bubble-maker',displayName:'Speech Bubble Maker',h1:'Add a comic speech bubble to an image.',maxOutputs:1,
    description:'Put a customizable speech bubble with text over a photo, drawing or comic panel directly in your browser.',
    intro:'Create a rounded comic bubble with a speech tail and readable text; reposition and recolor it locally.',
    controls:[text('text','Bubble text','What a day!'),number('size','Bubble size (%)',55,30,85),select('position','Corner placement','top-left',['top-left','top-right','bottom-left','bottom-right']),color('fill','Bubble color','#FFFFFF'),color('color','Text color','#151515')],
    hints:['Upload an image.','Enter bubble text, size and placement.','Export the comic-style result as a PNG.'],
    summary:'Draw a comic bubble with a tail and caption.',navigationHint:'Bubble · tail · text',
    policy:'The speech bubble is a drawn overlay, not an AI detection feature. It may cover content below it; download a copy and keep your original.' },
  { slug:'duotone-image-effect',displayName:'Duotone Image Effect',h1:'Recolor a photo with two tones.',maxOutputs:1,
    description:'Turn a photo into a two-color duotone based on pixel luminance. Choose shadow and highlight colors.',
    intro:'Map dark regions to one color and bright regions to another while preserving the original transparency.',
    controls:[color('dark','Shadow color','#1B2544'),color('light','Highlight color','#F7D27B')],
    hints:['Upload an image.','Choose shadow and highlight colors.','Generate the duotone PNG.'],
    summary:'Create duotone colors from image luminance.',navigationHint:'Shadows · highlights',
    policy:'The effect replaces RGB values based on luminance. Transparency is preserved, but original photo color information is not retained in the new PNG.' },
  { slug:'vignette-image-effect',displayName:'Vignette Image Effect',h1:'Darken the edges of a photo.',maxOutputs:1,
    description:'Create a smooth adjustable vignette around the edges of a photo without changing its alpha values.',
    intro:'Darken outer corners and edges while keeping the image center visually prominent.',
    controls:[number('strength','Edge darkening (%)',65,0,100),number('radius','Clear center radius (%)',50,10,95)],
    hints:['Upload one image.','Adjust vignette strength and the clear center.','Export a PNG with darkened outer regions.'],
    summary:'Add smooth radial edge darkening.',navigationHint:'Strength · radius',
    policy:'This darkens RGB values toward the perimeter; it does not blur the image, mask the subject or modify alpha transparency.' },
  { slug:'temperature-tint-adjuster',displayName:'Temperature & Tint Adjuster',h1:'Adjust photo warmth and green–magenta tint.',maxOutputs:1,
    description:'Warm or cool image colors and shift green/magenta tint with independent sliders, locally in your browser.',
    intro:'Apply a quick white-balance-style adjustment to RGB pixels with separate temperature and tint controls.',
    controls:[number('temperature','Warm / cool (-100 to 100)',25,-100,100),number('tint','Magenta / green (-100 to 100)',0,-100,100)],
    hints:['Upload an image.','Set temperature and tint adjustments.','Save the color-adjusted PNG.'],
    summary:'Change apparent warmth and green–magenta tint.',navigationHint:'Warm · cool · tint',
    policy:'These are approximate RGB adjustments, not calibrated camera RAW white-balance corrections; extreme values may clip channels.' },
  { slug:'gamma-correction',displayName:'Gamma Correction',h1:'Adjust photo brightness with gamma.',maxOutputs:1,
    description:'Brighten midtones or darken shadows using gamma correction without resizing or altering image alpha.',
    intro:'Adjust the tone curve for midtones without a blanket additive brightness change.',
    controls:[number('gamma','Gamma',1.35,0.2,3,0.05)],
    hints:['Upload an image.','Set gamma below 1 for darker midtones or above 1 for brighter midtones.','Export the corrected PNG.'],
    summary:'Apply a controllable gamma tone curve.',navigationHint:'Midtones · curve',
    policy:'Gamma is applied to 8-bit sRGB channel values with alpha preserved. This is not HDR or color-profile-aware correction.' },
  { slug:'auto-image-levels',displayName:'Auto Image Levels',h1:'Automatically stretch image contrast levels.',maxOutputs:1,
    description:'Automatically adjust RGB channel levels from image histograms, with adjustable black/white clipping percentiles.',
    intro:'Use the distribution of visible pixel colors to map shadow and highlight ranges toward the available 8-bit channel range.',
    controls:[number('clip','Clip percentile (%)',1,0,5,0.5)],
    hints:['Upload one photo.','Select clipping between 0% and 5%.','Generate a PNG with channel levels adjusted.'],
    summary:'Stretch per-channel histograms to improve contrast.',navigationHint:'Histogram · black/white',
    policy:'Auto Levels stretches each RGB channel independently based on non-transparent pixels. It may shift colors on strongly tinted images; original data cannot be recovered once clipped.' },
  { slug:'rgb-channel-mixer',displayName:'RGB Channel Mixer',h1:'Mix RGB channels with custom weights.',maxOutputs:1,
    description:'Remap red, green and blue output channels using a 3×3 RGB mixing matrix, with nine adjustable weights.',
    intro:'Control how much source Red, Green and Blue contributes to each output channel. Explore custom color grading.',
    controls:[
      number('rr','Output R ← source R (%)',100,-200,200,5),number('rg','Output R ← source G (%)',0,-200,200,5),number('rb','Output R ← source B (%)',0,-200,200,5),
      number('gr','Output G ← source R (%)',0,-200,200,5),number('gg','Output G ← source G (%)',100,-200,200,5),number('gb','Output G ← source B (%)',0,-200,200,5),
      number('br','Output B ← source R (%)',0,-200,200,5),number('bg','Output B ← source G (%)',0,-200,200,5),number('bb','Output B ← source B (%)',100,-200,200,5),
    ],
    hints:['Upload an image.','Adjust the 3×3 channel weights; 100% on the diagonal preserves original RGB.','Download the mixed-color PNG.'],
    summary:'Apply a custom nine-weight RGB color matrix.',navigationHint:'3×3 matrix · RGB',
    policy:'Negative and above-100% weights are supported, but values outside 0–255 are clipped. The tool preserves the original alpha channel.' },
  { slug:'straighten-image',displayName:'Straighten Image',h1:'Straighten an image by a few degrees.',category:'geometry',maxOutputs:1,
    description:'Rotate an image by a custom angle from -30° to +30°, with transparent expanded canvas or original-size crop.',
    intro:'Correct a slightly tilted horizon using precise rotation while controlling the transparent corners.',
    controls:[number('angle','Rotation angle (degrees)',5,-30,30,0.5),select('mode','Output bounds','expand',['expand','original-size'])],
    hints:['Upload one photo.','Set a precise small rotation and choose expanded or original-size bounds.','Download the rotated PNG.'],
    summary:'Fine-rotate photos with controllable bounds.',navigationHint:'±30° · transparent corners',
    policy:'Expanded mode keeps the entire rotated image but adds transparent corners. Original-size mode crops rotation into original dimensions. Rotation is not automatic horizon detection.' },
  { slug:'solid-background-remover',displayName:'Solid Background Remover',h1:'Make a solid-color background transparent.',category:'geometry',maxOutputs:1,
    description:'Remove a contiguous solid background from an image based on a selected corner color and tolerance, without AI or uploads.',
    intro:'Remove a plain color connected to an outer corner; useful for logos and illustrations on uniform backgrounds.',
    controls:[select('corner','Background sample corner','top-left',['top-left','top-right','bottom-left','bottom-right']),number('tolerance','Color tolerance',35,0,150)],
    hints:['Upload a logo or product graphic with a flat backdrop.','Pick a corner that contains background and adjust tolerance.','Download a PNG with edge-connected matching pixels made transparent.'],
    summary:'Erase connected flat backgrounds from a chosen corner.',navigationHint:'Flood fill · alpha · PNG',
    policy:'Only the contiguous background region connected to the chosen corner is removed. Complex, textured and similarly colored subjects may not separate cleanly; this is not AI person/product segmentation.' },
] as const;
export const ADVANCED_IMAGE_TOOLS:readonly AdvancedImageTool[]=definitions.map(d=>({
 ...common,...d,id:d.slug,title:d.displayName+' Online Free | ConvertAnyFile',downloadSuffix:'advanced',
 policyNote:d.policy,
})) as AdvancedImageTool[];
export const ADVANCED_IMAGE_MANIFEST = ADVANCED_IMAGE_TOOLS.map(tool=>({
 tool,runtime:'advanced' as const,directoryGroup:'advanced' as const,
 navigationHint:tool.navigationHint,summary:tool.summary,
})) satisfies ImageToolManifestEntry[];
export function getAdvancedImageTool(slug:string):AdvancedImageTool{
 const tool=ADVANCED_IMAGE_TOOLS.find(x=>x.slug===slug);
 if(!tool)throw new Error('Unknown advanced image tool: '+slug);
 return tool;
}
