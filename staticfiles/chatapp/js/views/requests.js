

export function AjaxGetRequest(url, queryParam){
  return new Promise((resolve, reject)=> {
    let FullUrl = url;
    let xhr = new XMLHttpRequest();
   
    queryParam = queryParam || {};

    Object.keys(queryParam).forEach(param => {
      FullUrl += `&${param}=${queryParam[param]}`;
    });
    
    xhr.open('GET', FullUrl, true);
    xhr.send();
    
    xhr.onload = ()=>{
      if (xhr.status == 200){
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(xhr);
      }
    };

    xhr.onerror = (error) =>  {
      setTimeout(()=>{
        resolve(AjaxGetRequest(url, queryParam));
      }, 3000);
    };

  });
}

export function AjaxGetFile(url){
  return new Promise((resolve, reject)=> {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.send();

    xhr.onload = () => {
      if (xhr.status == 200){
        resolve (xhr.response);
      } else {
        reject(xhr);
      }
    };

  });
}


export function AjaxPOSTRequest (url, headers, body, method) {
  return new Promise((resolve, reject)=> {
    let xhr = new XMLHttpRequest();
    
    xhr.open(method||'POST', url, true);
    
    Object.keys(headers).forEach(header => {
      xhr.setRequestHeader(header, headers[header]);
    });
    
    xhr.send(body);
    
    xhr.onload = () => {
      if (xhr.status == 200 || xhr.status == 201){
        resolve(JSON.parse(xhr.responseText));
      } else if (xhr.status == 204) {
        resolve();        
      } else if (xhr.status == 400 || xhr.status == 404) {
        try {
          reject(JSON.parse(xhr.responseText));
        } catch (error){
          reject(xhr.responseText);
        }
      }
    };
  });
}


export function promiseEventLoop(event, params, success, faliure, dueration, escVar) {
  // use escvar to control eventLoop
  // escVar must be around the surrounding scope

  let stop = false;
  if (!escVar){
    escVar = "StopEventLoop";
  }
  
  try {
    eval(`if (${escVar} == true){ stop=true; }`); // ends eventlopp 
  } catch(error) {
    eval(`window["${escVar}"] = false;`);
  }

  if (stop) return;

  params = params || [];
  dueration = dueration || 3000;
  
  event(...params).then((data)=> {
    success(data);
    setTimeout(() => {
      promiseEventLoop(event, params, success, faliure, dueration, escVar);
    }, dueration);

  }).catch((error)=> {
    faliure(error);

    setTimeout(()=> {
      promiseEventLoop(event, params, success, faliure, dueration, escVar);
    }, dueration);

  });
}

