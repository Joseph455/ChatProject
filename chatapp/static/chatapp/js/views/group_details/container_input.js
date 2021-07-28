import {stringToHtml, getDOMContainer} from "../view.js";
import {submitChatEvent} from "./submit_chat.js";
import {createChat} from "../GroupDetail.js";
import * as GroupChatRender from "../GroupChatRender.js";


function changeInputState(element) {
  if ( element.files.length > 0 ){
    Array.from( element.labels ).forEach( label=> {
      let activeDot = label.querySelector(".d-none");

      if (activeDot) {
        if ( activeDot.classList.contains("d-none") ){
          activeDot.classList.remove("d-none");
        } else {
          activeDot.classList.add("d-none");
        }
      }
    });
  }
}

function prepareSubmitBtn(container) {
  // Replace prev submitBtn with an identical one to remove any underlying event listners 
  
  let submitBtn = stringToHtml(`
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
    <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
  </svg>
  `, "span");

  submitBtn.id = "input-submit";
  submitBtn.setAttribute("class", "ml-2 nav-text active");

  container.querySelector("#input-submit").replaceWith(submitBtn);

  return submitBtn;
}

export function prepareContainerInput(container, group) {  
  // make input container visible 
  container.classList.remove("d-none");
  container.classList.add("w-100");

  const imageInput = container.querySelector("#image-input");
  const fileInput = container.querySelector("#file-input");
  const submitBtn = prepareSubmitBtn(container);
  
  if (imageInput){
    imageInput.addEventListener("change", event => {
      changeInputState(event.target);
    });
  }
  
  if (fileInput){
    fileInput.addEventListener("change", event => {
      changeInputState(event.target);
    });
  }


  submitBtn.addEventListener("click", async event => {
    if (submitBtn.classList.contains("active")) {
      /* 
        submit details of group.latestChannel.PageState.chatForm
        as chat if submitBtn is active
      */ 
      event.target.classList.remove("active");
      await submitChatEvent(container,group);
      event.target.classList.add("active");
    }
  });

  // receive chats from websocket
  group.latestChannel.PageState.socket.addEventListener("message", async (event) => {      
    const data = JSON.parse(event.data);
    const container = getDOMContainer("detail");
    const PageState = group.latestChannel.PageState;
    
    if (data.chat) {
      const chatData = data.chat;
  
      let newChat = await createChat(chatData, group.latestChannel);
      PageState.queryset.add(newChat);
      newChat.DOM = GroupChatRender.createChatDOM(newChat);

      let peekDOM = container.querySelector(`#chat-${newChat.id}`);

      if (peekDOM) {
        container.replaceChild(newChat.DOM, peekDOM);
      } else {
          container.appendChild(newChat.DOM);
      }

      container.scrollTop = container.scrollHeight;
      
    } else if (data.errors){
      console.log(data.errors);
    }

  });

}
