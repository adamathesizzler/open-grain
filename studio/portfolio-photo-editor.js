/* Explicit, deterministic group editing. Selection/previews never write to Storage or DB. */
(function(root){
'use strict';
const MIME = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
async function bounded(query,ms=30000){
 const controller=new AbortController();let timer;
 if(typeof query?.abortSignal==='function')query=query.abortSignal(controller.signal);
 try{return await Promise.race([Promise.resolve(query),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('La conexión tardó demasiado. Reintenta para verificar el resultado sin duplicar archivos.'));},ms);})]);}finally{clearTimeout(timer);}
}
const MAX_BYTES=20*1024*1024;
function validateFile(file){if(!MIME[file.type])throw Error('Usa JPG, PNG, WebP o AVIF.');if(!file.size||file.size>MAX_BYTES)throw Error('El archivo debe ocupar entre 1 byte y 20 MB.');}
function createState(group,photos){return {group:{...group},busy:false,items:photos.filter(p=>group.photoId?p.id===group.photoId:p.group_id===group.id).sort((a,b)=>a.group_position-b.group_position||a.id.localeCompare(b.id)).map(p=>({id:p.id,photo:{...p},caption:p.subtitle||'',selected:false,phase:'saved',error:''}))};}
function applyCaption(state,caption){if(state.busy)return;for(const item of state.items)if(item.selected){item.caption=caption;item.error='';}}
function dirty(item){return item.file ? item.phase!=='saved'||item.caption!==(item.photo?.subtitle||'') : item.caption!==(item.photo.subtitle||'');}
function addFiles(state,files,uuid,preview){if(state.busy)return;for(const file of files){try{validateFile(file);if(state.items.some(i=>i.file&&i.file.name===file.name&&i.file.size===file.size&&i.file.lastModified===file.lastModified))continue;const id=uuid();state.items.push({id,file,preview:preview(file),caption:'',selected:true,phase:'local',error:'',path:`portfolio/${id}.${MIME[file.type]}`});}catch(error){state.items.push({id:uuid(),invalid:true,name:file.name,selected:false,phase:'invalid',error:error.message});}}}
async function saveCaption(client,item){
 let query=client.from('portfolio_projects').update({subtitle:item.caption}).eq('id',item.id).eq('is_published',item.photo.is_published).eq('status',item.photo.status);
 query=item.photo.group_id==null?query.is('group_id',null):query.eq('group_id',item.photo.group_id);
 query=item.photo.cover_image_url==null?query.is('cover_image_url',null):query.eq('cover_image_url',item.photo.cover_image_url);
 query=item.photo.subtitle==null?query.is('subtitle',null):query.eq('subtitle',item.photo.subtitle);
 const {data,error}=await bounded(query.select('id'));
 if(error)throw Error('No se pudo guardar el pie. Reintenta cuando recuperes la conexión.');
 if(!data?.length){const current=await bounded(client.from('portfolio_projects').select('id,subtitle,group_id,is_published,status,cover_image_url').eq('id',item.id).maybeSingle());if(current.error||!current.data||current.data.subtitle!==item.caption||current.data.group_id!==item.photo.group_id||current.data.is_published!==item.photo.is_published||current.data.status!==item.photo.status||(current.data.cover_image_url??null)!==(item.photo.cover_image_url??null))throw Error('El pie cambió en otra sesión o ya no tienes acceso. Cierra y vuelve a abrir para revisarlo.');}
 item.photo.subtitle=item.caption;
}
async function saveNew(client,state,item){
 // Stable UUID and object path survive retries, including a lost successful response.
 if(!item.payload){
  const {data,error}=await bounded(client.from('portfolio_projects').select('group_position,sort_order').order('sort_order'));
  if(error||!Array.isArray(data))throw Error('No se pudo comprobar el orden. Reintenta.');
  let groupQuery=client.from('portfolio_projects').select('group_position');groupQuery=state.group.id==null?groupQuery.is('group_id',null):groupQuery.eq('group_id',state.group.id);
  const groupRows=await bounded(groupQuery);
  if(groupRows.error||!Array.isArray(groupRows.data))throw Error('No se pudo comprobar el grupo. Reintenta.');
  const url=client.storage.from('media').getPublicUrl(item.path).data?.publicUrl;if(!url)throw Error('No se pudo preparar la URL.');
  item.payload={id:item.id,title:item.file.name.replace(/\.[^.]+$/,'')||'Foto',subtitle:item.caption,cover_image_url:url,group_id:state.group.id,group_position:Math.max(-1,...groupRows.data.map(p=>p.group_position))+1,sort_order:Math.max(-1,...data.map(p=>p.sort_order))+1,layout_class:'tall',status:'draft',is_published:false};
 }
 const prior=await bounded(client.from('portfolio_projects').select('*').eq('id',item.id).maybeSingle());
 if(prior.error)throw Error('No se pudo verificar el intento anterior. Reintenta.');
 if(prior.data){if(prior.data.cover_image_url!==item.payload.cover_image_url||prior.data.group_id!==state.group.id)throw Error('La foto cambió. Cierra y revisa antes de continuar.');if(prior.data.subtitle!==item.payload.subtitle)throw Error('El pie cambió desde el intento anterior. Cierra y vuelve a abrir para revisarlo.');item.photo=prior.data;item.phase='saved';if(item.caption!==(item.photo.subtitle||''))await saveCaption(client,item);return;}
 if(!item.uploaded){item.phase='uploading';state.notify?.();const uploaded=await bounded(client.storage.from('media').upload(item.path,item.file,{upsert:false,contentType:item.file.type}));
  if(uploaded.error){
   // An uncertain upload is reconciled by byte identity, never by blindly overwriting an object.
   const existing=await bounded(client.storage.from('media').download(item.path));
   if(existing.error||!existing.data)throw Error('La subida no se pudo confirmar. Reintenta este archivo.');
   const [a,b]=await Promise.all([existing.data.arrayBuffer(),item.file.arrayBuffer()]);
   const aa=new Uint8Array(a),bb=new Uint8Array(b);if(aa.length!==bb.length||aa.some((v,i)=>v!==bb[i]))throw Error('El archivo remoto no coincide. No se sobrescribió.');
  }
  item.uploaded=true;
 }
 item.phase='saving';state.notify?.();item.payload.subtitle=item.caption;
 // Re-read append positions after upload; a failed earlier item must not reuse a later saved item's position.
 const latest=await bounded(client.from('portfolio_projects').select('group_id,group_position,sort_order'));
 if(latest.error||!Array.isArray(latest.data))throw Error('No se pudo comprobar el orden final. Reintenta.');
 item.payload.group_position=Math.max(-1,...latest.data.filter(p=>p.group_id===state.group.id).map(p=>p.group_position))+1;
 item.payload.sort_order=Math.max(-1,...latest.data.map(p=>p.sort_order))+1;
 const result=await bounded(client.from('portfolio_projects').insert(item.payload).select('id'));
 if(result.error||!result.data?.length)throw Error('Archivo subido; no se confirmó el borrador. Reintenta para verificarlo sin duplicarlo.');
 item.photo={...item.payload};item.phase='saved';
}
async function save(state,client,allowUpload){
 if(state.busy)return;state.busy=true;state.notify?.();
 try{for(const item of state.items){if(item.invalid||!dirty(item)||(item.file&&item.phase!=='saved'&&!item.selected))continue;item.error='';try{if(item.file&&item.phase!=='saved'){if(!allowUpload)throw Error('Confirma el aviso de almacenamiento público para subir.');await saveNew(client,state,item);}else await saveCaption(client,item);item.phase='saved';}catch(error){item.error=error.message;item.phase=item.photo?'saved':'error';}state.notify?.();}}
 finally{state.busy=false;state.notify?.();}
}
// Creating an album is recoverable staging, not a claim of a cross-Storage/SQL transaction.
function newProject(name,files,uuid,preview){
 if(!name.trim()||Array.from(name).length>120||/[\u0000-\u001f\u007f-\u009f]/.test(name))throw Error('Escribe un nombre de proyecto válido (máximo 120 caracteres).');
 if(!files.length)throw Error('Selecciona al menos una foto para crear el proyecto.');
 files.forEach(validateFile);
 const state=createState({id:null,name:name.trim()},[]);state.targetGroupId=uuid();addFiles(state,files,uuid,preview);return state;
}
async function createProject(state,client,allowUpload,groupsApi){
 if(state.creating)return null;state.creating=true;
 try{
  await save(state,client,allowUpload);
  if(state.items.some(i=>i.invalid||i.error||i.phase!=='saved'))throw Error('Hay fotos pendientes. Los borradores ya guardados se conservan; reintenta sin duplicarlos.');
  const snapshot=await bounded(client.rpc('studio_portfolio_groups_snapshot'));
  if(snapshot.error||!snapshot.data?.groups||!snapshot.data?.photos)throw Error('Fotos guardadas como borradores. No se pudo comprobar el grupo; reintenta.');
  const current=snapshot.data,ids=state.items.map(i=>i.id),prior=current.groups.find(g=>g.id===state.targetGroupId);
  if(prior){
   const actual=current.photos.filter(p=>p.group_id===prior.id).map(p=>p.id).sort();
   if(prior.name!==state.group.name||JSON.stringify(actual)!==JSON.stringify([...ids].sort()))throw Error('El proyecto cambió desde el intento anterior. Revisa la biblioteca antes de continuar.');
   return {...prior,photo_ids:ids};
  }
  if(ids.some(id=>!current.photos.some(p=>p.id===id&&p.group_id==null&&p.is_published===false)))throw Error('Una foto se ha movido o publicado. Revisa la biblioteca; no se reasignó.');
  const group={id:state.targetGroupId,name:state.group.name,name_en:state.group.name,photo_ids:ids};
  const groups=groupsApi.validate([...groupsApi.editable(current.groups,current.photos),group],current.photos);
  const result=await bounded(client.rpc('studio_save_portfolio_groups',{p_expected:current,p_groups:groups}));
  if(result.error||!result.data?.groups?.some(g=>g.id===group.id)||ids.some(id=>!result.data.photos?.some(p=>p.id===id&&p.group_id===group.id)))throw Error('No se pudo confirmar el grupo. Las fotos siguen guardadas; reintenta para comprobar el resultado sin duplicar.');
  return group;
 }finally{state.creating=false;}
}
function mount({client,onSaved,safeUrl}){
 let state=null,opener=null,version=0;
 const dialog=document.createElement('dialog');dialog.className='photo-editor-dialog';dialog.setAttribute('aria-labelledby','photo-editor-heading');
 dialog.innerHTML=`<div class="photo-editor-head"><h2 id="photo-editor-heading">Fotos del grupo</h2><button type="button" data-close class="og-btn og-btn-outline">Cerrar</button></div><p>Selecciona fotos nuevas para subirlas y fotos existentes para aplicar un pie común o escribe uno distinto en cada foto. El pie corresponde al subtítulo existente; no cambia el título.</p><p data-message role="status" aria-live="polite"></p><div data-tools><label class="file-label">Añadir varias fotos<input data-files type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif"></label><button type="button" data-select class="og-btn og-btn-outline">Seleccionar todas</button><button type="button" data-clear class="og-btn og-btn-outline">Deseleccionar</button><label>Pie común<textarea data-common maxlength="2000"></textarea></label><button type="button" data-apply class="og-btn og-btn-outline">Aplicar a seleccionadas</button><p data-count></p></div><div data-items class="photo-editor-grid"></div><p><strong>Las fotos nuevas se guardan como borrador, sin aparecer en la galería.</strong> El almacenamiento multimedia actual es público: cualquier persona con el enlace al archivo puede verlo, incluso si está en borrador. No subas material confidencial.</p><label><input type="checkbox" data-consent> Entiendo y autorizo subir los archivos seleccionados al almacenamiento público.</label><p>Guardar un pie de una foto ya publicada actualiza su texto público. No cambia el estado de publicación.</p><button type="button" data-save class="og-btn og-btn-solid">Guardar pies y subir borradores</button>`;
 document.body.append(dialog);const el=s=>dialog.querySelector(s);
 function render(){if(!state)return;const focused=document.activeElement;const key=focused?.dataset?.caption;const start=focused?.selectionStart,end=focused?.selectionEnd;
  el('[data-items]').replaceChildren();for(const item of state.items){const card=document.createElement('article');card.className='photo-editor-item';
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=item.selected;check.disabled=state.busy||item.invalid;check.addEventListener('change',()=>{item.selected=check.checked;update();});label.append(check,document.createTextNode(item.photo?.title||item.file?.name||item.name));card.append(label);
   const src=item.preview||safeUrl(item.photo?.cover_image_url||'');if(src){const img=document.createElement('img');img.src=src.startsWith('assets/')?'/'+src:src;img.alt='';card.append(img);}
   if(!item.invalid){const captionLabel=document.createElement('label');captionLabel.textContent='Pie de foto (subtítulo)';const input=document.createElement('textarea');input.maxLength=2000;input.value=item.caption;input.dataset.caption=item.id;input.disabled=state.busy;input.addEventListener('input',()=>{item.caption=input.value;update();});captionLabel.append(input);card.append(captionLabel);}
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent=item.error||({local:'Vista previa local · sin subir',uploading:'Subiendo archivo…',saving:'Guardando borrador…',error:'Error · pulsa Guardar para reintentar',invalid:'Archivo no admitido',saved:item.photo?.is_published?'Publicada':'Borrador / no publicada'}[item.phase]);card.append(status);
   if(item.error&&!item.invalid){const retry=document.createElement('button');retry.type='button';retry.className='og-btn og-btn-outline';retry.textContent='Reintentar este archivo';retry.disabled=state.busy;retry.onclick=()=>runSave(item);card.append(retry);}
   if(item.file&&!item.uploaded&&!item.photo){const remove=document.createElement('button');remove.type='button';remove.textContent=item.phase==='error'?'Quitar del intento (puede existir un archivo subido)':'Quitar de la selección local';remove.disabled=state.busy;remove.onclick=()=>{URL.revokeObjectURL(item.preview);state.items=state.items.filter(i=>i!==item);render();};card.append(remove);}el('[data-items]').append(card);
  }update();if(key){const input=el(`[data-caption="${key}"]`);input?.focus();input?.setSelectionRange(start,end);}}
 function update(){if(!state)return;el('[data-count]').textContent=state.items.filter(i=>i.selected).length+' seleccionadas · '+state.items.filter(i=>!i.invalid&&dirty(i)).length+' pendientes';dialog.querySelectorAll('[data-tools] button,[data-tools] input,[data-tools] textarea,[data-save],[data-close],[data-consent]').forEach(n=>n.disabled=state.busy);el('[data-files]').disabled=state.busy||!!state.group.photoId;el('[data-save]').disabled=state.busy||!state.items.some(i=>!i.invalid&&dirty(i));}
 async function runSave(only){if(!state||state.busy)return;const current=state;const subset=only?{...current,items:[only],notify:()=>{current.busy=subset.busy;render();}}:current;await save(subset,client,el('[data-consent]').checked);current.busy=false;render();el('[data-message]').textContent=current.items.some(i=>i.error)?'Hay archivos o pies pendientes. Revisa cada error; los guardados no se duplican.':current.items.some(i=>!i.invalid&&dirty(i))?'Cambios guardados; quedan fotos sin subir o cambios pendientes. Selecciónalas para subirlas.':'Guardado. Las fotos nuevas siguen en borrador.';try{await onSaved();}catch(error){el('[data-message]').textContent+=' No se pudo refrescar la biblioteca; vuelve a abrir Proyectos.';}}
 function close(){if(state?.busy)return;if(state?.items.some(i=>!i.invalid&&dirty(i))&&!confirm('¿Cerrar con cambios pendientes? Las subidas ya realizadas permanecen en almacenamiento; las vistas previas locales se descartarán.'))return;++version;for(const item of state?.items||[])if(item.preview)URL.revokeObjectURL(item.preview);state=null;dialog.close();(opener?.isConnected?opener:document.querySelector('[data-photo-group="'+(dialog.dataset.groupId||'')+'"]'))?.focus();}
 el('[data-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 window.addEventListener('beforeunload',event=>{if(state&&(state.busy||state.items.some(i=>!i.invalid&&dirty(i)))){event.preventDefault();event.returnValue='';}});
 el('[data-files]').onchange=event=>{if(!state)return;addFiles(state,Array.from(event.target.files),()=>crypto.randomUUID(),file=>URL.createObjectURL(file));event.target.value='';render();};
 el('[data-select]').onclick=()=>{if(state&&!state.busy)state.items.forEach(i=>i.selected=!i.invalid);render();};el('[data-clear]').onclick=()=>{if(state&&!state.busy)state.items.forEach(i=>i.selected=false);render();};
 el('[data-apply]').onclick=()=>{if(state)applyCaption(state,el('[data-common]').value);render();};el('[data-save]').onclick=()=>runSave();
 return {async open(group){if(dialog.open)return;opener=document.activeElement;const request=++version;state=null;el('[data-items]').replaceChildren();el('[data-message]').textContent='Cargando fotos…';el('[data-save]').disabled=true;el('[data-tools]').hidden=true;el('[data-consent]').checked=false;el('[data-common]').value='';el('#photo-editor-heading').textContent=group.name;dialog.dataset.groupId=group.id;dialog.showModal();try{let query=client.from('portfolio_projects').select('*');query=group.photoId?query.eq('id',group.photoId):query.eq('group_id',group.id);const result=await bounded(query.order('group_position'));if(request!==version)return;if(result.error||!Array.isArray(result.data))throw Error('No se pudieron cargar las fotos. Cierra y vuelve a abrir para reintentar.');state=createState(group,result.data);state.notify=render;el('[data-tools]').hidden=false;el('[data-files]').disabled=!!group.photoId;el('[data-message]').textContent='Las selecciones no guardan ni publican automáticamente.';render();}catch(error){if(request===version)el('[data-message]').textContent=error.message;}}};
}
const api={bounded,createState,applyCaption,addFiles,validateFile,dirty,save,saveCaption,newProject,createProject,mount};if(typeof module==='object'&&module.exports)module.exports=api;else root.OGPortfolioPhotoEditor=api;
})(typeof window!=='undefined'?window:globalThis);
