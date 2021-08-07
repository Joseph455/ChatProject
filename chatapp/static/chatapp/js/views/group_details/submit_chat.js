import {getDOMContainer, getCookies, getSpinner} from "../view.js";
import {createChat} from "../GroupDetail.js";
import * as GroupChatRender from "../GroupChatRender.js";
import { AjaxPOSTRequest, AjaxGetRequest } from "../requests.js";

function getMediaFiles(container) { 
  const imageInput  = container.parentElement.querySelector("#image-input");
  const fileInput = container.parentElement.querySelector("#file-input");

  const file = fileInput.files[0];
  const images = [...Array.from(imageInput.files)];

  if (file) {
    file.file = URL.createObjectURL(file);
  }

  images.map((image) => {
    image.image = URL.createObjectURL(image);
  });

  return {file, images};
}

export async function submitChatEvent(container, group) {

  let textarea = container.parentElement.querySelector("textarea");
  let imageInput  = container.parentElement.querySelector("#image-input");
  let fileInput = container.parentElement.querySelector("#file-input");

  let message = {
    "text_content": ""||textarea.value,
    "file": null,
    "images": []
  };

  // group.latestChannel.PageState.ChatForm.message = message;

  const {file, images} = getMediaFiles(container);
  
  // check if ready to sumbit
  const submit = message.text_content || images.length > 0 || file  ? true: false;
    
  if (submit) {
    let headers = {
      "X-CSRFToken": getCookies().csrftoken,
      "Content-Type":"application/json",
    };
    
    // const container = getDOMContainer("detail");
    container.parentElement.querySelector("#input-submit").innerHTML = getSpinner().innerHTML;
    
    const PageState = group.latestChannel.PageState;
    
    // if the latestChannel socket is open send chat 
    if (PageState.socket) {
      let sentFile;
      let sentImages  = [];

      // send media files first
      if (file) {
        headers = {"X-CSRFToken": getCookies().csrftoken};
        let body = new FormData();
        body.set("file", file);
        let fileData = await AjaxPOSTRequest(APIROOT.files, headers, body);        
        sentFile = {"file" : fileData.file};
      } else {
        console.log(images);
        for (let img of images) {
          headers = {"X-CSRFToken" : getCookies().csrftoken};
          
          let body = new FormData();
          body.set("image", img);

          let imageData = await AjaxPOSTRequest(APIROOT.images, headers, body);
          sentImages.push({"image" : imageData.image});
        }
      }
      
      message.file = sentFile;
      message.images = sentImages;
      PageState.chatForm.message = message;

      // send chat event
      PageState.socket.send(JSON.stringify(PageState.chatForm));
    }

    PageState.socket.onerror = (event) => {
      console.log(event);
    };

    // receive chat
    group.latestChannel.PageState.socket.addEventListener("message", async (event) => {      
      const data = JSON.parse(event.data);
      const container = getDOMContainer("detail");

      if (data.chat) {
        const chatData = data.chat;
    
        let newChat = await createChat(chatData, group.latestChannel);
        newChat.message.images = images;
        newChat.message.file = file;
        newChat.mediaIsLocal = true;
        PageState.queryset.add(newChat);
        newChat.DOM = GroupChatRender.createChatDOM(newChat);
        
        // check if chat has a DOM object 
        let peekDOM = container.querySelector(`#chat-${newChat.id}`);

        if (peekDOM) {
          container.replaceChild(newChat.DOM, peekDOM);
        } else {
            container.appendChild(newChat.DOM);
        }

        container.scrollTop = container.scrollHeight;
        
        // clean up
        textarea.form.reset();
        
        textarea.value = "";
    
        fileInput.labels[0].querySelector(".active-dot").classList.add("d-none");
        imageInput.labels[0].querySelector(".active-dot").classList.add("d-none");
        
        console.log(container);

        container.parentElement.querySelector("#input-submit").innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill icon" viewBox="0 0 16 16">
            <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
          </svg>
        `;
    
        
        if (PageState.chatForm.replying) {
          let btn = container.parentElement.querySelector("#close-btn");
          if (btn) btn.remove();
        }
        
        for (let key in PageState.chatForm){
          console.log(key);
          PageState.chatForm[key] = null;
        }
        
      } else if (data.errors){
        console.log(data.errors);
      }

    }, {"once":true});

  
  }

}
