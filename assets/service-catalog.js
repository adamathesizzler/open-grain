/* Shared, pure catalogue: stable service identity, not translated labels or array positions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OGServiceCatalog=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const images=['assets/portfolio/portrait-studio.jpg','assets/portfolio/halo-detail.jpg','assets/portfolio/nightlife-cheers.jpg','assets/portfolio/nightlife-crew.jpg','assets/portfolio/shibuya.jpg'];
  const blurbs={en:[
      'Stills for brands, venues, products and people. Shot on location or in a studio, selected and retouched.',
      'Moving image: short films, vertical reels and cutdowns for social. From shoot through to edit, colour and sound.',
      'Creator-style content that looks native in the feed — made to stop the scroll, for brands that need a steady stream of everyday material.',
      'Coverage of events, launches and parties — the room, the people and the moments, as they happen.',
      'Ongoing content for social channels: a recurring shoot and edit rhythm instead of one-off assets.',
    ],es:[
      'Fotografía para marcas, espacios, producto y personas. En localización o en estudio, con selección y retoque.',
      'Imagen en movimiento: piezas cortas, reels verticales y versiones para redes. Del rodaje al montaje, color y sonido.',
      'Contenido con estilo de creador que no desentona en el feed — pensado para que tu audiencia se detenga a mirarlo, para marcas que necesitan material cotidiano.',
      'Cobertura de eventos, presentaciones y fiestas: el espacio, la gente y lo que pasa, mientras ocurre.',
      'Contenido continuado para redes: un ritmo recurrente de rodaje y edición en lugar de piezas sueltas.',
    ]};
  const legacyId = index => '10000000-0000-4000-8000-'+String(index+1).padStart(12,'0');
  function imageUrl(value){
    if(typeof value!=='string'||/[\u0000-\u001f\u007f\s<>"'\\]/.test(value)||/%([01][0-9a-f]|7f|5c)/i.test(value))return '';
    try{
      if(/^https:\/\//i.test(value)){const match=/^https:\/\/[a-z0-9.-]+(?::([0-9]+))?([/?#][^\s<>"']*)?$/i.exec(value);return match&&(!match[1]||(match[1].length<=5&&Number(match[1])>=1&&Number(match[1])<=65535))?value:'';}
      if(!/^\/?assets\/[a-z0-9/_.,+()-]+$/i.test(value))return '';
      const decoded=decodeURIComponent(value);
      if(decoded.split('/').some(part=>part==='..'||part==='.'))return '';
      return value;
    }catch{return '';}
  }

  function validate(value){
    if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>100||!Array.isArray(value.legacyIds)||value.legacyIds.length>100)throw new Error('Catálogo de servicios no válido.');
    if(value.legacyIds.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))||new Set(value.legacyIds.map(id=>id.toLowerCase())).size!==value.legacyIds.length)throw new Error('Mapa de enlaces antiguos no válido.');
    const ids=new Set();
    const items=value.items.map(item=>{
      if(!item||typeof item.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(item.id)||ids.has(item.id.toLowerCase()))throw new Error('Identificador de servicio no válido o repetido.');
      ids.add(item.id.toLowerCase());
      for(const lang of ['es','en'])if(typeof item.labels?.[lang]!=='string'||!item.labels[lang].trim()||/[\u0000-\u001f\u007f]/.test(item.labels[lang])||Array.from(item.labels[lang]).length>120||typeof item.descriptions?.[lang]!=='string'||Array.from(item.descriptions[lang]).length>5000)throw new Error('Completa los nombres en español e inglés (máximo 120 caracteres).');
      if(typeof item.active!=='boolean'||!imageUrl(item.image))throw new Error('Imagen o visibilidad de servicio no válida.');
      return {id:item.id,labels:{es:item.labels.es.trim(),en:item.labels.en.trim()},descriptions:{es:item.descriptions.es,en:item.descriptions.en},image:item.image,active:item.active};
    });return {version:1,legacyIds:[...value.legacyIds],items};
  }
  function parse(raw){return validate(typeof raw==='string'?JSON.parse(raw):raw);}
  function legacy(defaults,rows=[]){
    const lists={es:[...(defaults.es?.serviceList||[])],en:[...(defaults.en?.serviceList||[])]};
    for(const row of rows)if(row.key==='serviceList'&&Object.hasOwn(lists,row.lang)){const parsed=JSON.parse(row.value);if(!Array.isArray(parsed)||parsed.some(s=>typeof s!=='string'))throw new Error('Lista de servicios no válida.');lists[row.lang]=parsed;}
    const n=Math.max(lists.es.length,lists.en.length);
    return validate({version:1,legacyIds:Array.from({length:n},(_,i)=>legacyId(i)),items:Array.from({length:n},(_,i)=>({id:legacyId(i),labels:{es:lists.es[i]||lists.en[i],en:lists.en[i]||lists.es[i]},descriptions:{es:(defaults.es?.serviceBlurbs||blurbs.es)[i]||'',en:(defaults.en?.serviceBlurbs||blurbs.en)[i]||''},image:images[i%images.length],active:true}))});
  }
  function fromRows(defaults,rows){const row=rows.find(r=>r.key==='serviceCatalog'&&r.lang==='es');return row?parse(row.value):legacy(defaults,rows);}
  function active(catalog,lang){return validate(catalog).items.filter(item=>item.active).map(item=>({...item,label:item.labels[lang]||item.labels.es,description:item.descriptions[lang]||''}));}
  function rows(catalog){const safe=validate(catalog);return [{key:'serviceCatalog',lang:'es',value:JSON.stringify(safe)},...['es','en'].map(lang=>({key:'serviceList',lang,value:JSON.stringify(active(safe,lang).map(item=>item.label))}))];}
  function expected(rows){return rows.filter(r=>(r.key==='serviceCatalog'&&r.lang==='es')||(r.key==='serviceList'&&['es','en'].includes(r.lang))).map(r=>({key:r.key,lang:r.lang,value:r.value})).sort((a,b)=>(a.key+a.lang).localeCompare(b.key+b.lang));}
  function resolve(catalog,lang,value){const list=active(catalog,lang);const exact=list.find(item=>item.id===value);if(exact)return exact;const legacyIndex=/^(?:svc-)?(\d{1,3})$/.exec(String(value||''));return legacyIndex?list.find(item=>item.id===catalog.legacyIds[Number(legacyIndex[1])])||null:null;}
  return {legacyId,images,blurbs,imageUrl,validate,parse,legacy,fromRows,active,rows,expected,resolve};
});
