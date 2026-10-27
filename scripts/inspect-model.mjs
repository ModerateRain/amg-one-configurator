import fs from 'node:fs';
const b = fs.readFileSync(new URL('../public/models/amg-one.glb', import.meta.url));
fs.mkdirSync(new URL('../qa/', import.meta.url), {recursive:true});
const j = JSON.parse(b.subarray(20, 20+b.readUInt32LE(12)).toString());
const report = {
  asset:j.asset, extensions:j.extensionsUsed,
  scenes:j.scenes,
  materials:j.materials?.map((m,i)=>({i,...m})),
  nodes:j.nodes?.map((n,i)=>({i,...n})),
  meshes:j.meshes?.map((m,i)=>({i,name:m.name,primitives:m.primitives.map(p=>({material:p.material,count:j.accessors[p.indices]?.count,position:j.accessors[p.attributes.POSITION]}))})),
  images:j.images?.map(({name,mimeType,uri},i)=>({i,name,mimeType,uri}))
};
fs.writeFileSync(new URL('../qa/model-report.json',import.meta.url), JSON.stringify(report,null,2));
console.log(JSON.stringify({asset:j.asset,extensions:j.extensionsUsed,nodes:j.nodes?.length,meshes:j.meshes?.length,materials:j.materials?.map((m,i)=>({i,name:m.name,pbr:m.pbrMetallicRoughness,alphaMode:m.alphaMode,extensions:m.extensions})),roots:j.scenes,rootNodes:j.nodes?.slice(0,8)},null,2));
