"""Deterministic social artwork. Palette and logo geometry come from the site source.
Run: python3 scripts/generate-post-images.py (Pillow required; no network calls).
Artwork illustrates tool behavior; it is not a fabricated screenshot or benchmark.
"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps, ImageFilter
from pathlib import Path
import json, re, math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/social/tools'
OUT.mkdir(parents=True, exist_ok=True)
THEME = (ROOT/'src/styles/dark-theme.css').read_text()
def token(name):
    return re.search(r'--'+name+r':\s*(#[0-9a-fA-F]+)', THEME).group(1)
BG,INK,ACCENT,MUTED,CARD = [token(x) for x in ['soft','ink','accent','muted','card']]
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def f(s,b=False): return ImageFont.truetype(BOLD if b else FONT,s)
def fit(text,size,width,b=False):
    while f(size,b).getlength(text)>width: size-=1
    return f(size,b)
def txt(d,xy,text,size=28,fill=INK,b=False): d.text(xy,text,font=f(size,b),fill=fill)
def center(d,box,text,size=36,fill=INK,b=True):
    font=fit(text,size,box[2]-box[0]-36,b)
    d.text(((box[0]+box[2])/2,(box[1]+box[3])/2),text,font=font,fill=fill,anchor='mm')
def logo(im,x,y,size):
    # Read exact three stacked-square geometry from the repository favicon.
    import xml.etree.ElementTree as ET
    svg=ET.parse(ROOT/'public/favicon.svg').getroot()
    layer=Image.new('RGBA',(256,256)); d=ImageDraw.Draw(layer)
    for r in list(svg):
        a=r.attrib; xx=float(a.get('x',0))*4; yy=float(a.get('y',0))*4
        w=float(a['width'])*4; h=float(a['height'])*4
        d.rounded_rectangle((xx,yy,xx+w,yy+h),radius=float(a.get('rx',0))*4,
                           fill=a.get('fill'),outline=a.get('stroke'),width=int(float(a.get('stroke-width',0))*4))
    im.paste(layer.resize((size,size),Image.Resampling.LANCZOS),(x,y),layer.resize((size,size),Image.Resampling.LANCZOS))
def photo():
    im=Image.new('RGB',(480,320)); p=ImageDraw.Draw(im)
    for y in range(320):
        t=y/320;p.line((0,y,480,y),fill=(int(255-80*t),int(205-65*t),int(148+30*t)))
    p.ellipse((345,32,415,102),fill='#fff0bd')
    p.polygon([(0,238),(140,85),(295,250)],fill='#706695')
    p.polygon([(140,85),(106,127),(160,117),(184,140)],fill='#f9e4d8')
    p.polygon([(160,280),(320,133),(480,250),(480,320),(0,320)],fill='#383f69')
    p.polygon([(0,280),(135,220),(285,284),(480,245),(480,320),(0,320)],fill='#202b4c')
    p.polygon([(190,320),(275,258),(300,267),(260,320)],fill='#d4b79c')
    return im
def paste_round(im,p,box,r=20):
    p=ImageOps.fit(p,(box[2]-box[0],box[3]-box[1]));m=Image.new('L',p.size);ImageDraw.Draw(m).rounded_rectangle((0,0,p.width,p.height),r,fill=255);im.paste(p,(box[0],box[1]),m)
def arrow(d):
    d.line((564,652,632,652),fill=ACCENT,width=7)
    d.line((613,633,633,652,613,671),fill=ACCENT,width=7)
def file_tile(d,box,label,color):
    d.rounded_rectangle(box,24,fill=CARD,outline='#343c4d',width=2)
    x,y,xx,yy=box;mid=(x+xx)/2
    d.rounded_rectangle((mid-84,y+58,mid+84,y+246),18,fill='#232a3c',outline=color,width=3)
    d.polygon([(mid+38,y+58),(mid+84,y+104),(mid+38,y+104)],fill=color)
    center(d,(mid-80,y+135,mid+80,y+195),label,43,color)
    for j in range(3): d.rounded_rectangle((mid-48,y+213+j*11,mid+45-j*12,y+218+j*11),2,fill='#4e5972')
HEAD={
'resize-image':('MAKE IT','FIT.','Resize by pixels, percentage or fit-to-box.'),
'compress-image':('LESS FILE','WEIGHT.','Choose output format and quality.'),
'crop-image':('KEEP THE','GOOD PART.','Choose your crop. Frame your image.'),
'remove-image-metadata':('YOUR PHOTO.','LESS METADATA.','Create copies without common EXIF and GPS fields.'),
'bulk-rename-images':('FILENAME CHAOS?','SORTED.','One naming pattern. A whole batch of images.'),
'blur-image':('BLUR WHAT','YOU CHOOSE.','Select a region or blur the whole image.'),
'gemini-ai-logo-remover':('VISIBLE MARK?','REPAIR LOCALLY.','Manually select the visible sparkle and review the result.'),
'remove-watermark':('SELECT THE MARK.','REVIEW THE REPAIR.','Local repair for small visible watermarks.'),
'add-watermark':('MAKE YOUR','MARK.','Add a visible watermark to your images.'),
'add-image-border':('GIVE IT','A FRAME.','Add a clean border around your image.'),
'brightness-image':('TOO DARK?','LIGHT IT UP.','Adjust image brightness with a live preview.'),
'contrast-image':('A LITTLE','MORE CONTRAST.','Adjust the contrast. Preview the difference.'),
'adjust-image-opacity':('TURN DOWN','THE OPACITY.','Adjust transparency and export your image.'),
'adjust-image-saturation':('MORE COLOR.','YOUR CALL.','Adjust saturation and preview your image.'),
'threshold-image':('BLACK. WHITE.','YOUR THRESHOLD.','Turn tones into a two-color image.'),
'grayscale-image':('COLOR OUT.','CHARACTER IN.','Give your image a grayscale finish.'),
'hue-rotate-image':('SAME IMAGE.','NEW HUES.','Shift the colors with hue rotation.'),
'invert-image':('FLIP THE','COLOR STORY.','Invert image colors in your browser.'),
'pixelate-image':('BIG PIXELS.','BOLD LOOK.','Create a pixelated image effect.'),
'posterize-image':('FEWER TONES.','BOLDER LOOK.','Reduce tonal levels for a posterized effect.'),
'rotate-flip-image':('WRONG WAY?','TURN IT AROUND.','Rotate or mirror your images.'),
'rounded-corners-image':('SOFTEN','THE CORNERS.','Give your image rounded corners.'),
'sepia-image':('A LITTLE','VINTAGE FEEL.','Create a warm sepia image effect.'),
'sharpen-image':('A SHARPER','FINISH.','Adjust sharpening and inspect the result.'),
'image-converter':('NEW FORMAT.','NEXT STEP.','Convert images in your browser.'),
'data-converter':('YOUR DATA.','A NEW FORMAT.','Convert CSV, TSV, JSON and JSONL locally.'),
'archive-converter':('UNPACK.','REPACKAGE.','Read supported archives. Export ZIP, TAR or TAR.GZ.'),
'subtitle-converter':('SAME WORDS.','NEW FORMAT.','Convert existing subtitle files in your browser.'),
}
def effect(p,slug):
    if slug=='brightness-image':return ImageEnhance.Brightness(p).enhance(1.3)
    if slug=='contrast-image':return ImageEnhance.Contrast(p).enhance(1.6)
    if slug=='adjust-image-saturation':return ImageEnhance.Color(p).enhance(1.8)
    if slug=='grayscale-image':return ImageOps.grayscale(p).convert('RGB')
    if slug=='threshold-image':return ImageOps.grayscale(p).point(lambda x:255 if x>140 else 0).convert('RGB')
    if slug=='invert-image':return ImageOps.invert(p)
    if slug=='pixelate-image':return p.resize((20,14)).resize(p.size,Image.Resampling.NEAREST)
    if slug=='posterize-image':return ImageOps.posterize(p,3)
    if slug=='sepia-image':return ImageOps.colorize(ImageOps.grayscale(p),'#33221d','#f3ddac')
    if slug=='hue-rotate-image':
        hsv=p.convert('HSV');h,s,v=hsv.split();return Image.merge('HSV',(h.point(lambda x:(x+70)%256),s,v)).convert('RGB')
    if slug=='rotate-flip-image':return ImageOps.mirror(p)
    if slug=='blur-image':
        p=p.copy();p.paste(p.crop((220,70,360,210)).filter(ImageFilter.GaussianBlur(20)),(220,70));return p
    if slug=='crop-image':return ImageOps.fit(p.crop((125,50,375,285)),p.size)
    if slug=='sharpen-image':return p.filter(ImageFilter.UnsharpMask(2,180,3))
    return p.copy()
def main():
    tools=json.loads((ROOT/'scripts/social-queue-tools.json').read_text())
    manifest=[]
    for n,t in enumerate(tools):
        slug=t['url'].rstrip('/').split('/')[-1]
        im=Image.new('RGB',(1200,1200),BG); d=ImageDraw.Draw(im)
        # Restrained source-palette ambient light.
        for y in range(1200):
            a=max(0,1-y/1050);d.line((0,y,1200,y),fill=(11+int(12*a),14+int(8*a),20+int(26*a)))
        for x in range(64,1200,64):d.line((x,124,x,1012),fill='#181b2b')
        logo(im,62,47,72);txt(d,(152,61),'ConvertAnyFile',32,b=True)
        cat=t['category'].upper();font=fit(cat,18,400,True);d.text((1136,75),cat,font=font,fill='#aaa4ff',anchor='rm')
        d.line((64,145,1136,145),fill='#34304e',width=2)
        conv=' to ' in t['name'] and slug not in HEAD
        if conv:
            a,b=t['name'].upper().split(' TO ');h1,h2,sub='FROM '+a+'.','TO '+b+'.','Change the format. Keep your workflow moving.'
        else:h1,h2,sub=HEAD[slug]
        for y,line,col in [(192,h1,INK),(292,h2,ACCENT)]:d.text((64,y),line,font=fit(line,84,1072,True),fill=col)
        d.text((66,407),sub,font=fit(sub,27,1068),fill=MUTED)
        d.rounded_rectangle((64,493,1136,925),30,fill='#10141c',outline='#34304e',width=2)
        left=(90,555,550,860);right=(650,555,1110,860)
        if conv or slug.endswith('converter'):
            if not conv:a,b={'image-converter':('IMAGE','PNG / JPG'),'data-converter':('CSV','JSON'),'archive-converter':('ARCHIVE','ZIP'),'subtitle-converter':('SRT','VTT')}[slug]
            file_tile(d,(118,550,518,866),a,'#a7adbb');file_tile(d,(682,550,1082,866),b,ACCENT);arrow(d)
        elif slug=='bulk-rename-images':
            for box,labels,c in [(left,['IMG_0028.JPG','IMG_0971.JPG','IMG_3428.JPG'],MUTED),(right,['Trip_001.jpg','Trip_002.jpg','Trip_003.jpg'],ACCENT)]:
                for j,l in enumerate(labels):
                    y=box[1]+j*93;d.rounded_rectangle((box[0],y,box[2],y+75),14,fill=CARD);txt(d,(box[0]+23,y+21),l,28,c,True)
            arrow(d)
        elif slug=='remove-image-metadata':
            for box in [left,right]:paste_round(im,photo(),(box[0],box[1],box[2],box[1]+205))
            for j,label in enumerate(['EXIF','GPS']):
                x=left[0]+j*180;d.rounded_rectangle((x,782,x+160,837),14,fill='#3b2737');center(d,(x,782,x+160,837),label,24,'#ffada7')
            center(d,(650,782,1110,837),'CLEANED COPY',27,'#43cc94');arrow(d)
        else:
            p=photo();p2=effect(p,slug)
            if slug=='brightness-image':p=ImageEnhance.Brightness(p).enhance(.52)
            if slug=='contrast-image':p=ImageEnhance.Contrast(p).enhance(.5)
            if slug=='sharpen-image':p=p.filter(ImageFilter.GaussianBlur(1))
            if slug=='add-watermark':ImageDraw.Draw(p2).text((270,265),'YOUR BRAND',font=f(23,True),fill='white')
            if slug in ['gemini-ai-logo-remover','remove-watermark']:
                ImageDraw.Draw(p).text((300,255),'+' if slug.startswith('gemini') else 'DEMO',font=f(35,True),fill='white')
            if slug=='add-image-border':p2=ImageOps.expand(p2,border=20,fill='#aaa4ff')
            if slug=='adjust-image-opacity':p2=Image.blend(Image.new('RGB',p.size,'#29303d'),p,.4)
            if slug=='resize-image':
                paste_round(im,p,left);d.rounded_rectangle(right,20,fill=CARD);paste_round(im,p2,(720,597,1040,810))
            elif slug=='rounded-corners-image':
                paste_round(im,p,left);paste_round(im,p2,right,r=85)
            else:paste_round(im,p,left);paste_round(im,p2,right)
            arrow(d)
            if slug=='compress-image':
                center(d,(90,800,550,860),'SOURCE',22);center(d,(650,800,1110,860),'CHOOSE QUALITY',22)
        txt(d,(92,514),'INPUT',18,MUTED,True);txt(d,(652,514),'OUTPUT',18,'#aaa4ff',True)
        txt(d,(90,884),'Illustrative example',18,'#929aaf')
        d.text((64,965),t['name'],font=fit(t['name'],44,1060,True),fill=INK)
        d.line((64,1040,1136,1040),fill='#34304e',width=2)
        txt(d,(64,1075),'ConvertAnyFile.net',44,INK,True)
        d.rounded_rectangle((884,1074,1136,1142),18,fill=ACCENT);center(d,(884,1074,1136,1142),'TRY THE TOOL',22,'#0b0e14')
        path=OUT/(slug+'.png')
        im.quantize(colors=48,method=Image.Quantize.FASTOCTREE).save(path,optimize=True)
        manifest.append({**t,'file':'public/social/tools/'+path.name,'width':1200,'height':1200})
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Generated {len(manifest)} source-branded tool cards.')
if __name__=='__main__':main()
