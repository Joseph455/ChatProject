import {stringToHtml, dateToString, getDOMContainer, getSpinner, getCookies} from "./view.js";
import * as Render from "./ChatRenders.js";
import {createChat} from "./GroupDetail.js";
import {getConversationMemeber} from "./ChatListView.js";
import {AjaxGetRequest, AjaxPOSTRequest } from "./requests.js";
import { Channel, Conversation } from "../models.js";

// create chathtmlstr
// create chat DOM  from chathtmlstr
// addeventlistner to chat DOM
// return chat DOM

function renderReply(chat){

}

function renderNotifiyer(chat) {
  let str = "";
  
  if (chat.notifiyer) {
    let N = chat.notifiyer;
    
    let actionMsgs = {
      "Delete:Chat": `${N.carrier.getUsername()} deleted this message `,
      "Create:Group": `${N.carrier.getUsername()} created this Group`,
      "Create:Channel": `${N.carrier.getUsername()} created this channel`,
      "Join:Group": `${N.carrier.getUsername()} joined the group`,
      "Leave:Group": `${N.carrier.getUsername()} left the group`,
      "Join:Channel": `${N.carrier.getUsername()} joined the channel`,
      "Leave:Channel": `${N.carrier.getUsername()} left the channel`,
      "Add:Member": `${N.carrier.getUsername()} added ${N.recipient.getUsername()}`,
      "Remove:Member": `${N.carrier.getUsername()} removed ${N.recipient.getUsername()}`
    };

    str = `
      <div class="d-flex w-100 justify-content-center delete">
        <span class="flex-fill text-center">${actionMsgs[N.action] || ""}<span>
        <small>${dateToString(chat.date_created)}</small>
      </div>
    `;
  }

  return str;
}

function renderChatAction(chat){
  let str = `
    <div class="d-flex w-100">
      <span class"text-muted text-light mx-2">${chat.creator.getUsername()}</span>
      <span class="ml-auto">
        <span id="chat-${chat.id}-action" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
          </svg>
        </span>
        <div class="dropdown-menu mh-75 dropdown-menu-right mw-100 bg-light" aria-labelledby="chat-${chat.id}-action">
          {{ actions }}
        </div>
      </span>
    </div>
  `;

  if (chat.message && ((chat.creator.id == LoggedUser.id) || (LoggedUser.channelMembership.is_admin))) {
    // add check to make sure that the logged User membership  to the channel is that of an admin
    str = str.replace("{{ actions }}"  ,`
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
    `);
  } else {
    str = str.replace("{{ actions }}", `
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
    `);
  }

  return str;
}

function renderMessage(chat){
  let str = "";
  
  if (chat.message) {
    str = `
      <div class="flex-fill d-flex flex-column">
        ${Render.renderReply(chat) || ""}
        ${Render.renderImages(chat.message.images) || Render.renderFile(chat.message, chat) || ""}
        ${Render.renderTextContent(chat.message) || ""}
      </div>
    `;
  }

  if (chat.state == "loading"){
    str = str.replace("{{ loading }}", getSpinner().innerHTML);
  } else {
    str = str.replace("{{ loading }}", "");    
  }

  return str;
}

function chatToHtmlString(chat) {
  let str = "";

  if (chat.notifiyer){
    str = renderNotifiyer(chat);
  } else {
    if (chat.creator) {
      if (chat.creator.id == LoggedUser.id) {
        str = `
          <div class="{{ flex-direction }} mw-100 p-0">
            <div class="chat-box-{{ direction }} d-flex flex-column p-2 shadow-lg">
              ${renderChatAction(chat) || ""}
              ${renderMessage(chat) || ""}
              <small class="ml-auto">${dateToString(chat.date_created)}</small>
            </div>
          </div>
        `;
      } else {
        str = `
          <div class="d-flex p-1">
            <img class="mt-auto rounded-circle"  src="${chat.creator.profile_picture}" style="width:2.5rem; height: 2.5rem;"/>
          </div>
          <div class="{{ flex-direction }} mw-100 p-0">
            <div class="chat-box-{{ direction }} d-flex flex-column p-2 shadow-lg">
              ${renderChatAction(chat) || ""}
              ${renderMessage(chat) || ""}
              <small class="ml-auto">${dateToString(chat.date_created)}</small>
            </div>
          </div>
        `;
      }
  
      if (chat.creator.id == LoggedUser.id) {
        str = str.replace("{{ flex-direction }}", "ml-auto").replace("{{ direction }}", "right");
      } else {
        str = str.replace("{{ flex-direction }}", "mr-auto").replace("{{ direction }}", "left");
      }
    }

  }

  return str ;
}

function setDOMSTATE(DOM, chat) {
  DOM.setAttribute("id", `chat-${chat.id}`);
  if (chat.notifiyer) {
    DOM.setAttribute("class", "chat-box-notifiyer my-3 p-2");
  } else {
    DOM.setAttribute("class", "d-flex w-100 bg-transparent my-3 p-0");
  }
}

function showImagesFullView (chat) {
  
  let modal = document.querySelector("#chat-image-modal");
  let carosuelContainer = modal.querySelector(".carousel-inner");
  
  carosuelContainer.innerHTML = "";
  
  for (let img of chat.message.images) {
    if (chat.message.images.indexOf(img) == 0){
      carosuelContainer.innerHTML += `
      <div class="carousel-item active w-100 h-100">
        <img src="${img.image}" class="d-block w-100 h-100" alt="...">
        </div>
    `;
    } else {
      carosuelContainer.innerHTML += `
        <div class="carousel-item w-100 h-100">
          <img src="${img.image}" class="d-block w-100 h-100" alt="...">
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

  $("#chat-image-modal").modal("show");
}

async function deleteChatAjax(chat) {
  let headers = {
    "X-CSRFToken": getCookies().csrftoken,
    "Content-Type": "application/json"
  };

  try {
    let chatData = await AjaxPOSTRequest(chat.url, headers, {}, "DELETE");
    return chatData;
  } catch(error) {
    throw error;
  }

}

async function forwardChatAjax(container, chat) {
  // container is either channel or conversation 
  let url = container.url.replace("?format=json", "chats/?format=json");
  
  let headers = {
    "X-CSRFToken": getCookies().csrftoken,
    "Content-Type":"application/json",
  };

  let body = {
    "message": chat.message,
    "replying": null
  };

  return await AjaxPOSTRequest(url, headers, JSON.stringify(body));
}

async function forwardChatWebSocket(container, chat) {
  const socketProtocol = (window.location.protocol == "http:")? "ws:" : "wss:"; 
  let socketUrl = `${socketProtocol}//${window.location.host}`;    
  
  //  we use html so as to upload media file
  let url = container.url.replace("?format=json", "chats/?format=json");

  console.log(container, Channel, Conversation);

  if  (container.url.includes("channel")) {
    socketUrl += `/ws/groups/${container.group.id}/channels/${container.id}/`;
  } else if (container.url.includes("conversation")) {
    socketUrl += `/ws/conversations/${container.id}/`;
  }

  // const socket =  new WebSocket(socketUrl);
  const socket = new ReconnectingWebSocket(socketUrl);
  socket.debug = true;
  socket.timeOutInterval = 5400;
  socket.automaticOpen = false;

  socket.onopen = async () => {
    
    let body = {
      "message": chat.message,
      "replying": null
    };

    socket.send(JSON.stringify(body));
    socket.close(1000, "message has been forwarded");
  };
  
}


function updateSelectedCounter(selected) {
  let container = document.querySelector("#forward-modal").querySelector("#counter");
  container.innerHTML = Object.keys(selected).length;
}

function createChannelDOM(channel, selected){
  let str = `
    <svg xmlns="http://www.w3.org/2000/svg" style="heigth:1.5rem;width:1.5rem;" fill="currentColor" class="bi bi-rss mx-2" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
      <path d="M5.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
      <path fill-rule="evenodd" d="M2.5 3.5a1 1 0 0 1 1-1c5.523 0 10 4.477 10 10a1 1 0 1 1-2 0 8 8 0 0 0-8-8 1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1 6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1-1-1z"/>
    </svg>
    <div class="flex-fill">
      <h5 class="text-light text-capitalize">${channel.title.toLowerCase()}</h5>
    </div>
  `;

  let html = stringToHtml(str, "div");
  html.setAttribute("id", `channel-${channel.id}--`);
  
  if (Object.keys(selected).includes(channel.url)){
    html.setAttribute("class", "active d-flex w-100 badge-pill modal-channel my-1 p-1");
  } else {
    html.setAttribute("class", "d-flex w-100 badge-pill modal-channel my-1 p-1");
  }

  html.addEventListener("click", event => {
    event.cancelBubble = true;
    
    if (Object.keys(selected).includes(channel.url)){
      delete selected[channel.url];
      html.classList.remove("active");
    } else {
      selected[channel.url] = channel;
      html.classList.add("active");
    }

    updateSelectedCounter(selected);

  });

  return html;
}

function createGroupDOM(group, selected) {
  let str = `
    <img class="mr-auto rounded-circle" src="${group.icon}" style="heigth:3rem;width:3rem;" />
    <div class="mx-2 flex-fill">
      <h5 class="text-light text-capitalize font-weight-bold">${group.title}</h5>
    </div>
    <div class="dropdown-menu-${group.id} dropdown-menu bg-dark w-100" aria-labelledby="group-${group.id}--" >

    </div>
  `;
  let html = stringToHtml(str, "div");
  html.setAttribute("id", `group-${group.id}`);
  html.setAttribute("data-toggle", `group-${group.id}--`);
  html.setAttribute("aria-haspopup", "true");
  html.setAttribute("aria-expanded", "false");
  html.setAttribute("data-reference", "parent");
  html.setAttribute("class", `d-flex mx-3 my-3 dropdown modal-group p-2 badge-pill`);
  
  html.addEventListener("click", async event => {
    event.cancelBubble = true;
    
    let dropdown = html.querySelector(`.dropdown-menu-${group.id}`);
    dropdown.classList.add("bg-transparent");
    dropdown.classList.add("border-0");

    if (dropdown.classList.contains("show")) {
      html.classList.remove("active");
      dropdown.innerHTML = "";
      $(`.dropdown-menu-${group.id}`).dropdown("hide");      
    } else {
      html.classList.add("active");
      dropdown.innerHTML = "";
      let spinner = getSpinner();
  
      dropdown.appendChild(spinner);
      
      let queryParam = {"ordering": "title", "members__id":window.LoggedUser.id};
      let channelDetails = await AjaxGetRequest(`${group.url.replace("?format=json", "channels/?format=json")}`, queryParam);
      const channels = [];
      channels.push(...channelDetails.results);
      
      while (channelDetails.next) {
        channelDetails = await AjaxGetRequest(channelDetails.next, queryParam);
        channels.push(...channelDetails.results);
      }
  
      channels.forEach(channel => {
        channel.group = group;
        let channelHtml = createChannelDOM(channel, selected);
        dropdown.appendChild(channelHtml);
        spinner.remove();
      });
  
      $(`.dropdown-menu-${group.id}`).dropdown("toggle");
    }
    
    updateSelectedCounter(selected);
  
  });
  
  return html;
}

function createConversationDOM(conv, selected) {
  let str = `
    <img class="rounded-circle" src="${conv.member.profile_picture}" style="widtn:3rem;height:3rem;" />
    <div class="flex-fill">
      <h5 class="text-capitalize text-light">${conv.member.first_name} ${conv.member.last_name}</h5>
    </div>
  `;

  let html = stringToHtml(str, "div");
  html.setAttribute("id", `conv-${conv.id}--`);
  
  if (Object.keys(selected).includes(conv.url)){
    html.setAttribute("class", "active d-flex mx-2 w-100 modal-group badge-pill p-2 my-2");
  } else {
    html.setAttribute("class", "d-flex mx-2 w-100 modal-group badge-pill p-2 my-2");
  }

  html.addEventListener("click", event => {
    event.cancelBubble = true;
    
    if (Object.keys(selected).includes(conv.url)){
      delete selected[conv.url];
      html.classList.remove("active");
    } else {
      selected[conv.url] = conv;
      html.classList.add("active");
    }

    updateSelectedCounter(selected);

  });

  return html;
}

async function createConversation(detail, selected){
  let member = await getConversationMemeber(detail);
  let conv = new Conversation(detail);
  conv.member = member;
  conv.DOM = await createConversationDOM(conv, selected);
  return conv;
}

// removes and replaces btn html to avoid event listner overload 
function fixEventListenerOverload(modal){
  /*
    this fuunction replaces objects that have event listiners with a dubplicate
    to avoid pileing event listeners from different chats 
  */ 

  // replace send bth
  let sendBtn = stringToHtml(`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-forward-fill icon" viewBox="0 0 16 16">
      <path d="M9.77 12.11l4.012-2.953a.647.647 0 0 0 0-1.114L9.771 5.09a.644.644 0 0 0-.971.557V6.65H2v3.9h6.8v1.003c0 .505.545.808.97.557z"/>
    </svg>
  `, "span");
  sendBtn.setAttribute("id", "send");
  sendBtn.setAttribute("class", "ml-auto align-self-center text-success bg-transparent");
  modal.querySelector("#send").replaceWith(sendBtn);

  // replace cancle btn
  let cancleBtn = stringToHtml(`
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-x icon nav-text" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
  `, "span");
  cancleBtn.setAttribute("class", "align-self-end cancle");
  modal.querySelector(".cancle").replaceWith(cancleBtn);
  

  // replace group-section nav
  let grp_sec = stringToHtml(`
    Groups
  `, "span");
  
  grp_sec.setAttribute("id", "group-section");
  grp_sec.setAttribute("class", "flex-fill active p-2 text-center nav-text text-lg");
  modal.querySelector("#group-section").replaceWith(grp_sec);

  // replace conv-section nav
  let conv_sec = stringToHtml(`
    Chats
  `, "span");
  
  conv_sec.setAttribute("id", "conv-section");
  conv_sec.setAttribute("class", "flex-fill p-2 text-center nav-text text-lg");
  modal.querySelector("#conv-section").replaceWith(conv_sec);
  
}

async function forwardChat(chat) {
  
  const modal = document.querySelector("#forward-modal");
  let selected = {};
  fixEventListenerOverload(modal);

  // forward messages
  modal.querySelector("#send").addEventListener("click", async event => {

    for (let key in selected){
      if (selected[key]) {
        // switch forwardChatAjax with forwardChatWebSocket
        // await forwardChatAjax(selected[key], chat);
        await forwardChatWebSocket(selected[key], chat);
      }
    }

    $("#forward-modal").modal("hide");
  
  }, {"once": true});

  // cancle modal
  modal.querySelector(".cancle").addEventListener("click", event => {
    event.cancelBubble = true;
    selected = {};

    updateSelectedCounter(selected);
    if (modal.querySelector("#group-section").classList.contains("active")){
      modal.querySelector("#group-section").click();
    } else {
      modal.querySelector("#conv-section").click();
    }
  });

  // click event for group tab
  modal.querySelector("#group-section").addEventListener("click", async event => {
    modal.querySelector("#group-section").classList.add("active");
    modal.querySelector("#conv-section").classList.remove("active");
    modal.querySelector("#modal-body-container").innerHTML = "";

    let spinner = getSpinner();
    spinner.classList.add("mx-auto");
    spinner.classList.add("my-auto");

    modal.querySelector("#modal-body-container").appendChild(spinner);


    let queryParam = {"ordering": "title"};
    let groupDetail = await AjaxGetRequest(`${window.APIROOT.groups}`, queryParam);
    let groups = [];

    do {
      groups = groups.concat(groupDetail.results);
      if (groupDetail.next) {
        groupDetail = await AjaxGetRequest(groupDetail.next, queryParam);
      }
    } while (groupDetail.next);

    groups.forEach(group => {
      group.DOM = createGroupDOM(group, selected);
      spinner.remove();
      modal.querySelector("#modal-body-container").appendChild(group.DOM);
    });

  });

  // click event for chat tab
  modal.querySelector("#conv-section").addEventListener("click", async event => {
    modal.querySelector("#modal-body-container").innerHTML = "";
    modal.querySelector("#group-section").classList.remove("active");
    modal.querySelector("#conv-section").classList.add("active");

    let spinner = getSpinner();
    spinner.classList.add("mx-auto");
    spinner.classList.add("my-auto");

    modal.querySelector("#modal-body-container").appendChild(spinner);

    let queryParam = {"ordering": "-timestamp"};
    let conversationRaw = await AjaxGetRequest(window.APIROOT.conversations, queryParam);
    let conversations = [];

    do {
      conversations = conversations.concat(conversationRaw.results);
      if (conversationRaw.next) {
        conversationRaw = await AjaxGetRequest(conversationRaw.next, queryParam);
      }
    } while (conversationRaw.next);

    conversations.forEach(async convRaw => {
      let conv = await createConversation(convRaw, selected);
      spinner.remove();
      modal.querySelector("#modal-body-container").appendChild(conv.DOM);
    });

  });

  modal.querySelector("#modal-body-container").innerHTML = "";

  $("#forward-modal").modal("show");

  modal.querySelector("#group-section").click();

}


function appendEventListeners(DOM, chat){
  // add eventlistener for image full view
  // add event listner to download document
  // reply event listener 
  // forward event listener
  // delete event listener

  let imageContaiiner = DOM.querySelector(".chat-image-container");
  let replyActn = DOM.querySelector("#reply-action");
  let forwardActn = DOM.querySelector("#forward-action");
  let deleteActn = DOM.querySelector("#delete-action");

  if (imageContaiiner) {
    imageContaiiner.addEventListener("click", event => {
      event.cancelBubble = true;
      showImagesFullView(chat);
    });
  }

  if (forwardActn) {
    forwardActn.addEventListener("click", async event => {
      // allow fowarding between group channles, and conversation
      // fowarding will also be over websockets
      await forwardChat(chat);
    });
  }

  if (replyActn) {
    replyActn.addEventListener("click", event => {
      event.cancelBubble = true;
      let chatForm = chat.channel.PageState.chatForm;

      // Visual effects of clicking the button
      let inputContainer;

      if (GlobalViewMode == "mobile")
      {
        inputContainer = document.querySelector("#list-input");
      } else {
        inputContainer = document.querySelector("#detail-input-container");
      }

      if (inputContainer) {

        let closeBtn = inputContainer.querySelector("#close-btn");
        let submitBtn = inputContainer.querySelector("#input-submit");
        
        if (closeBtn) {
          closeBtn.remove();
        }

        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply-fill icon" viewBox="0 0 16 16">
            <path d="M9.079 11.9l4.568-3.281a.719.719 0 0 0 0-1.238L9.079 4.1A.716.716 0 0 0 8 4.719V6c-1.5 0-6 0-7 8 2.5-4.5 7-4 7-4v1.281c0 .56.606.898 1.079.62z"/>
          </svg>
        `;

        closeBtn = stringToHtml (
          `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x bi-x-fill icon" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          `, "span");
        
        closeBtn.setAttribute("class", "nav-text");
        closeBtn.setAttribute("id", "close-btn");
  
        
        closeBtn.addEventListener("click", () => {
          submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
            <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
            </svg>`;
          closeBtn.remove();
          
          // clear chat form
          for (let key in chatForm){
            chatForm[key] = null;
          }
  
        });

        submitBtn.insertAdjacentElement("beforebegin", closeBtn);
      }

      chatForm.replying = {"id": chat.id, "url": chat.url};
    });
  }

  if (deleteActn) {
    deleteActn.addEventListener("click", async event => {
      // delete action will have to be over websocket
      // but for now let's use http ajax
      
      event.cancelBubble = true;
      
      // replace deleteChatAjax with deleteChatWebSoket
        createChat(await deleteChatAjax(chat), chat.channel).then(deletedChat => {
          chat.DOM.replaceWith(deletedChat.DOM);
          chat.channel.PageState.queryset.add(deletedChat);
          chat.channel.PageState.queryset.remove({"id": chat.id});
        }).catch(console.log);

    });
  }

}


export function createChatDOM(chat){
  // set DOM state
  let DOM = stringToHtml(chatToHtmlString(chat), "div");
  setDOMSTATE(DOM, chat);
  appendEventListeners(DOM, chat);
  return DOM;
}