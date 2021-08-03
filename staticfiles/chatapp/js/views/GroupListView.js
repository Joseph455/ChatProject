import {AjaxGetRequest, AjaxPOSTRequest, promiseEventLoop} from "./requests.js";
import {User, Group, Channel, QuerySet, Chat} from "../models.js";
import * as GroupDetail from "./GroupDetail.js";
import {
  stringToHtml, dateToString, getDOMContainer, getSpinner,
  getLoggedUser,getAPIROOT, setGlobalViewMode 
} from "./view.js";

// get groups all groups sorting by timestamp
    // Create group object ===> 
        // get channels  
        // get latest channel, 
        // create group DOM Object
        // append event listeners
    // push group DOM to document
// check for updates from latest group timestamp to now
// add on scroll event listener to get more groups to DOM container


async function getGroups(queryParam, url) {
  queryParam = queryParam || {"ordering": "timestamp"};
  url = url || window.APIROOT.groups;
  
  try {
    let data = await AjaxGetRequest(url, queryParam);
    return data;
  } catch (error) {
    if (error.status == 400) {
      return await setTimeout(()=> {
        return getGroups(queryParam, url);
      }, 500);
    } else {
      throw JSON.parse(error.responseText);
    }
  }

}


async function getChannel(queryParam, url) {
  queryParam = queryParam || {"ordering": "-timestamp"};
  url = url || window.APIROOT.groups;
  
  try {
    let data = await AjaxGetRequest(url, queryParam);
    return data;
  } catch (error) {
    if (error.status == 400) {
      return await setTimeout(()=> {
        return getChannel(queryParam, url);
      }, 500);
    } else {
      throw JSON.parse(error.responseText);
    }
  }

}


export function groupToHtmlString(group) {
  
  function renderGroupState (state) {
    let str ;
    if (state){
      if (state.unread_chats > 0){
        str = `
          <span class="badge badge-success rounded-circle text-light align-self-end text-center" style="width:1rem;height:1rem">
          </span>
        `;
      }
    }
    return str;
  }

  function renderNotifiyer(chat){
    if (chat.notifiyer) {
        let N = chat.notifiyer;
        
        let actionMsgs = {
          "Delete:Chat": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> : deleted a message`,
          "Create:Group": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> created this Group`,
          "Create:Channel": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> created this channel`,
          "Join:Group": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> joined the group`,
          "Leave:Group": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> left the group`,
          "Join:Channel": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> joined the channel`,
          "Leave:Channel": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> left the channel`,
          "Add:Member": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> added ${N.recipient.getUsername()}`,
          "Remove:Member": `<span class="font-weight-bolder">${N.carrier.getUsername()}</span> removed ${N.recipient.getUsername()}`
        };
    
      return actionMsgs[N.action];
    }
  }

  function renderGroupChat (chat) {
    let str = ``;
    if (chat) {
      
      if (chat.message && chat.creator){
        if (chat.message.text_content !== "") {
          str = `<b>${chat.creator.getUsername()}:</b> ${chat.message.text_content.slice(0, 35)}`;
        } else if (chat.message.code) {
          str = `
              <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-code-slash" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0zm-.999-3.124a.5.5 0 0 1 .33.625l-4 13a.5.5 0 0 1-.955-.294l4-13a.5.5 0 0 1 .625-.33z"/>
              </svg>
              ${chat.message.code.content.slice(0, 30)}
            `;
        } else if (chat.message.file) {
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
        str = renderNotifiyer(chat) || "";
      }
    
    }

    return str;
  }

  let str = `
    <img src="${group.icon}" class="mr-3 rounded-circle" alt="..." style="width:2rem;heigth:2rem;">
    <div class="media-body row">
      <div class="col-8">
        <h5 class="mt-0 text-capitalize">${group.getTitle()}</h5>
        <small class="w-100 text-muted d-inline-block text-truncate">${renderGroupChat(group.latestChannel.latestChat)}</small><br>
        <h6 class="w-100 mb-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-rss" viewBox="0 0 16 16" style="heigth:1.5rem;width:1.5rem;">
            <path fill-rule="evenodd" d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M5.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            <path fill-rule="evenodd" d="M2.5 3.5a1 1 0 0 1 1-1c5.523 0 10 4.477 10 10a1 1 0 1 1-2 0 8 8 0 0 0-8-8 1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1 6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1-1-1z"/>
          </svg>
          ${group.latestChannel.title.toLowerCase()}
        </h6>
      </div>
      <div class="col-3 d-flex flex-column">
        <!--${renderGroupState(group.userState) || ""} -->
        <small class="align-self-end mt-auto">${dateToString(group.timestamp)}</small>
      </div>
    </div>
  `;

  return str;
}


export function appendEventListners(group){
  group.DOM.addEventListener("click", (event) => {
    event.cancelBubble = true;
    
    if (window.activeGroup){  
      if (window.activeGroup.id != group.id){
        if (window.activeGroup.socket) {
          window.activeGroup.socket.close();
          console.log(window.activeGroup.socket);
        }
      } else {
        return;
      }
    }

    GroupDetail.init(group);
  });
}

async function createChat(chatDetail) {
  let chat = new Chat(chatDetail);

  if (chat.notifiyer) {
    let singleEffectActions = [
      'Delete:Chat', "Create:Group", "Create:Channel",
      'Join:Group', 'Leave:Group', 'Join:Channel', 'Leave:Channel'
    ];
    
    if (singleEffectActions.includes(chat.notifiyer.action)) {
      // The user that carried out the action
        let userDetail = await AjaxGetRequest(`${chat.notifiyer.carrier}`);
        let profileDetail = await AjaxGetRequest(`${chat.notifiyer.carrier.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.carrier = new User(userDetail, profileDetail);
        chat.notifiyer.recipient = chat.notifiyer.carrier; 
    } else {        
        let userDetail = await AjaxGetRequest(`${chat.notifiyer.carrier}`);
        let profileDetail = await AjaxGetRequest(`${chat.notifiyer.carrier.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.carrier = new User(userDetail, profileDetail);
  
        userDetail = await AjaxGetRequest(`${chat.notifiyer.recipient}`);
        profileDetail = await AjaxGetRequest(`${chat.notifiyer.recipient.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.recipient = new User(userDetail, profileDetail);
    }
  } else {
    if (chat.creator == LoggedUser.url) {
      chat.creator = LoggedUser;
    } else { 
        let userDetail = await AjaxGetRequest(`${chat.creator}`);
        let profileDetail = await AjaxGetRequest(`${chat.creator.replace("?format=json", "profile/?format=json")}`);
        chat.creator = new User(userDetail, profileDetail);    
    }
  }

  return chat;

}

export async function createGroup(groupDetail) {
  let group = new Group(groupDetail);
  group.channels = new QuerySet(Channel); 
  
  try {
    // get group channels
    let channels = await AjaxGetRequest(`${group.url.replace("?format=json", 'channels/?format=json')}`, {"ordering": "-timestamp", "timestamp__gte": group.timestamp.toJSON()});
    
    if (channels.results.length > 0) {  
      channels.results.forEach(channelDetail => {
        group.channels.add(new Channel(channelDetail));
      });
      
      // get latest channel from channels
      let latestChannel = group.channels.queries[0];
      
      if (latestChannel) {
        latestChannel.update(await AjaxGetRequest(latestChannel.url));
        group.latestChannel = latestChannel;

        let userState = await AjaxGetRequest(`${group.url.replace("?format=json", 'state/?format=json')}`);
        group.userState = userState;
        let chatDetail = await AjaxGetRequest(`${latestChannel.url.replace("?format=json", "chats/?format=json")}`, {"date_created__gte": latestChannel.timestamp.toJSON()});
        
        if (chatDetail.results.length > 0) {
          group.latestChannel.latestChat = await createChat(chatDetail.results[0]);
        }

      }
    }
    
  } catch (error) {
    console.log(error);
  }
  
  group.DOM = stringToHtml(groupToHtmlString(group), "div");
  group.DOM.setAttribute("id", `group-${group.id}`);
  group.DOM.setAttribute("class", "media my-3 w-100");
  appendEventListners(group);
  return group;
}


export async function init() {
  const queryset = new QuerySet(Group);
  const Cusor = {"next": null, "previous": null};

  // const socketProtocol = (window.location.protocol == "http:")? "ws:" : "wss:"; 
  // const socketUrl = `${socketProtocol}//${window.location.host}/ws/groups/`;    
  // const Socket = new WebSocket(socketUrl);

  try {
    let container = getDOMContainer("list");
    container.innerHTML = "";
    let spinner = getSpinner();
    spinner.setAttribute("class", "my-auto align-self-center justify-self-center");

    container.appendChild(spinner);

    let groups = await getGroups();
    Cusor.next = groups.next;
    Cusor.previous = groups.previous;
    
    if (groups.results.length == 0) {
      spinner.remove();

      container.innerHTML = `
        <div class="my-auto align-self-center justify-self-center">
          Your not in any groups. Click to create a group
        </div>
      `;
    }

    groups.results.forEach(async (groupDetail) => {
      let group = await createGroup(groupDetail);
      queryset.add(group);
      spinner.remove();
      container.prepend(group.DOM);
    });

  } catch(error) {
    console.log(error);
  }
  
  return {queryset, Cusor};
}


function main (data) {
  // add event listners to container 
    // scroll search and create 
  // check for new chats using ajax
    // if new add or update the

}


function load () {
  window.onload = async () => {
    try {
      window.StopChatDetail = false;
      window.ActiveEventLoops = {};
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
  
      let user = await getLoggedUser(root.users, {"id": tempUserId});
      window.LoggedUser = user;
      
      let data = await init();
      main(data);
    } catch (error) {
      console.log(error);  
    }
  
  };
}

load();