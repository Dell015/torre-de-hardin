import os, json, numpy as np, cv2
from PIL import Image, ImageFilter
SRC='photos'
idx={}
for line in open('_work/index.txt'):
    i,p,_=line.rstrip('\n').split('\t'); idx[int(i)]=p

# name: (index, profile, crop(l,t,r,b fractions) or None)
J=[
 ('sunset',39,'golden',None),
 ('tower-violet',37,'night',None),
 ('tower-bloom',36,'night',None),
 ('tower-bridge',35,'night',None),
 ('tower-bougainvillea',34,'night',None),
 ('tower-play',38,'night',None),
 ('night-terrace',0,'night',None),
 ('aerial-night',18,'night',(0,0,1,0.86)),
 ('aerial-day-a',17,'day',(0.18,0,1,0.86)),
 ('aerial-day-b',16,'day',(0.06,0,1,0.9)),
 ('aerial-day-c',19,'day',(0,0,0.9,0.88)),
 ('aerial-day-d',15,'day',(0.24,0,1,0.88)),
 ('pool-wide',46,'day',None),
 ('pool-terrace',45,'day',None),
 ('pool-deep',44,'day',None),
 ('pool-moon',40,'day',None),
 ('pool-villas',43,'day',None),
 ('pool-dawn',42,'golden',None),
 ('pool-unicorn',41,'day',None),
 ('villa-night',1,'interior',None),
 ('terrace',20,'interior',None),
 ('room-a',25,'interior',None),
 ('room-b',23,'interior',None),
 ('room-c',21,'interior',None),
 ('room-d',26,'interior',None),
 ('room-e',27,'interior',None),
 ('room-tropic',28,'interior',None),
 ('bath-a',24,'interior',None),
 ('bath-b',22,'interior',None),
 ('hall-a',29,'interior',None),
 ('hall-b',30,'interior',None),
 ('hall-c',31,'interior',None),
 ('hall-entrance',32,'day',None),
 ('wedding-aisle',8,'event',None),
 ('wedding-arch',9,'event',None),
 ('wedding-arch-b',10,'event',None),
 ('wedding-table',11,'event',None),
 ('wedding-long',12,'event',None),
 ('garden-day-a',2,'day',(0,0,1,1)),
 ('garden-roof-a',6,'day',None),
 ('garden-roof-b',7,'day',None),
 ('tower-gold',14,'night',None),
]
def smooth(x): return x*x*(3-2*x)
def grade(img,prof):
    a=np.asarray(img.convert('RGB')).astype(np.float32)/255.
    # sat/hue work in HSV
    hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV)  # H 0-360, S 0-1, V 0-1
    H,S,V=hsv[...,0],hsv[...,1],hsv[...,2]
    P={'day':dict(sat=.80,grn=.80,cy=.90,lift=.035,curve=.30,warm=.035,hi=.07,sh=.05),
       'golden':dict(sat=.88,grn=.82,cy=.92,lift=.03,curve=.28,warm=.03,hi=.06,sh=.04),
       'night':dict(sat=.82,grn=.85,cy=.9,lift=.012,curve=.22,warm=.02,hi=.04,sh=.03),
       'interior':dict(sat=.82,grn=.82,cy=.9,lift=.04,curve=.38,warm=.07,hi=.09,sh=.05),
       'event':dict(sat=.86,grn=.80,cy=.92,lift=.035,curve=.28,warm=.04,hi=.06,sh=.04)}[prof]
    # greens -> toward olive/sage, extra desat
    g=np.exp(-((H-110)/45.)**2)
    H=H+(-12*g)   # toward yellow-olive
    S=S*(1-(1-P['grn'])*g)
    # cyan/teal water desat a touch
    c=np.exp(-((H-185)/28.)**2)
    S=S*(1-(1-P['cy'])*c)
    S=np.clip(S*P['sat'],0,1)
    hsv=np.stack([H%360,S,V],-1); a=cv2.cvtColor(hsv.astype(np.float32),cv2.COLOR_HSV2RGB)
    # tone: soft S-curve
    a=a*(1-P['curve'])+smooth(np.clip(a,0,1))*P['curve']
    # highlight roll-off
    k=0.88
    m=a>k; a=np.where(m,k+(a-k)/(1+((a-k)/(1-k))*0.9),a)
    # split tone
    L=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])[...,None]
    hi=np.array([1.0,0.93,0.78],np.float32); sh=np.array([0.10,0.30,0.26],np.float32)
    wh=smooth(np.clip((L-.5)*2,0,1)); ws=smooth(np.clip((.5-L)*2,0,1))
    a=a*(1-P['hi']*wh-P['sh']*ws)+hi*a*P['hi']*wh*1.0+ (sh*0.6+a*0.4)*P['sh']*ws
    # warmth
    a[...,0]*=1+P['warm']; a[...,2]*=1-P['warm']*0.9
    # lifted matte blacks (warm ink)
    bk=np.array([.050,.045,.040],np.float32)
    a=a*(1-P['lift']*3)+bk*P['lift']*3
    # vignette
    h,w=a.shape[:2]
    yy,xx=np.mgrid[0:h,0:w]; r=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2)
    vg=1-0.14*np.clip(r-0.55,0,1)**1.5
    a=a*vg[...,None]
    return Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8))
meta={}
for name,i,prof,crop in J:
    im=Image.open(idx[i]).convert('RGB')
    if crop:
        W,Hh=im.size; l,t,r,b=crop; im=im.crop((int(l*W),int(t*Hh),int(r*W),int(b*Hh)))
    g=grade(im,prof)
    W,Hh=g.size
    outs=[]
    for tw in (640,1200,1920):
        if tw>W and outs and tw!=640: continue
        t=min(tw,W)
        ng=g.resize((t,round(Hh*t/W)),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,40,3)) if t<W else g
        fn=f'{name}-{t}.webp'; ng.save('public/img/'+fn,'WEBP',quality=78,method=4)
        if (fn,t) not in outs: outs.append((fn,t))
        if t==W: break
    av=np.asarray(g.resize((8,8))).reshape(-1,3).mean(0).astype(int)
    meta[name]=dict(w=W,h=Hh,srcs=[dict(f=f,w=t) for f,t in outs],color='#%02x%02x%02x'%tuple(av))
json.dump(meta,open('src_images.json','w'),indent=1)
print(len(meta),'images')
# contact sheet of graded
from PIL import ImageDraw
names=list(meta); T=300; cols=6; rows=(len(names)+cols-1)//cols
sheet=Image.new('RGB',(cols*T,rows*T),(245,240,230)); d=ImageDraw.Draw(sheet)
for k,n in enumerate(names):
    t=Image.open('public/img/'+meta[n]['srcs'][0]['f']).convert('RGB'); t.thumbnail((T-6,T-6))
    sheet.paste(t,((k%cols)*T+3,(k//cols)*T+3)); d.text(((k%cols)*T+6,(k//cols)*T+6),n,fill=(255,255,0))
sheet.save('_work/graded.jpg',quality=80)
# logo assets
lg=Image.open('photos/torre-de-hardin-logo.jpg').convert('RGB'); A=np.asarray(lg).astype(np.float32)
alpha=255-A.min(-1)  # ink amount
alpha=np.clip((alpha-12)*1.15,0,255)
def mk(rgb_fn,box,fn):
    ys,xs=np.where(alpha>40)
    l,t,r,b=box
    sub=alpha[t:b,l:r]
    out=np.zeros(sub.shape+(4,),np.uint8)
    out[...,3]=sub.astype(np.uint8)
    out[...,:3]=rgb_fn(A[t:b,l:r])
    Image.fromarray(out).save(fn)
ys,xs=np.where(alpha>40); print('bbox',xs.min(),ys.min(),xs.max(),ys.max())
