import { AjaxGetRequest, AjaxPOSTRequest, promiseEventLoop, AjaxGetFile} from "./requests.js";
import { User, Conversation, QuerySet, Chat } from "../models.js";
import { stringToHtml, objectToFormData, dateToString, getDOMContainer, setGlobalViewMode, getCookies, getAPIROOT, getSpinner} from "./view.js";
import {getConversationMemeber} from "./ChatListView.js";
import * as ChatRender from "./ChatRenders.js";


async function getChats(url, queryParam) {
  try {
    queryParam = queryParam || { "ordering": "-date_created" };
    let chats = await AjaxGetRequest(url, queryParam);
    return chats;

  } catch (error) { throw error; }
}

async function getChatReciever(url, queryParam) {

  try {
    queryParam = { "reciever__id": LoggedUser.id };
    let recieverData = await AjaxGetRequest(url, queryParam);
    return recieverData.results[0];
  } catch (error) { throw error; }

}

async function getUpdates(conversation, url) {

  try {
    let dateTo = new Date();
    let queryParam;
    let queryset = conversation.PageState.queryset;
    url = url || `${conversation.url.replace("?format=json", "chats/?format=json")}`;

    if (queryset.queries.length > 0) {
      let dateFrom = new Date(queryset.sort("date_created", false)[0].date_created);
      dateFrom.setMilliseconds(dateFrom.getMilliseconds() + 1);
      queryParam = { "date_created__gt": dateFrom.toJSON(), "date_created__lte": dateTo.toJSON() };
    } else {
      queryParam = { "date_created__lte": dateTo.toJSON() };
    }

    return await getChats(url, queryParam);
  } catch (error) { throw error; }

}

async function getBackDates(url) {

  try {
    url = url.replace("&ordering=date_created", ""); 
    return await getChats(url, {"ordering": "-date_created"});
  } catch (error) { throw error; }

}

function pushUpdateToQuerySet(updates, conversation) {
  updates.forEach(chatData => {
    let chat = conversation.PageState.queryset.get({ "id": chatData.id });
    let container = getDOMContainer("detail");
    
    if (chat) {
      if (chat.state != "loading") {
        chat.update(chatData);
        renderToDOM(chat, container, conversation);
        container.scrollTop = container.scrollHeight;
      }
    } else {
      createChat(chatData, conversation).then(chat => {
        conversation.PageState.queryset.add(chat);
        renderToDOM(chat, container, conversation);
        container.scrollTop = container.scrollHeight;
        notifyChatAsRead(chat);
      }).catch(error => { throw error; });
    }
  });
}

async function createChat(chatData, conversation) {
  try {
    let url = `${chatData.url.replace("?format=json", "recievers/?format=json")}`;

  if (!chatData.notifiyer){
    if (typeof chatData.creator == "string") {
      if (chatData.creator == conversation.member.url) {
        chatData.creator = conversation.member;
      } else {
        chatData.creator = LoggedUser;
      } 
    } else {
      console.log(conversation.member);
      if (chatData.creator.id == conversation.member.id) {
        chatData.creator = conversation.member;
      } else  {
        chatData.creator = LoggedUser;
      }
    }

    if (chatData.replying) {
      console.log(chatData);
      let replying = await AjaxGetRequest(chatData.replying.url, {});
      chatData.replying = replying;
    }
  }  

    let chat = new Chat(chatData);
    chat.conversation = conversation;
    return chat;
  } catch (error) { throw error; }
}

function createDOM(chat, conversation) {
  let str = ChatRender.chatToHtmlString(chat);
  let DOM = stringToHtml(str);
  setDOMSTATE(DOM, chat);
  appendEventListeners(DOM, chat, conversation);
  return DOM;
}

function appendEventListeners(DOM, chat, conversation){
  let replyActn = DOM.querySelectorAll(`#reply-action`)[0];
  let deleteActn = DOM.querySelectorAll(`#delete-action`)[0];
  let forwardActn = DOM.querySelectorAll(`#forward-action`)[0];
  let imageContaiiner = DOM.querySelector(".chat-image-container");

  if (imageContaiiner){
    imageContaiiner.addEventListener("click", (event)=>{
      $("#chat-image-modal").modal("show");
      let modal = document.querySelector("#chat-image-modal");
      let carosuelContainer = modal.querySelector(".carousel-inner");
      
      carosuelContainer.innerHTML = "";

      for (let img of chat.message.images){
        if (chat.message.images.indexOf(img)==0){
          carosuelContainer.innerHTML += `
          <div class="carousel-item active w-100 h-100">
            <img src="${img.image}" style="object-fit: contain;" class="d-block w-100 h-100" alt="...">
          </div>
        `;
        } else {
          carosuelContainer.innerHTML += `
            <div class="carousel-item w-100 h-100">
              <img src="${img.image}" style="object-fit: contain;" class="d-block w-100 h-100" alt="...">
            </div>
          `;
        }
      }

      if (chat.message.images.length == 0) {
        let images = Array.from(imageContaiiner.querySelectorAll("img"));
        images.forEach(img => {
          if (images.indexOf(img)==0){
            carosuelContainer.innerHTML += `
            <div class="carousel-item active w-100 h-100">
              <img src="${img.src}" class="d-block w-100 h-100" alt="...">
            </div>
          `;
          } else {
            carosuelContainer.innerHTML += `
              <div class="carousel-item w-100 h-100">
                <img src="${img.src}" class="d-block w-100 h-100" alt="...">
              </div>
            `;
          }  
        });
      }

      modal.querySelector(".close").addEventListener("click", ()=>{
        $("#chat-image-modal").modal("hide");
      });

    });
  }


  if (replyActn){
    replyActn.addEventListener("click", (event) => {
      event.cancleBubble = true;

      // clear chatForm
      for (let key in conversation.PageState.ChatForm){
        conversation.PageState.ChatForm[key] = null;
      }

      let inputContainer = getDOMContainer("input");
      
      if (inputContainer) {
        let submitBtn = inputContainer.querySelector("#input-submit");
        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply-fill icon" viewBox="0 0 16 16">
            <path d="M9.079 11.9l4.568-3.281a.719.719 0 0 0 0-1.238L9.079 4.1A.716.716 0 0 0 8 4.719V6c-1.5 0-6 0-7 8 2.5-4.5 7-4 7-4v1.281c0 .56.606.898 1.079.62z"/>
          </svg>
        `;
        let closeBtn = stringToHtml(
          `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x bi-x-fill icon" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
          `, "span");
        
        closeBtn.setAttribute("class", "nav-text");
        closeBtn.setAttribute("id", "close-btn");

        
        closeBtn.addEventListener("click", ()=>{
          submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
            <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
          </svg>`;
          closeBtn.remove();
          
          // clear chat form
          for (let key in conversation.PageState.ChatForm){
            conversation.PageState.ChatForm[key] = null;
          }

        });
        submitBtn.insertAdjacentElement("beforebegin", closeBtn);
      }
      // set chatForm replying to object type if using AJAX
      // else set it to repyling chat id
      conversation.PageState.ChatForm.replying = {"id": chat.id, "url": chat.url};
      // conversation.PageState.ChatForm.replying = chat.id;

    });
  }

  if (deleteActn) {
    deleteActn.addEventListener("click", (event) => {
      event.cancleBubble = true;
      (async () => {
        try {
          let headers = {
            "X-CSRFToken": getCookies().csrftoken,
            "Content-Type": "application/json"
          };
          let chatData = await AjaxPOSTRequest(chat.url, headers, {}, "DELETE");
          
          if (chatData) {
            DOM.innerHTML =`
              <div class="d-flex w-100 justify-content-center delete">
                <span class="flex-fill text-center">This message has been deleted<span>
                <small>${dateToString(chat.date_created)}</small>
              </div>
            `;
            setDOMSTATE(DOM, chatData);
            chat = createChat(chatData, conversation);
          }
        } catch(error) {
          console.log(error);
        }
      })();

    });
  }

  if (forwardActn) {
    forwardActn.addEventListener("click", (event) => {
      let modalJQ = $("#forward-modal");
      let modal = document.getElementById("forward-modal");
      const queryset = new QuerySet(Conversation);
      
      (async function prepConversations() {
        let data = await AjaxGetRequest(APIROOT.conversations, {'ordering':'-timestamp'});
        
        do {
          
          for (let convData of data.results){
            let conversation = await createConversation(convData);
            if (conversation.id == window.activeConversation.id) continue;
            queryset.add(conversation);
          }
          
          if (data.next){
            data = await AjaxGetRequest(data.next, {'ordering':'-timestamp'});
          }

        } while (data.next);

        queryset.sort("timestamp", true);

        let container = modalJQ.find("#modal-body")[0];
        let sendBtn = stringToHtml(`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-forward-fill icon" viewBox="0 0 16 16">
            <path d="M9.77 12.11l4.012-2.953a.647.647 0 0 0 0-1.114L9.771 5.09a.644.644 0 0 0-.971.557V6.65H2v3.9h6.8v1.003c0 .505.545.808.97.557z"/>
          </svg>
        `, "span");

        sendBtn.id = "send";
        sendBtn.setAttribute("class", "ml-auto align-self-center text-success bg-transparent");
        
        // Replace prev sendBtn with an identical one to remove any underlying event listners  
        modal.querySelector("#send").replaceWith(sendBtn);

        container.innerHTML = "";

        queryset.queries.forEach(conv => {
          createDOM(conv);
          container.appendChild(conv.DOM);
        });

        modalJQ.modal("show");

        sendBtn.addEventListener("click", event => {
          modalJQ.modal("hide");

          Array.from(container.querySelectorAll(".active")).forEach(async convDOM => {
            let form;
            let headers = {
              "X-CSRFToken": getCookies().csrftoken,
              "Content-Type":"application/json",
            };

            
            if (chat.message.file || chat.message.images.length>0){
              let message = Object.assign({}, chat.message);
              message.file = null;
              message.images = [];
              form = JSON.stringify({"message": message, "replying": null});
              
              let conversation = convDOM.conversation;
              let url = conversation.url.replace("?format=json", "chats/");
              let forwardedChat = await AjaxPOSTRequest(url, headers, form, 'POST');
              
              if (chat.message.file) {
                let form = {
                  "file": chat.message.file.file,
                  "chat": forwardedChat.id
                };
                AjaxPOSTRequest(APIROOT.files, headers, JSON.stringify(form), 'POST');
              } else if (chat.message.images.length>0){
                chat.message.images.forEach(img => {
                  let form = {
                    "image": img.image,
                    "chat": forwardedChat.id
                  };
                  
                  AjaxPOSTRequest(APIROOT.images, headers, JSON.stringify(form), 'POST');
                });
              }
              
            } else {
              form = JSON.stringify({"message":chat.message, "replying": null });
              let conversation = convDOM.conversation;
              let url = conversation.url.replace("?format=json", "chats/");
              AjaxPOSTRequest(url, headers, form, 'POST');
            }
          });
        
        });

      })();

      function createDOM(conversation) {
        let str = `
          <img src="${conversation.member.profile_picture}" class="mr-auto rounded-circle" alt="..." style="width:2rem;heigth:2rem;">
          <span class="d-flex flex-fill mx-2">
            <span class="flex-fill">
              <h5 class="mt-0 text-capitalize ">${conversation.member.first_name} ${conversation.member.last_name}</h5>
            </span>
            <span  class="ml-auto invisible d-flex justify-content-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check icon align-self-center" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/>
              </svg>
            </span>
          </span>
        `;
        
        let DOM = stringToHtml(str);
        DOM.setAttribute("id", `conv-${conversation.id}`);
        DOM.setAttribute("class", "my-3 d-flex w-100 p-1 conv-forward badge-pill");
        DOM.addEventListener("click", event=> {
          event.cancleBubble = true;
          if (DOM.classList.contains("active")){
            DOM.classList.remove("active");
          } else {
            DOM.classList.add("active");            
          }
        });
        conversation.DOM = DOM;
        DOM.conversation = conversation;
      }

    });
  
  }

}

async function createConversation(convData) {
  try {
    let conversation = new Conversation(convData);
    conversation.member = await getConversationMemeber(convData);
    return conversation;
  } catch (error){
    throw error;
  }
}

function setDOMSTATE(DOM, chat) {
  DOM.setAttribute("id", `chat-${chat.id}`);
  if (chat.notifiyer) {
    DOM.setAttribute("class", "chat-box-notifiyer my-3 p-2");
  } else {
    DOM.setAttribute("class", "d-flex w-100 bg-transparent my-3 p-0");
  }
}

function renderToDOM(chat, container, conversation, pos) {
  chat.DOM = createDOM(chat, conversation);
  let check = container.querySelector(`#chat-${chat.id}`);

  if (check) {
    container.replaceChild(chat.DOM, check);
  } else {
    if (pos == "top"){
      container.prepend(chat.DOM);
    } else {
      container.appendChild(chat.DOM);
    }
  }

}

function prepareContainer(conversation, top, body, form) {
  // container top
  let strTop = `
      <a href="" class="align-self-center mx-1 d-none d-block d-md-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-short icon" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z"/>
        </svg>
      </a>
      <div class="media mt-1 w-100 p-3 flex-fill">
        <img src="${conversation.member.profile_picture}" class="mr-3 icon" alt="...">
        <div class="media-body">
          <h5 class="mt-0 text-capitalize text-lg">${conversation.member.first_name} ${conversation.member.last_name}</h5>
        </div>
      </div>
      <span class="ml-auto mr-2 nav-text align-self-center" id="dropdown-nav-more-sm" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots-vertical icon" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>
      </span>
      <div class="dropdown-menu mh-75 dropdown-menu-right" aria-labelledby="dropdown-nav-more-sm">
        <a class="dropdown-item" href="#">Action</a>
        <a class="dropdown-item" href="#">Another action</a>
        <a class="dropdown-item" href="">Something else here</a>
        <div class="dropdown-divider"></div>
        <a class="dropdown-item" href="#">Separated link</a>
      </div>
    `;
  top.innerHTML = strTop;

  body.innerHTML = "";
  form.parentElement.setAttribute("class", "p-0 w-100");
  form.reset();

  let imageInput  = form.querySelector("#image-input");
  let fileInput = form.querySelector("#file-input");
  
  // Replace prev submitBtn with an identical one to remove any underlying event listners 
  let submitBtn = stringToHtml(`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
      <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
    </svg>
  `, "span");

  submitBtn.id = "input-submit";
  submitBtn.setAttribute("class", "ml-2 nav-text");


  form.replaceChild(submitBtn, form.querySelector("#input-submit"));

  if (imageInput){
    imageInput.addEventListener("change", (event)=> {
      if (event.target.files.length>0){
        Array.from(event.target.labels).forEach(label=> {
          let activeDot = label.querySelector(".d-none");
  
          if (activeDot) {
            if (activeDot.classList.contains("d-none")){
              activeDot.classList.remove("d-none");
            } else {
              activeDot.classList.add("d-none");
            }
          }
        });
      }
    });
  }
  
  if (fileInput){
    fileInput.addEventListener("change", (event)=> {
      if (event.target.files.length>0){
        Array.from(event.target.labels).forEach(label=> {
          let activeDot = label.querySelector(".d-none");
          if (activeDot) {
            if (activeDot.classList.contains("d-none")){
              activeDot.classList.remove("d-none");
            } else {
              activeDot.classList.add("d-none");
            }
          }
        });
      }
    });
  }

  form.querySelector("#input-submit").addEventListener("click", async (event)=> {
    let textarea = form.querySelector("textarea");
    let imageInput  = form.querySelector("#image-input");
    let fileInput = form.querySelector("#file-input");

    let message = {
      "text_content": ""||textarea.value,
      "file": null,
      "images": []
    };

    conversation.PageState.ChatForm.message = message;

    let file = fileInput.files[0];
    let images = [...Array.from(imageInput.files)];

    if (file){
      file.file = URL.createObjectURL(file);
    }

    images.map((image) => {
      image.image = URL.createObjectURL(image);
    });

    
    // check if ready to sumbit
    let submit = (
      message.text_content ||
      imageInput.files.length> 0 ||
      fileInput.files.length > 0 ) ? true: false;
      
      
      if (submit) {
        let headers = {
          "X-CSRFToken": getCookies().csrftoken,
          "Content-Type":"application/json",
        };
        
        let container = getDOMContainer("detail");
        let url = `${conversation.url.replace("?format=json", "chats/?format=json")}`;
        // let chatData = await AjaxPOSTRequest(url, headers, JSON.stringify(ChatForm));

        form.querySelector("#input-submit").innerHTML = getSpinner().innerHTML;

        if (conversation.PageState.socket.OPEN === 1){
          
          // send files
          let sentFile;
          let sentImages  = [];

          if (file) {
            headers = {"X-CSRFToken": getCookies().csrftoken};
            let body = new FormData();
            body.set("file", file);
            let fileData = await AjaxPOSTRequest(APIROOT.files, headers, body);        
            sentFile = {"file": fileData.file};
          } else {
            for (let img of images) {
              headers = {"X-CSRFToken": getCookies().csrftoken};
              let body = new FormData();
              body.set("image", img);
              let imageData = await AjaxPOSTRequest(APIROOT.images, headers, body);
              sentImages.push({"image":imageData.image});
            }
          }
          
          conversation.PageState.ChatForm.message.file = sentFile;
          conversation.PageState.ChatForm.message.images = sentImages;

          conversation.PageState.socket.send(JSON.stringify(conversation.PageState.ChatForm));
        }

        conversation.PageState.socket.onerror = (event) => {
          console.log(event);
        };

        conversation.PageState.socket.addEventListener("message", async (event) => {
          const data = JSON.parse(event.data);
          if (data.chat) {
            const chatData = data.chat;
            let newChat = await createChat(chatData, conversation);
            newChat.message.images = images;
            newChat.message.file = file;
            newChat.mediaIsLocal = true;
            conversation.PageState.queryset.add(newChat);
            renderToDOM(newChat, container, conversation);
            container.scrollTop = container.scrollHeight;
            
            // clean up
            textarea.form.reset();

            fileInput.labels[0].querySelector(".active-dot").classList.add("d-none");
            imageInput.labels[0].querySelector(".active-dot").classList.add("d-none");

            form.querySelector("#input-submit").innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
                <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
              </svg>
            `;

            
            if (conversation.PageState.ChatForm.replying) {
              form.querySelector("#close-btn").remove();
            }
            
            for (let key in conversation.PageState.ChatForm){
              conversation.PageState.ChatForm[key] = null;
            }
            
          } else if (data.errors){
            console.log(data.errors);
          }

        }, {"once": true});
      }
  });
}

async function notifyChatAsRead(chat){
  let url = `${chat.url.replace("?format=json", "receivers/?format=json")}`;
  let queryParam = {"receiver__id": LoggedUser.id};
  let body = JSON.stringify({"read": true});
  let headers = {
    "X-CSRFToken": getCookies().csrftoken,
    "Content-Type":"application/json",
  };

  try {
    let receiverDetail = await AjaxGetRequest(url, queryParam);
    if (receiverDetail.results.length > 0) {
      if (receiverDetail.results[0].read == false){
        try {
          chat.receiverDetail = await AjaxPOSTRequest(receiverDetail.results[0].url, headers, body, "PATCH");
        } catch (error){
          console.log(receiverDetail.results[0]);
        }
      } else {
        chat.receiverDetail = receiverDetail.results[0];
      }
    }
  } catch(error){
    throw error;
  }

}

async function init(conversation) {
  const queryset = new QuerySet(Chat);
  const Cusor = { "next": null, "previous": null };
  const ChatForm = {"message": null, "replying": null};
  
  const socketProtocol = (window.location.protocol == "http:")? "ws:" : "wss:"; 
  const socketUrl = `${socketProtocol}//${window.location.host}/ws/conversations/${conversation.id}/`;    
  const socket = new WebSocket(socketUrl);

  window.activeConversation = conversation;

  conversation.PageState = {};
  conversation.PageState.queryset = queryset;
  conversation.PageState.Cusor = Cusor;
  conversation.PageState.ChatForm = ChatForm;
  conversation.PageState.socket = socket;

  let inputSection, topSection;
  let bodySection = getDOMContainer("detail");

  if (GlobalViewMode == "mobile") {
    inputSection = document.getElementById("list-input");
    topSection = document.getElementById("container-list-top");
  } else {
    topSection = document.getElementById("container-detail-top");
    inputSection = document.getElementById("detail-input");
  }

  prepareContainer(conversation, topSection, bodySection, inputSection);

  try {
    let spinner = getSpinner();
    spinner.setAttribute("class", "d-flex justify-content-center my-auto p-0");
    
    let container = getDOMContainer("detail");
    container.innerHTML = "";
    
    container.prepend(spinner);
    
    let url = `${conversation.url.replace("?format=json", "chats/?format=json")}`;
    let chats = await getChats(url);
  
    for (let i = chats.results.length-1; i >= 0 ; i--) {
      let chatData = chats.results[i];
      let chat = await createChat(chatData, conversation);
      queryset.add(chat);
      spinner.remove();
      renderToDOM(chat, container, conversation);
      notifyChatAsRead(chat);
      // scroll to the bottom of the page 
      container.scrollTop = container.scrollHeight;
    }
    

    if (GlobalViewMode == "desktop"){
      // remove unread chats indicator from conversation DOM OBJ
      let indicator =  conversation.DOM.querySelector(".active-dot");
      if (indicator) indicator.remove();
    }

    container.scrollTo = container.querySelector(`#chat-${conversation.state.id}`);

    if (chats.results.length ==0){
      spinner.remove();
      let msg = stringToHtml(`Start A Conversation with ${conversation.member.first_name} ${conversation.member.last_name}`, "div");
      msg.setAttribute("class", "d-flex justify-content-center my-auto p-0");
      container.prepend(msg);
    }

    conversation.PageState.socket.onerror = (event) => {
      console.log(event);
    };

    conversation.PageState.socket.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.chat) {
        const chatData = data.chat;
        let newChat = await createChat(chatData, conversation);
        conversation.PageState.queryset.add(newChat);
        renderToDOM(newChat, container, conversation);
        // container.scrollTop = container.scrollHeight;        
      } else if (data.errors){
        console.log(data.errors);
      }

    });
    
    Cusor.next = chats.next;
    Cusor.previous = chats.previous;

  } catch (error) { throw error; }

  return { queryset, Cusor, conversation, ChatForm };
}

async function main(data) {
  data.queryset.sort("date_created", true);
  let container = getDOMContainer("detail");

  // get old messages by scrolling upwards
  container.addEventListener("scroll", async (event)=> {
    if (container.scrollTop < 50) {
      if (data.Cusor.next){
        if (!window.BackDating) {
          try {
            window.BackDating = true;

            let spinner = getSpinner();
            spinner.setAttribute("class", "d-flex justify-content-center my-3 p-0");
            container.prepend(spinner);
            
            try {
              let backdates = await getBackDates(data.Cusor.next);

              for (let chatData of backdates.results){
                let chat = data.queryset.get({ "id": chatData.id });  
                
                if (chat) {
                  chat.update(chatData);
                } else {
                  chat =  await createChat(chatData, data.conversation);
                  data.queryset.add(chat);
                }
               
                container.scroll = null;
                renderToDOM(chat, container, data.conversation, "top");
                notifyChatAsRead(chat);
                spinner.remove();
              
              }
              
              data.queryset.sort("date_created", false);
  
              data.Cusor.next = backdates.next;
              data.Cusor.previous = backdates.previous;
            
            } catch(error) {
              throw error ;
            }
              
            window.BackDating = false;
          } catch(error){
            console.log(error);
          }

        }
        
      }
    } 
  });

}

export function load(conversation) {
  init(conversation).then((data => {
    main(data);
  })).catch(console.log);
}
