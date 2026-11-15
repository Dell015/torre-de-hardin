import os,sys
from PIL import Image, ImageDraw
root='photos'
files=[]
for d,_,fs in os.walk(root):
    for f in sorted(fs):
        if f.lower().endswith(('.jpg','.jpeg','.png')) and 'logo' not in f and '(1)' not in f:
            files.append(os.path.join(d,f))
files.sort()
open('_work/index.txt','w').write('\n'.join(f"{i:02d}\t{p}\t{Image.open(p).size}" for i,p in enumerate(files)))
T=360
def sheet(sub,name):
    cols=4
    rows=(len(sub)+cols-1)//cols
    im=Image.new('RGB',(cols*T,rows*T),'white')
    dr=ImageDraw.Draw(im)
    for k,(i,p) in enumerate(sub):
        t=Image.open(p).convert('RGB'); t.thumbnail((T-6,T-6))
        x=(k%cols)*T; y=(k//cols)*T
        im.paste(t,(x+3,y+3))
        dr.rectangle((x+3,y+3,x+48,y+27),fill='black'); dr.text((x+8,y+8),f"{i:02d}",fill='yellow')
    im.save(name,quality=80)
items=list(enumerate(files))
sheet(items[:16],'_work/s1.jpg');sheet(items[16:32],'_work/s2.jpg');sheet(items[32:],'_work/s3.jpg')
