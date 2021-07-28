import {getLoggedUser, getAPIROOT, setGlobalViewMode} from "./view.js";
//  Global Variables

window.onload = async () => {
	try {
    window.StopChatDetail = false;
    window.ActiveEvenetLoops = {};
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

    window.Active = window.Active || "chatlistview";
	} catch (error) {
    console.log(error);  
  }

};