const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const sharp=require('sharp');
const {optimizeImages}=require('../scripts/gallery-images.cjs');

test('image variants preserve sources, reduce transfer sizes and invalidate caches on image changes',async()=>{
  sharp.cache(false);
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hidrissi-images-'));
  try{
    await fs.mkdir(path.join(root,'img'));
    const original=path.join(root,'img/photo.png');
    await sharp({create:{width:1200,height:1600,channels:3,background:'#d4ac5e'}}).png().toFile(original);
    const sourceBytes=await fs.readFile(original);
    const first=await optimizeImages({root,sources:['/img/photo.png','/img/photo.png']});
    assert.equal(first.report.count,1);assert.equal(first.manifest['/img/photo.png'].w,960);
    assert.equal(first.manifest['/img/photo.png'].h,1280);assert.equal(first.manifest['/img/photo.png'].full,'/img/photo.png');
    const thumb=path.join(root,'dist',first.manifest['/img/photo.png'].thumb);
    assert.equal((await sharp(thumb).metadata()).width,160);
    assert.ok(first.report.thumbnailBytes<first.report.previewBytes);
    assert.deepEqual(await fs.readFile(original),sourceBytes);
    const before=(await fs.stat(thumb)).mtimeMs;
    await optimizeImages({root,sources:['/img/photo.png']});assert.equal((await fs.stat(thumb)).mtimeMs,before);
    await sharp({create:{width:96,height:64,channels:3,background:'#334455'}}).png().toFile(original);
    const changed=await optimizeImages({root,sources:['/img/photo.png']});
    assert.notEqual(changed.manifest['/img/photo.png'].display,first.manifest['/img/photo.png'].display);
    assert.equal(changed.manifest['/img/photo.png'].w,96);assert.equal(changed.manifest['/img/photo.png'].h,64);
    await assert.rejects(optimizeImages({root,sources:['/img/../secret.png']}));
  }finally{
    assert.ok(path.basename(root).startsWith('hidrissi-images-'));
    await fs.rm(root,{recursive:true,force:true});
  }
});
