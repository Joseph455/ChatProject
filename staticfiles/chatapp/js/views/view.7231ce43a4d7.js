import {AjaxGetRequest} from "./requests.js";
import {User} from "../models.js";


export function stringToHtml(string, topTag) {
  topTag = topTag || "DIV";

  let support = (function isSupportDomPraser() {
    if (!window.DOMParser) return false;

    let parser = new DOMParser();
    try {
      parser.parseFromString('<div ></div>', 'text/html');
    } catch (error) {
      return false;
    }
    return true;
  })();

  if (support) {
    let parser = new DOMParser();
    let dom = parser.parseFromString(string, "text/html");
    let body = dom.getElementsByTagName("body")[0];
    let html = document.createElement(topTag);

    Array.from(body.childNodes).forEach(child => {
      html.appendChild(child);
    });

    return html;
  } else {
    let html = document.createElement(topTag);
    html.innerHtml = string;
    return html;
  }
}

export function dateToString(date) {
  let now = new Date();
  if (date.toDateString() == now.toDateString()){
    return date.toLocaleTimeString();
  } else {
    return date.toLocaleDateString();
  }
}

export function getCookies() {
  let arr = document.cookie.split(/\s+/);
  let cookies = {}; 
  let path = /(\w+)[=](\w+)/;
  
  arr.forEach(cookie => {
    if (path.test(cookie)){
      let res = path.exec(cookie);
      cookies[res[1]] = res[2];
    }
  });
  
  return cookies;
}

export function objectToFormData(obj) {
  let form = new FormData();

  Object.keys(obj).forEach(key => {
    form.append(key, obj[key]);
  });

  return form;
}


export function  EncodeNestedObject (obj) {
  let encodedList = [];

  function encode(obj, list, parentIsList, parentKey) {

    if (parentKey && parentIsList == false){
      list.push(`${encodeURI(parentKey)}=[`);
    } else if (parentKey && parentIsList == true){
      list.push(`${encodeURI(parentKey)}=[`);
    }

    for (let key in obj){
      if ((obj[key] instanceof Object)) {
        if (obj[key] instanceof Array){
          encode(obj[key], list, true, key);
        } else {
          encode(obj[key], list, false, key);
        }
      } else {
        let encodedData;

        if (parentIsList) {
          encodedData = `${encodeURI(obj[key])}`;
        } else {
          encodedData = `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`;
        }

        list.push(encodedData);
      }

    }

    if (parentKey && parentIsList == false){
      list.push(`]`);
    } else if (parentKey && parentIsList == true){
      list.push(`]`);
    }
    
    let encodeData = list.join("&");
    let arr =  encodeData.match(/\[[&]*(\w+[&])+[&]*]/g);
    
    if (arr) {
      console.log(arr);
      arr.forEach(list => {
        encodeData = encodeData.replace(list, list.replace(/&/g, ","));
      });
    }

    return encodeData.replace(/{&/g, `${encodeURIComponent("{")}`).replace(/&}/g, `${encodeURIComponent("}")}`)
    .replace(/\[[,]*/g, `${encodeURIComponent("[")}`).replace(/[,]\]/g, `${encodeURIComponent("]")}`);
  }

  return encode(obj, encodedList);
}


export async function getLoggedUser(url, queryParam) {
  try {
    url = url || `${window.location.href}api/users/?format=json`;
    queryParam =  queryParam||{"logged-in":"true"};
    let list = await AjaxGetRequest(url, queryParam);
    if (list.results.length > 0){
      let userData = list.results[0];
      let profileData = await AjaxGetRequest(userData.profile);
      return new User(userData, profileData);
    } else {
      window.location.href = APIROOT["api-auth-login"];  // redirect to login page since user is not logged in
    }

  } catch(error){
    console.log(error);
  }
}


export async function getAPIROOT() {
  try {
    let root = await AjaxGetRequest(`${window.location.origin}/api/?format=json`);
    return root;
  } catch(error){
    console.log(error);
  }
}

export function setGlobalViewMode(){
  if (window.innerWidth >= 768){
    window.GlobalViewMode = "desktop";
  }  else {
    window.GlobalViewMode = "mobile";
  }
}

export function getDOMContainer(section, id){
  let container = null;
  
  if (id) {
    container = document.getElementById(id);
  } else {
    if (section.toLowerCase() == "list"){
        container = document.getElementById("container-list-body");
    } else if (section.toLowerCase() == "detail") {
      if (GlobalViewMode =="mobile"){
        container = document.getElementById("container-list-body");
      } else {
        container = document.getElementById("container-detail-body");
      }
    } else if (section.toLowerCase() == "input") {
      if (GlobalViewMode =="mobile"){
        container = document.getElementById("list-input");
      } else {
        container = document.getElementById("detail-input");
      }
    }
  }

  return container;
}


export function getSpinner() {
  let str = `
    <div class="spinner-border" role="status">
      <span class="sr-only">Loading...</span>
    </div>
  `;

  let spinner = stringToHtml(str, "div");
  return spinner;
}