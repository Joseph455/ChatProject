import {AjaxGetRequest, AjaxPOSTRequest, promiseEventLoop} from "./requests.js";
import {User, Conversation, QuerySet, Chat} from "../models.js";
import {stringToHtml, objectToFormData, dateToString, getDOMContainer, getSpinner, getLoggedUser, getAPIROOT, setGlobalViewMode} from "./view.js";
import * as ChatDetail from "./ChatDetail.js";

async function getConversations(queryParam, url) {
  // list view
  try {
    url = url || `${APIROOT.conversations}`;
    let data = await AjaxGetRequest(url, queryParam);
    return data;
  } catch (error) {
    throw error;  
  }

}

async function getData (url, queryParam) {
  // detail view 
  try {
    let data = await AjaxGetRequest(url, queryParam);
    return data;
  } catch (error) {
    throw error;  
  }
}

export async function getConversationMemeber (convData){
  let url;
  
  convData.members.forEach(member => {
    if (member != window.LoggedUser.url) {
      url = member;
    }
  });

  try {
    let userData = await AjaxGetRequest(url);
    let profileData = await AjaxGetRequest(userData.profile);
    return new User(userData, profileData);
  } catch (error) {
    throw error;  
  }

}

async function getLatestChat(convData){
  let url = convData.url.replace("?format=json", "chats/?format=json");
  let queryParam = {"date_created__gte": convData.timestamp};
  let data = await getData(url, queryParam);
  
  if (data.results.length > 0){
    return new Chat(data.results[0]);
  }
}

// check for updates 
async function getUpdates(queryset, url) {
  let dateTo = new Date();
  let dateFrom = new Date(queryset.sort("timestamp", false)[0].timestamp);
  dateFrom.setMilliseconds(dateFrom.getMilliseconds()+1); 
  let data = await getConversations({"timestamp__gt": dateFrom.toJSON(), "timestamp__lte": dateTo.toJSON()}, url);
  
  if (data.results.length > 0){
    return data;
  }

}

async function pushUpdate(convData, queryset) {
  let conversation = queryset.get({"id": convData.id});
  
  if (conversation) {
    conversation.update(await createConversation(convData));
    conversation.DOM.innerHTML = createDOM(conversation).innerHTML;
  } else {
    createConversation(convData).then(conversation => {
      queryset.add(conversation);
      conversation.DOM = createDOM(conversation);
    });
  }
}

function pushUpdateToQuerySet(update, queryset) {
  update.results.forEach(async convData => {
    let conversation = queryset.get({"id": convData.id});
    
    if (conversation) {
      conversation.update(await createConversation(convData));
      conversation.DOM.innerHTML = createDOM(conversation).innerHTML;
    } else {
      createConversation(convData).then(conversation => {
        queryset.add(conversation);
        conversation.DOM = createDOM(conversation);
      });
    }

  });
}

function convToHtmlString(query) {
    
  function renderState(state){
    if (state) {
      if (state.unread_chats > 0){
        let str = `<span class="align-self-end p-1 active-dot"></span>`;
        return str;
      }
    }
  }

  function renderChat(chat) {
    if (chat) {
      let str;
      if (chat.message && chat.creator){
        if (chat.message.text_content !== "") {
          str = `<b>${chat.creator.getUsername()}:</b> ${chat.message.text_content.slice(0, 30)}`;
        } else if (chat.message.code) {
          str = `
              <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-code-slash" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0zm-.999-3.124a.5.5 0 0 1 .33.625l-4 13a.5.5 0 0 1-.955-.294l4-13a.5.5 0 0 1 .625-.33z"/>
              </svg>
              ${chat.message.code.content.slice(0, 30)}
            `;
        } else if (chat.message.file){
          str = `
            <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-files" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M4 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
              <path d="M6 0h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1H4a2 2 0 0 1 2-2z"/>
            </svg>
            <b>${chat.creator.getUsername()}:</b> sent a file.
          `;
        } else if (chat.message.images.length > 0){
          str = `<b>${chat.creator.getUsername()}:</b> sent an image.`;
        }
      } else if (chat.notifiyer) {
        str = `This message has been deleted;`;
      }
      return str;
    }
  }
  
  let str = `
    <img src="${query.member.profile_picture}" class="mr-3 rounded-circle" alt="..." style="width:2rem;heigth:2rem;">
    <div class="media-body row">
      <div class="col-8">
        <h5 class="mt-0 text-capitalize ">${query.member.first_name} ${query.member.last_name}</h5>
        <small class="text-muted d-inline-block w-100 text-truncate">${renderChat(query.latestChat)||`Say Hi to <b>${query.member.getUsername()}</b>`}</small>
      </div>
      <div class="col-4 d-flex flex-column">
      <small class="align-self-end mb-auto">${dateToString(query.timestamp)}</small>
        ${renderState(query.state)||""}
      </div>
    </div>
  `;
  return str;
}

function createDOM(conversation) {
  let str = convToHtmlString(conversation);
  let DOM = stringToHtml(str);
  setDOMSTATE(DOM, conversation);
  return DOM;
}

function setDOMSTATE(DOM, conversation) {
  DOM.setAttribute("id", `conv-${conversation.id}`);
  DOM.setAttribute("class", "media my-3");
  
  DOM.addEventListener("click", (event)=> {
      event.cancelBubble = true;
      // event.preventDefualt();

      if (GlobalViewMode == "mobile") {
        StopEventLoop = true;
      }

      if (activeConversation == conversation){
        eval(`window.StopConversation${conversation.id} = true;`);
      } else {
        if (activeConversation){
          eval(`window.StopConversation${activeConversation.id} = true;`);
          eval(`window.StopConversation${conversation.id} = false;`);
        }
      }

      ChatDetail.load(conversation);
  });
}

function renderToDOM (conversation, container) {
  conversation.DOM = createDOM(conversation);
  container.appendChild(conversation.DOM);
}

async function createConversation(convData){    
  // get  conversation detail
  try {
    
    let conversation;

    if (convData.url) {
      let data =  await getData(convData.url);
      conversation = new Conversation(data);
      convData.state = data.state;
      convData.members = data.members;
    } else {
      let url = `${window.APIROOT.conversations.replace("?format=json", `${convData.id}/?format=json`)}`;
      let data =  await getData(url);
      convData.state = data.state;
      convData.members = data.members;
      conversation = new Conversation(convData);
    }
    
    // get conversation member
    conversation.member = await getConversationMemeber(convData);
    
    // get conversation lastest chat
    let chat;
    console.log(conversation);
    if (!conversation.latestChat) {
      chat = await getLatestChat(convData);
      conversation.latestChat = chat;
    } else {
      chat = conversation.latestChat;
    }
    
    if (chat) {
      
      chat.conversation = conversation;
      if (chat.creator) {
        
        if (typeof chat.creator == "string"){
          if (chat.creator == LoggedUser.url){
            chat.creator = LoggedUser;
          } else {
            chat.creator = conversation.member;
          }
        } else {
          if (chat.creator.id == LoggedUser.id) {
            chat.creator = LoggedUser;
          } else {
            chat.creator = conversation.member;
          }
        }

      } else if (chat.notifiyer) {
        
        if (chat.notifiyer.carrier == LoggedUser.url){
          chat.notifiyer.carrier = LoggedUser;
        } else {
          chat.notifiyer.carrier = conversation.member;
        }

        if (chat.notifiyer.recipient == LoggedUser.url){
          chat.notifiyer.recipient = LoggedUser;
        } else {
          chat.notifiyer.recipient = conversation.member;
        }

      }

    }
    return conversation;
  } catch (error){
    throw error;  
  }
}

async function init () {
  const queryset = new QuerySet(Conversation);
  const Cusor = {"next": null, "previous": null};

  const socketProtocol = (window.location.protocol == "http:")? "ws:" : "wss:"; 
  const socketUrl = `${socketProtocol}//${window.location.host}/ws/conversations/`;    
  const Socket = new WebSocket(socketUrl);


  try {
    let convsResult = await getConversations({"ordering": "-timestamp"});
    Cusor.next = convsResult.next;
    Cusor.previous = convsResult.previous;

    let container = getDOMContainer("list");
    container.innerHTML = "";
    
    for (let i =0; i<convsResult.results.length; i++){
      let convData = convsResult.results[i];
      
      try {
        let conversation = await createConversation(convData);
        queryset.add(conversation);
        renderToDOM(conversation, container);
      } catch(error){
        throw error;  
      }
    }
  } catch(error){
    throw error;
  }

  return {queryset, Cusor, Socket};
}

function main (PageState) {

  PageState.Socket.addEventListener("message", async event => {
    const data = JSON.parse(event.data);
    let convData = data.chat.conversation;
    convData.latestChat = data.chat;
    pushUpdate(convData, PageState.queryset);
    PageState.queryset.sort("timestamp", false);
  });

}

function load (){
  window.onload = async () => {
    try {
      setGlobalViewMode();
  
      window.addEventListener("resize", (event)=>{
        let prev = String(window.GlobalViewMode);
        setGlobalViewMode();
        if (((prev == "mobile") && (window.GlobalViewMode == "desktop")) || ((prev == "desktop") && (window.GlobalViewMode == "mobile"))){
          window.location.reload();
        }
      }, false);
    
      let root = await getAPIROOT();
      window.APIROOT = root;
      // check if user is online
  
      let user = await getLoggedUser(root.users, {"id": tempUserId});
      window.LoggedUser=user;
      
      let data = await init();
      main(data);
    
    } catch (error) {
      console.log(error);  
    }
  
  };
}

load ();