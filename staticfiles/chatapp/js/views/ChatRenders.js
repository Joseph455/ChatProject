import {stringToHtml, dateToString, getDOMContainer} from "./view.js";


export function getFileName(fileURL) {
  let path = /[/]([a-z0-9_-]+[.][a-z0-9._-]+)$/i;
  
  if (path.test(fileURL)) {
    return path.exec(fileURL)[1];
  }
  
}

export function getPlayableFileData(fileURL) {
  let path = /[.]([0-9a-z]+)$/i;
  let res = path.exec(fileURL);

  if (res || fileType) {
    let fileFormat = res[1];
    let fileCategories = {
      "image": ["gif", "jpg", "jpeg", "png", "svg"],
      "video": ["mp4", "webm", "3gp"],
      "audio": ["mp3", "wav", "ogg"]
    };

    let file_data = {};

    for (let key of Object.keys(fileCategories)) {
      let formats = fileCategories[key];

      if (formats.includes(fileFormat)) {
        file_data.category = key;
        file_data.type = (fileFormat == "mp3") ? "mpeg" : fileFormat;
        file_data.url = fileURL;
        break;
      }

    }

    return file_data;
  }

}

export function renderReply(chat) {
  let str = "";
  if (chat.replying) {
    console.log(chat, "chat has a reply");
    if (chat.replying.message){
      if (chat.replying.message.text_content || chat.replying.message.file || chat.replying.message.images.length > 0) {
        str = `<a href="#chat-${chat.replying.id}" class="chat-reply flex-fill p-2 my-2 d-flex flex-column text-decoration-none">
              ${chat.replying.message.text_content || ""}
              <span>
                {{ img }}
                {{ file }}
              </span>
              </a>
            `;
          const svgs = {
            'image': `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M15 12V6a1 1 0 0 0-1-1h-1.172a3 3 0 0 1-2.12-.879l-.83-.828A1 1 0 0 0 9.173 3H6.828a1 1 0 0 0-.707.293l-.828.828A3 3 0 0 1 3.172 5H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
                <path fill-rule="evenodd" d="M8 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                <path d="M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
              </svg>
            `,
            'video': `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera-video" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175l3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
              </svg>
            `,
            'audio': `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-mic" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                <path fill-rule="evenodd" d="M10 8V3a2 2 0 1 0-4 0v5a2 2 0 1 0 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
              </svg>
            `,
            'document': `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-files" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M4 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
                <path d="M6 0h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1H4a2 2 0 0 1 2-2z"/>
              </svg>
            `
          };
        if (chat.replying.message.file) {
          let fileData;
          
          if (chat.replying.mediaIsLocal){
            fileData = getPlayableFileData(chat.replying.message.file.name);
          } else {
            fileData = getPlayableFileData(chat.replying.message.file.file);
          }

          let category = (fileData) ? fileData.category : "document";

          str = str.replace("{{ file }}", `
            ${svgs[category] || svgs.document}
            ${category || "File"}
          `).replace("{{ img }}", "");
        } else if (chat.replying.message.images.length > 0){
          str = str.replace("{{ img }}", `
            ${svgs.image}
            Photo
          `).replace("{{ file }}", "");
        } else {
          str = str.replace("{{ file }}", "").replace("{{ img }}", "");
        }
      } else if (chat.replying.message.code) {
          str = `
            <div class="chat-reply flex-fill p-2 my-2">
              <code class="chat-reply-code" >${chat.replying.message.code.content}</code>
            </div>
          `;
      }
    } else if (chat.replying.notifiyer) {
      if (chat.replying.notifiyer.action == "Delete:Chat") {
        str = `
          <div class="chat-reply flex-fill text-muted p-2 my-2">
            This message has been deleted
          </div>
        `;
      }
    }
  }
  return str;
}

function renderCode(message) {
  return "";
}


export function renderFile(message, chat) {
  let str;

  if (message.file) {
    let fileData;
    
    if (chat.mediaIsLocal){
      fileData = getPlayableFileData(message.file.name);
    } else {
      fileData = getPlayableFileData(message.file.file);
    }

    if (fileData && Object.keys(fileData).length>0) {
      if (fileData.category == "image") {
        str = renderImages([{"image": message.file.file}]);
      } else {
        str = `
          <${fileData.category} class="chat-${fileData.category}" controls  >
            <source src="${message.file.file}" type="${fileData.category}/${fileData.type}">
            your browser does not support this ${fileData.category} format.
          </${fileData.category}>
        `;
      }
    } else {
      str = `
      <div class="chat-document d-flex border border-secondary rounded-pill p-3">
        <span class="flex-fill text-truncate"> ${getFileName(message.file.file) || message.file.name || "File"} </span>
        <a class="rounded-pill" download="${getFileName(message.file.file) || message.file.name || "File"}" href="${message.file.file}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-arrow-down-circle icon" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path fill-rule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
          </svg>
        </a>
      </div>
      `;
    }
  }
  return str;
}

export function renderImages(images) {
  let str = ``;
  if (images.length > 0) {

    if (images.length == 1) {
      str = `
        <div class="chat-image-container d-flex w-100" style="  width:max-content;">
          <img class="chat-image flex-fill w-100" src="${images[0].image}" />
          <span class="caption">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill icon text-secondary" viewBox="0 0 16 16">
              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
              <path fill-rule="evenodd" d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
          </span>
         </div>
      `;
    } else if (images.length == 2) {
      str = `
        <div class="chat-image-container d-flex w-100">
          <img class="chat-image flex-fill w-50 mx-1" src="${images[0].image}" />
          <img class="chat-image flex-fill w-50" src="${images[1].image}" />
          <span class="caption">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill icon text-secondary" viewBox="0 0 16 16">
              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
              <path fill-rule="evenodd" d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
          </span>
        </div>
      `;
    } else if (images.length == 3) {
      str = `
        <div class="chat-image-container d-flex flex-column p-0 mb-2">
          <span class="w-100 d-flex p-0 h-50">
            <img class="chat-image flex-fill w-50" src="${images[0].image}" />
            <img class="chat-image flex-fill w-50" src="${images[1].image}" />
          </span>
          <img class="chat-image w-50 h-50 mt-1 align-self-center" src="${images[2].image}" />
          <span class="caption">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill icon text-secondary" viewBox="0 0 16 16">
              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
              <path fill-rule="evenodd" d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
          </span>
          {{ loading }}
        </div>
      `;
    } else if (images.length == 4) {
      str = `
        <div class="chat-image-container d-flex flex-column mb-2">
          <span class="flex-fill d-flex h-50 w-100">
            <img class="chat-image flex-fill w-50" src="${images[0].image}" />
            <img class="chat-image flex-fill w-50" src="${images[1].image}" />
          </span>
          <span class="flex-fill d-flex h-50 w-100">
            <img class="chat-image flex-fill w-50" src="${images[2].image}" />
            <img class="chat-image flex-fill w-50" src="${images[3].image}" />
          </span>
          <span class="caption">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill icon text-secondary" viewBox="0 0 16 16">
              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
              <path fill-rule="evenodd" d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
          </span>
          {{ loading }}
        </div>
      `;
    } else {
      str = `
        <div class="chat-image-container d-flex flex-column mb-2">
          <span class="flex-fill d-flex h-50 w-100">
            <img class="chat-image flex-fill w-50" src="${images[0].image}" />
            <img class="chat-image flex-fill w-50" src="${images[1].image}" />
          </span>
          <span class="flex-fill d-flex h-50 w-100">
            <img class="chat-image flex-fill w-50" src="${images[2].image}" />
            <img class="chat-image flex-fill w-50" src="${images[3].image}" />
          </span>
          <span class="caption">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill icon text-secondary" viewBox="0 0 16 16">
            <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
            <path fill-rule="evenodd" d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg><br>
            + ${images.length - 4}
          </span>
          {{ loading }}
        </div>
      `;
    }
  }

  return str;
}

export function renderTextContent(message) {
  let str;

  if (message.text_content) {
    str = `<span>${message.text_content}</span>`;
  }

  return str;
}

function renderMessage(chat) {
  let str = "";

  if (chat.message) {
    str = `
      <div class="flex-fill d-flex flex-column">
        ${renderReply(chat) || ""}${renderCode(chat.message) ||
      renderImages(chat.message.images) ||
      renderFile(chat.message, chat) || ""
      }${renderTextContent(chat.message) || ""}
      </div>
    `;
    
    if (chat.state == "loading"){
      let loadSpinner = `
        <div class="spinner-border" role="status">
          <span class="sr-only">Loading...</span>
        </div>
      `;
      str = str.replace("{{ loading }}", loadSpinner);
    } else {
      str = str.replace("{{ loading }}", "");    
    }
  }

  return str;
}

function renderChatActions(chat) {
  let str;
  if (chat.message && chat.creator == LoggedUser) {
    str = `
      <div class="d-flex w-100">
        <span class="ml-auto">
          <span id="chat-${chat.id}-action" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </span>
          <div class="dropdown-menu mh-75 dropdown-menu-right mw-100 bg-light" aria-labelledby="chat-${chat.id}-action">
            <span id="reply-action" class="dropdown-item" for="list-image-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply-fill" viewBox="0 0 16 16">
                <path d="M9.079 11.9l4.568-3.281a.719.719 0 0 0 0-1.238L9.079 4.1A.716.716 0 0 0 8 4.719V6c-1.5 0-6 0-7 8 2.5-4.5 7-4 7-4v1.281c0 .56.606.898 1.079.62z"/>
              </svg>  
              Reply
            </span>
            <span id="forward-action" class="dropdown-item" for="list-file-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-forward-fill" viewBox="0 0 16 16">
                <path d="M9.77 12.11l4.012-2.953a.647.647 0 0 0 0-1.114L9.771 5.09a.644.644 0 0 0-.971.557V6.65H2v3.9h6.8v1.003c0 .505.545.808.97.557z"/>
              </svg> 
              Forward
            </span>
            <span id="delete-action" class="dropdown-item" for="list-file-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0v-7z"/>
              </svg>
              Delete
            </span>
          </div>
        </span>
      </div>
    `;
  } else {
    str = `
      <div class="d-flex w-100">
        <span class="ml-auto">
          <span id="chat-${chat.id}-action" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </span>
          <div class="dropdown-menu mh-75 dropdown-menu-right mw-100 bg-light" aria-labelledby="chat-${chat.id}-action">
            <span id="reply-action" class="dropdown-item" for="list-image-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply-fill" viewBox="0 0 16 16">
                <path d="M9.079 11.9l4.568-3.281a.719.719 0 0 0 0-1.238L9.079 4.1A.716.716 0 0 0 8 4.719V6c-1.5 0-6 0-7 8 2.5-4.5 7-4 7-4v1.281c0 .56.606.898 1.079.62z"/>
              </svg>  
              Reply
            </span>
            <span id="forward-action" class="dropdown-item" for="list-file-input">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-forward-fill" viewBox="0 0 16 16">
                <path d="M9.77 12.11l4.012-2.953a.647.647 0 0 0 0-1.114L9.771 5.09a.644.644 0 0 0-.971.557V6.65H2v3.9h6.8v1.003c0 .505.545.808.97.557z"/>
              </svg>
              Forward
            </span>
          </div>
        </span>
      </div>
    `;
  }
  return str;
}

export function chatToHtmlString(chat) {
  let str = "";

  if (chat.notifiyer) {
    if (chat.notifiyer.action == "Delete:Chat") {
      str = `
        <div class="d-flex w-100 justify-content-center delete">
          <span class="flex-fill text-center">This message has been deleted<span>
          <small>${dateToString(chat.date_created)}</small>
        </div>
      `;
    }
  } else {

    str = `
      <div class="{{ flex-direction }} mw-100 p-0" style="min-width:30%;">
        <div class="chat-box-{{ direction }} d-flex flex-column p-2 shadow-lg">
          ${renderChatActions(chat) || ""}
          ${renderMessage(chat) || ""}
          <small class="ml-auto">${dateToString(chat.date_created)}</small>
        </div>
      </div>
    `;

    if (chat.creator == LoggedUser) {
      str = str.replace("{{ flex-direction }}", "ml-auto").replace("{{ direction }}", "right");
    } else {
      str = str.replace("{{ flex-direction }}", "mr-auto").replace("{{ direction }}", "left");
    }

  }
  return str;
}