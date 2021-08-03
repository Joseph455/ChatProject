import {stringToHtml} from "../view.js";
import {init} from "../GroupDetail.js";
import * as GroupListView from "../GroupListView.js";

async function initalizeChannel(group, channel) {
  if (channel.id != group.latestChannel.id){
    // close all channel sockets
    await group.latestChannel.PageState.socket.close();

    group.latestChannel.PageState = null;
    
    group.latestChannel = channel;
    
    // update the group.DOM in list section on page if your in desktop view
    if (window.GlobalViewMode == "desktop") {
      let updated = GroupListView.groupToHtmlString(group);
      updated = stringToHtml(GroupListView.groupToHtmlString(group), "div");
      updated.setAttribute("id", `group-${group.id}`);
      updated.setAttribute("class", "media my-3 w-100");
      group.DOM.replaceWith(updated);
      group.DOM = updated;
      GroupListView.appendEventListners(group);
    } 

    // init group details with selected group as latestChannel
    await init(group);
  }
}

function getContainerHtml(group) {

  let containerHtmlAsStr = `
    <div class="d-flex justify-content-between align-items-center w-100 h-100 py-2">
      <img src="${group.icon}" class="rounded-circle" style="width=2.5rem;height:2.5rem;" />
      <div class="flex-fill align-self-center d-flex flex-column px-2">
        <h5 class="text-capitalize text-lg w-100 mr-2 w-100 text-center">${group.title}</h5>
        <div class="flex-fill mr-2 w-100">
          <span class="d-flex w-100 align-items-center justify-content-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-rss text-light" viewBox="0 0 16 16"
             style="heigth:1.5rem;width:1.5rem;">
              <path fill-rule="evenodd" d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              <path d="M5.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              <path fill-rule="evenodd" d="M2.5 3.5a1 1 0 0 1 1-1c5.523 0 10 4.477 10 10a1 1 0 1 1-2 0 8 8 0 0 0-8-8 1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1 6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1-1-1z"/>
            </svg>
            <span class="d-flex border rounded-pill p-1 mx-2">
              <h6 class="text-light text-center mx-2 text-bolder font-weight-bolder">${group.latestChannel.title}</h6>
              <span id="channel-selector" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-chevron-expand text-light"
                  viewBox="0 0 16 16" style="heigth:1.5rem;width:1.5rem;">
                  <path fill-rule="evenodd" d="M3.646 9.146a.5.5 0 0 1 .708 0L8 12.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-2.292a.5.5 0 0 0
                  .708 0L8 3.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708z"/>
                </svg>
              </span>
              <div id="channel-selector-container" class="dropdown-menu mh-75 dropdown-menu-right" aria-labelledby="channel-selector">
                <!-- select a channel that user is a member within group -->
                <a id="${group.latestChannel.id}" class="dropdown-item active font-weight-bolder channels" href="#">${group.latestChannel.title}</a>
                {{ channels }}
              </div>
            </span>
          </span>
        </div>
      </div>
      <div class="p-0 ml-auto">
        <span class="nav-text" id="dropdown-group-detail-top" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-reference="parent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots-vertical icon" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
          </svg>
        </span>
        <div id="group-detail-more" class="dropdown-menu mh-75 dropdown-menu-right" aria-labelledby="dropdown-group-detail-top">
          <a class="dropdown-item" href="#">Group Details</a>
          <a class="dropdown-item" href="#">Group Settings</a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="#">Search Channel</a>
          <a class="dropdown-item" href="#">Channel Details</a>
          <a class="dropdown-item" href="#">Channel Settings</a>
        </div>
      <div>
    </div>
  `;
  
  let channels = "";

  group.channels.queries.forEach(channel => {
    if (channel.id  != group.latestChannel.id){
      channels += `<a id="${channel.id}" class="dropdown-item font-weight-bolder channels" href="#">${channel.title}</a>` + "\n";
    }
  });

  containerHtmlAsStr = containerHtmlAsStr.replace("{{ channels }}", channels);
  let html = stringToHtml(containerHtmlAsStr);
  html.setAttribute("class", "p-1 mx-2 w-100");
  
  // append event listners for when a channel is selected
  html.querySelectorAll(".channels").forEach(element => {
    element.addEventListener("click", async event => {
      let selectedChannel = group.channels.get({"id": Number(event.target.id)});
      await initalizeChannel(group, selectedChannel);
    });

  });

  // append event listners for each link in group-detail-more dropdown

  return html ;
}

export function prepareContainerTop(container, group) {
  // top section of detail page
  // you can eventlisners for the clicks of the links in the more button
  container.innerHTML = "";
  container.appendChild(getContainerHtml(group));
}
  