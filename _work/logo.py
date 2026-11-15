import numpy as np
from PIL import Image
A=np.asarray(Image.open('photos/torre-de-hardin-logo.jpg').convert('RGB')).astype(np.float32)
alpha=np.clip((255-A.min(-1)-14)*1.2,0,255)
def save(box,col,fn):
    l,t,r,b=box; sub=alpha[t:b,l:r]
    o=np.zeros(sub.shape+(4,),np.uint8); o[...,:3]=col; o[...,3]=sub.astype(np.uint8)
    Image.fromarray(o).save(fn,optimize=True)
ink=(27,26,23); iv=(245,240,230)
full=(290,500,1760,1550); mark=(650,500,1350,1130)
for n,c in (('ink',ink),('ivory',iv)):
    save(full,c,f'public/brand/logo-full-{n}.png'); save(mark,c,f'public/brand/logo-mark-{n}.png')
print('ok')
