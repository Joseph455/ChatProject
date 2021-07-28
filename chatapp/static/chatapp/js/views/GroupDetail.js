import {AjaxGetRequest, AjaxPOSTRequest, promiseEventLoop} from "./requests.js";
import {User, Channel, QuerySet, Chat} from "../models.js";
import {stringToHtml, objectToFormData, dateToString, getDOMContainer, getLoggedUser} from "./view.js";
import * as GroupChatRender from "./GroupChatRender.js";
import {prepareContainerTop} from "./group_details/container_top.js";
import {prepareContainerInput} from "./group_details/container_input.js";

async function getChannels(group, url){
  try {
    let queryParam = {"ordering": "-timestamp"};
    url = url || `${group.url.replace("?format=json", "channels/?format=json")}`;
    let channels = await AjaxGetRequest(url, queryParam);
    return channels;
  } catch(error) {throw error;}
}


async function getChats(channel, url, queryParam){
  try {
    url = url || `${channel.url.replace("?format=json", "chats/?format=json")}`;
    queryParam = queryParam || {"ordering":"-date_created"};
    let chats = await AjaxGetRequest(url, queryParam);    
    return chats;
  } catch(error){throw error;} 
}


async function getUpdates(queryset, channel){ 
  try {
    let dateTo = new Date();
    let dateFrom = new Date(queryset.sort("date_created", false)[0].date_created);
    dateFrom.setMilliseconds(dateFrom.getMilliseconds()+1);
    let url = `${channel.url.replace("?format=json", "chats/?format=json")}`;
    let queryParam = {"date_created__gt": dateFrom.toJSON(), "date_created__lte": dateTo.toJSON()};
    return await getChats(url, queryParam);
  } catch (error){throw error;}
}


async function loadGroupDetail(group) {
  let channelDetails = await getChannels(group);

  await channelDetails.results.forEach(async (channelDetail) => {
    let channel = group.channels.get({"id": channelDetail.id});
    
    if (!channel) {
      channel = new Channel(channelDetail);
      group.channels.add(channel);
    }

    // channel.userState = await AjaxGetRequest(`${channel.url.replace("?format=json", "state/?format=json")}`, {});
    
  });

}

async function getMembership(container) {
  // container is either group or channel
  let url = container.url.replace("?format=json", "members/?format=json");
  let queryParam = {"user_id": LoggedUser.id};
  let data = await AjaxGetRequest(url, queryParam);
  return data.results[0];
}


export async function createChat(chatDetail, channel) {

  let chat = new Chat(chatDetail);
  chat.channel = channel;

  if (chat.creator && (typeof chat.creator == Object)) {
    if (chat.creator.url) {
      chat.creator.url = channel.url.replace("?format=json", `/chats/${chat.id}/?format=json`);
    }
  }
  
  if (chat.notifiyer) {
    let singleEffectActions = [
      'Delete:Chat', "Create:Group", "Create:Channel",
      'Join:Group', 'Leave:Group', 'Join:Channel', 'Leave:Channel'
    ];
    
    if (singleEffectActions.includes(chat.notifiyer.action)){
      // The user that carried out the action
      let carrier =(
          channel.PageState.group.members.get({"url": chat.notifiyer.carrier}) ||
          channel.members.get({"url": chat.notifiyer.carrier}));
      
      if (carrier) {
        chat.notifiyer.carrier = carrier; 
      } else {
        let userDetail = await AjaxGetRequest(`${chat.notifiyer.carrier}`);
        let profileDetail = await AjaxGetRequest(`${chat.notifiyer.carrier.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.carrier = new User(userDetail, profileDetail);
        channel.PageState.group.members.add(chat.notifiyer.carrier);
        console.log(chat.notifiyer.carrier);
        channel.members.add(chat.notifiyer.carrier);
      }
  
      chat.notifiyer.recipient = chat.notifiyer.carrier; 
      
    } else {
      let carrier =(
        channel.PageState.group.members.get({"url": chat.notifiyer.carrier}) ||
        channel.members.get({"url": chat.notifiyer.carrier}));
  
      // the user that is at the receiving end of the action
      let recipient =(
        channel.PageState.group.members.get({"url": chat.notifiyer.recipient}) ||
        channel.members.get({"url": chat.notifiyer.recipient}));
  
      
      if (carrier) {
        chat.notifiyer.carrier = carrier; 
      } else {
        let userDetail = await AjaxGetRequest(`${chat.notifiyer.carrier}`);
        let profileDetail = await AjaxGetRequest(`${chat.notifiyer.carrier.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.carrier = new User(userDetail, profileDetail);
        channel.PageState.group.members.add(chat.notifiyer.carrier);
        channel.members.add(chat.notifiyer.carrier);
      }
  
      if (recipient) {
        chat.notifiyer.recipient = recipient; 
      } else {
        let userDetail = await AjaxGetRequest(`${chat.notifiyer.recipient}`);
        let profileDetail = await AjaxGetRequest(`${chat.notifiyer.recipient.replace("?format=json", "profile/?format=json")}`);
        chat.notifiyer.recipient = new User(userDetail, profileDetail);
        channel.PageState.group.members.add(chat.notifiyer.recipient);
        channel.members.add(chat.notifiyer.recipient);
      }
    }
  } else {
    
    // get chat replying detail if chat is replying another
    if (chat.replying) {
      chat.replying = await AjaxGetRequest(chat.replying.url, {});
    }

    // get chat creator details from server
    if (chat.creator == LoggedUser.url) {
      chat.creator = LoggedUser;
    } else { 
      if (chat.creator) {
        let member = (
          channel.PageState.group.members.get({"id": chat.creator.id}) ||
          channel.members.get({"id": chat.creator.id})
        );
    
        if (member) {
          chat.creator = member;
        } else {
          let userDetail = await AjaxGetRequest(`${chat.creator.url}`);
          let profileDetail = await AjaxGetRequest(`${chat.creator.url.replace("?format=json", "profile/?format=json")}`);
          chat.creator = new User(userDetail, profileDetail);
          channel.PageState.group.members.add(chat.creator);
          channel.members.add(chat.creator);
        }
      }
    
    }

    
  }


  chat.DOM = GroupChatRender.createChatDOM(chat);
  return chat;
}

async function loadActiveChannel(channel){
  
  try {
    if (!channel.members) channel.members = new QuerySet(User);
    
    let chatDetails = await getChats(channel, null, null);
    let container = getDOMContainer("detail");
    
    for (let i = chatDetails.results.length-1; i >= 0 ; i--) {
      let chatData = chatDetails.results[i];
      let chat = await createChat(chatData, channel);
      console.log(channel, channel.PageState);
      channel.PageState.queryset.add(chat);
      container.append(chat.DOM);
    }

    // while (chatDetails.next) {
    //   channel.PageState.cusor.next = chatDetails.next;
    //   channel.PageState.cusor.previous = chatDetails.previous; 
    //   loadActiveChannel(channel);
    // }

  } catch (error) {
    throw error;
  }

}


async function prepareContainers(group) {
  const containerDetail = getDOMContainer("detail");
  const containerTop = containerDetail.previousElementSibling;
  const containerInput = containerDetail.nextElementSibling;

  await loadGroupDetail(group);

  prepareContainerTop(containerTop, group);
  
  containerDetail.innerHTML = "";

  prepareContainerInput(containerInput, group);
  
}

export async function init(group){
  const queryset = new QuerySet(Chat);
  const Cusor = {"next": null, "previous": null};
  const ChatForm = {"message": {}, "replying": {}};

  const socketProtocol = (window.location.protocol == "http:")? "ws:" : "wss:"; 
  let socketUrl = `${socketProtocol}//${window.location.host}/ws/groups/${group.id}/`;    
  
  // This socket get chat data for all channels in the group
  if (!group.socket) {
    const GroupSocket = new WebSocket(socketUrl);
    group.socket = GroupSocket;
  }

  // This socket get chat data for the active channel
  socketUrl = `${socketProtocol}//${window.location.host}/ws/groups/${group.id}/channels/${group.latestChannel.id}/`;    
  const ChannelSocket = new WebSocket(socketUrl);

  group.latestChannel.PageState = {};
  group.latestChannel.PageState.queryset = queryset;
  group.latestChannel.PageState.cusor = Cusor;
  group.latestChannel.PageState.chatForm  = ChatForm;
  group.latestChannel.PageState.socket = ChannelSocket;
  group.latestChannel.PageState.group = group;
  group.members = group.members || new QuerySet(User);

  main(group);
}

async function main (group) {
  window.activeGroup = group;  

  // get user membership details
  try {
    LoggedUser.channelMembership = await getMembership(group.latestChannel);
  } catch (error) {
    console.log(error);
  }
  
  // prepare container add all PageStates, components and events
  await prepareContainers(group);
  
  // intialize the topChannel
  loadActiveChannel(group.latestChannel);
}
